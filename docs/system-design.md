# System Design Write-Up: Last-Mile Delivery Tracker

**Word Count**: ~750 words  
**Core Focus**: Rate Engine · Zone Detection · Auto-Assignment · Failed Delivery Handling

---

## 1. Rate Calculation Engine

The Rate Calculation Engine is designed around financial precision, explainability, and database-driven configurability. Hardcoded rate constants are strictly prohibited.

The calculation workflow executes as follows:
1. **Volumetric Weight**: The cubic volume is converted using the standard air-cargo / courier divisor:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$
2. **Chargeable Weight**: Billing is determined by the greater of actual scale weight and volumetric weight:
   $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
3. **Rate Card Resolution**: The system queries the active `rate_cards` table based on `(order_type: B2B/B2C, zone_type: INTRA/INTER)`.
4. **Base Delivery Charge**:
   $$\text{Base Charge} = \text{RateCard.base\_fee} + (\text{RateCard.rate\_per\_kg} \times \text{Chargeable Weight})$$
5. **Cash on Delivery (COD) Surcharge**: For COD orders, the active `cod_surcharges` matrix applies:
   $$\text{COD Surcharge} = \text{flat\_amount} + \left(\frac{\text{percent\_of\_base}}{100} \times \text{Base Charge}\right)$$
6. **Pricing Snapshot Preservation**: When an order is confirmed, the calculated charges and rate card version are permanently frozen on the `orders` row. Modifying future rate cards never mutates historical invoices.

---

## 2. Zone Detection Approach

Zone resolution maps customer postal pincodes deterministically to administrative logistics zones without requiring external third-party geocoding API keys.

- **Data Model**: The schema maintains a normalized `zones` table and an indexed `areas` table where each 6-digit postal pincode is mapped to a parent zone (`areas.pincode` with unique index).
- **Resolution Strategy**:
  1. Given `pickup_pincode` and `drop_pincode`, the system performs single-indexed lookups to resolve both to their respective `Zone` entities.
  2. If `pickup_zone_id == drop_zone_id`, the shipment is classified as **`INTRA`** (intra-zone).
  3. If `pickup_zone_id != drop_zone_id`, the shipment is classified as **`INTER`** (inter-zone).
- **Error Handling**: Unmapped, inactive, or invalid pincodes immediately fail fast with machine-readable structured error codes (`INVALID_PINCODE`, `INACTIVE_AREA`).

---

## 3. Auto-Assignment Logic & Concurrency Safety

The dispatch engine assigns delivery orders to the optimal available agent using a three-tier ranking strategy coupled with concurrency-safe atomic reservation:

### Candidate Ranking Pipeline:
1. **Eligibility Filter**: Queries active agents where `availability_status == 'AVAILABLE'` and `current_load < max_capacity`.
2. **Tier 1 (Proximity Ranking)**: When GPS coordinates are present for pickup and agents, the system computes the Great-Circle distance using the **Haversine formula**:
   $$d = 2R \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta \lambda}{2}\right)}\right)$$
3. **Tier 2 (Zone Match Preference)**: Agents located in the order's pickup zone are prioritized over agents in other zones.
4. **Tier 3 (Load Balance Fallback)**: Among equally ranked agents, the agent with the lowest `current_load` is selected.

### Concurrency-Safe Atomic Claim:
To prevent race conditions where two simultaneous orders assign the same agent, the system executes an atomic conditional update:
```sql
UPDATE delivery_agents
SET availability_status = 'BUSY',
    current_load = current_load + 1
WHERE id = :agent_id
  AND availability_status = 'AVAILABLE'
  AND current_load < max_capacity;
```
If `rowcount == 0` (indicating another transaction claimed the agent in parallel), the algorithm does not fail; it automatically steps to the next candidate in the ranked list. An audit trail is saved in `assignment_decisions`.

---

## 4. Failed Delivery & Rescheduling Workflow

Real-world logistics requires graceful recovery from failed delivery attempts without losing audit history.

```
OUT_FOR_DELIVERY ──► Mark FAILED (+ reason) ──► Notify Customer (Email + SMS)
                                                          │
                                              Customer Reschedules (New Date)
                                                          │
                          ┌───────────────────────────────┘
                          │
                    Release Agent #1 ──► Auto-Assign Nearest Agent #2
                          │                       │
                          │              Create DeliveryAttempt #2
                          │                       │
                    Notify Customer         ASSIGNED → PICKED_UP → IN_TRANSIT
                    (Rescheduled + New       → OUT_FOR_DELIVERY → DELIVERED
                     Agent Assigned)
```

1. **Failure Recording**: When an agent marks a package `FAILED`, they must provide an explicit failure reason (e.g. *"Customer unavailable at premises"*). The active `DeliveryAttempt` is closed with status `FAILED` and a completion timestamp.
2. **Delivery Attempts Entity**: Each attempt is stored as a first-class row in `delivery_attempts` with start/completion timestamps, agent ID, and failure reason. Attempt #1 is never overwritten.
3. **Rescheduling & Immediate Reassignment** (single API call — `POST /api/orders/{id}/reschedule`):
   - The order transitions from `FAILED` → `RESCHEDULED`.
   - The prior agent's capacity is released (atomically decremented, availability restored to `AVAILABLE`).
   - The system immediately runs the auto-assignment pipeline: Haversine proximity ranking → zone match → load balance → atomic capacity claim.
   - A new `DeliveryAttempt` row (`attempt_number = 2`) is created for the selected agent.
   - The customer receives two notifications: rescheduled confirmation and new agent assignment.
   - If no agent is currently available, the order remains `RESCHEDULED` and can be manually assigned via `POST /api/orders/{id}/assign`.
4. **Immutable Audit History**: Every state transition generates an append-only row in `order_status_history`. The FK uses `ondelete='RESTRICT'` at database level, preventing order deletion while history rows exist. The application never exposes UPDATE or DELETE endpoints on history.

