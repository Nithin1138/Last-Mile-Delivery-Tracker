# System Architecture Document

## 1. High-Level Architecture Overview

The Last-Mile Delivery Tracker is engineered as a clean, modular monolith that enforces strict database integrity, deterministic business logic, and explainability.

```
                    ┌──────────────────────────────┐
                    │      React + TypeScript      │
                    │   (Vite, Tailwind, Lucide)   │
                    └──────────────┬───────────────┘
                                   │
                             REST / JSON (JWT)
                                   │
                    ┌──────────────▼───────────────┐
                    │        FastAPI Backend       │
                    └──────────────┬───────────────┘
                                   │
       ┌───────────────────────────┼───────────────────────────┐
       ▼                           ▼                           ▼
  Auth / RBAC               Order Service                 Admin Service
       │                           │                           │
       │             ┌─────────────┼─────────────┐             │
       │             ▼             ▼             ▼             │
       │          Pricing     Assignment     Lifecycle         │
       │          Engine        Engine     State Machine       │
       │             │             │             │             │
       │             │             ├── Haversine │             │
       │             │             ├── Capacity  │             │
       │             │             └── Atomic    ▼             │
       │             ▼                 Claim  Status History   │
       │         Rate Cards            Lock   (Append-Only)    │
       │             │                                         │
       │             ▼                                         │
       │      Pricing Snapshot                                 │
       │             │                                         │
       └─────────────┴─────────────┬───────────────────────────┘
                                   │
                                   ▼
                        PostgreSQL Database
          ┌─────────────┬──────────┼──────────┬─────────────┐
          ▼             ▼          ▼          ▼             ▼
        Orders       Agents      Zones     Attempts      History
                                              │
                                              ▼
                                       Notifications
                                         ┌────┴────┐
                                         ▼         ▼
                                      Console    Resend
```

---

## 2. Relational Database Schema & Constraints

The system relies on a normalized PostgreSQL schema with intentional constraints, indexing, and foreign keys:

1. **`users`**: Role-based access (CUSTOMER, AGENT, ADMIN). Passwords hashed with bcrypt.
2. **`delivery_agents`**: References `users.id` (1-to-1). Tracks `availability_status` (AVAILABLE, BUSY, OFFLINE), `max_capacity`, `current_load`, GPS coordinates, and assigned `current_zone_id`.
   - Constraints: `CHECK(current_load >= 0)`, `CHECK(current_load <= max_capacity)`, `CHECK(max_capacity > 0)`.
3. **`zones` & `areas`**: Maps unique pincodes deterministically to delivery zones.
   - Constraints: `UNIQUE(pincode)`, `FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE CASCADE`.
4. **`rate_cards`**: Versioned pricing rules per `(order_type, zone_type)`. Superseded rather than mutated in-place.
5. **`cod_surcharges`**: Configurable flat amount and percentage surcharge per order type.
6. **`orders`**: Stores the full order record with **frozen computed charges** (`base_charge`, `cod_charge`, `total_charge`, `chargeable_weight_kg`, `volumetric_weight_kg`).
   - Why: Guarantees that updating future rate cards can never alter past order prices.
7. **`order_status_history`**: **Append-only** audit trail logging every status change with timestamp, previous status, new status, actor, and reason note.
8. **`delivery_attempts`**: First-class entity recording each delivery attempt (attempt number, agent, timestamps, status, failure reason).
9. **`assignment_decisions`**: Stores assignment audit log with candidate count, Haversine distance, and selection reason.
10. **`notifications`**: Audit log of all dispatch and status update notifications.
11. **`idempotency_keys`**: Prevents duplicate order creation and redundant write actions.

---

## 3. Concurrency-Safe Agent Reservation

A common bug in logistics platforms is the "check-then-act" race condition where two simultaneous orders can both read an agent as AVAILABLE and assign both orders to the same agent.

### Atomic Claim Strategy:
We implement a conditional `UPDATE` with a rowcount assertion:

```sql
UPDATE delivery_agents
SET availability_status = 'BUSY',
    current_load = current_load + 1,
    updated_at = NOW()
WHERE id = :agent_id
  AND availability_status = 'AVAILABLE'
  AND current_load < max_capacity;
```

- If `rowcount == 1`: The current transaction won the race and successfully reserved the agent.
- If `rowcount == 0`: Another transaction claimed the agent first. The assignment engine immediately catches this, falls back to the next-ranked candidate in the list, and attempts atomic claim until a winner is found.

---

## 4. Order State Machine

```
CREATED ──► ASSIGNED ──► PICKED_UP ──► IN_TRANSIT ──► OUT_FOR_DELIVERY
   │           │                                              │
   │           │                                   ┌──────────┴──────────┐
   ▼           ▼                                   ▼                     ▼
 CANCELLED  CANCELLED                          DELIVERED               FAILED
                                                                         │
                                                                   RESCHEDULED
                                                                         │
                                                                     ASSIGNED
                                                                  (Loops back)
```

- Invalid transitions (e.g. `DELIVERED -> IN_TRANSIT` or `PICKED_UP -> CANCELLED`) are strictly rejected by the backend with structured error code `INVALID_STATUS_TRANSITION`.
- Administrative overrides are supported for operational contingencies, but are logged as explicit `[ADMIN_OVERRIDE]` events in the immutable audit history.
