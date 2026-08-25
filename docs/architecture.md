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

---

## 5. Proximity & Distance Engine Strategy (`DistanceProvider` Protocol)

### Straight-Line (Haversine) vs. Turn-by-Turn Road Routing
The assignment engine uses the **Great-Circle Haversine formula** to rank agent proximity. In real-world urban logistics, straight-line distance differs from actual driving time due to:
1. **Topological barriers**: Rivers, railway crossings, and divided expressways where two points 500 meters apart require a 5 km detour.
2. **Urban circuity factor**: One-way streets, dense grid systems, and alleys typically introduce a $1.2\times$ to $1.5\times$ distance factor.
3. **Dynamic traffic**: An agent 3 km away on an open ring road may arrive faster than an agent 1 km away in congested alleys.

### Defensible Engineering Trade-Off:
Haversine was chosen deliberately for this reference implementation:
- **Zero Latency**: Executes in $< 0.1 \text{ ms}$ pure CPU math (evaluates 100 agents in $< 1 \text{ ms}$).
- **Zero External Dependencies**: 100% offline, zero API keys required, zero vendor lock-in.
- **100% Deterministic Testing**: CI/CD pipelines never fail due to external mapping API rate limits or network hiccups.

### Pluggable Architecture (`DistanceProvider`):
Proximity calculation is isolated behind a protocol interface in [`backend/app/services/distance.py`](../backend/app/services/distance.py):

```python
class DistanceProvider(Protocol):
    """Protocol for pluggable distance and proximity calculation providers."""

    def calculate(
        self,
        lat1: Optional[float],
        lon1: Optional[float],
        lat2: Optional[float],
        lon2: Optional[float],
    ) -> Optional[float]:
        ...
```

For enterprise production deployments requiring turn-by-turn routing (e.g., OSRM or Google Distance Matrix API), a new provider class implementing `DistanceProvider` can be plugged in without modifying a single line of order lifecycle, dispatch, or database transaction logic.

---

## 6. Containerization & Service Architecture (`docker-compose.yml`)

The multi-container architecture is orchestrated via [`docker-compose.yml`](../docker-compose.yml):

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Compose Network                   │
│                                                             │
│   ┌─────────────────────┐         ┌─────────────────────┐   │
│   │ lastmile-db         │         │ lastmile-backend    │   │
│   │ (PostgreSQL 16)     │◄────────┤ (FastAPI Python)    │   │
│   │ Port: 5432          │         │ Port: 8000          │   │
│   │ Volume: db-data     │         │ Health: pg_isready  │   │
│   └─────────────────────┘         └─────────────────────┘   │
│                                              ▲              │
│                                              │              │
│                                   ┌──────────┴──────────┐   │
│                                   │ lastmile-frontend   │   │
│                                   │ (Nginx / React SPA) │   │
│                                   │ Port: 5173          │   │
│                                   └─────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

1. **`db` Service (lines 5–24)**: Runs `postgres:16-alpine` with persistent volume mount `postgres_data`, credentials, and health check (`pg_isready`).
2. **`backend` Service (lines 26–52)**: Builds `./backend/Dockerfile`, blocks until `db` passes health check, seeds schema, and serves FastAPI.
3. **`frontend` Service (lines 54–69)**: Builds `./frontend/Dockerfile`, serves optimized static assets via Nginx, and proxies `/api` to the backend.

