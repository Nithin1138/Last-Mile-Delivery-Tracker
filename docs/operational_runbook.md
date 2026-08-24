# Operational Runbook & Production Reliability Dossier

This runbook outlines operational procedures, system observability, failure mode mitigations, and incident recovery workflows for the **Last-Mile Delivery Tracker (LastMile Flow)** platform.

---

## 1. System Architecture & Observability

```
[ Client / Browser (React 19) ]
           │
           │  HTTPS + Bearer Token + X-Request-ID
           ▼
[ Reverse Proxy / Cloudflare / Render ]
           │
           ▼
[ FastAPI Application Service (Python 3.12) ]
  ├── Middleware Layer
  │   ├── CORS Validation & Security Headers (CSP, Frame-Options, XSS, Referrer)
  │   ├── Distributed Request Tracing (X-Request-ID propagation & generation)
  │   └── High-Resolution Latency Measurement (X-Process-Time)
  │
  ├── Core Business Engines
  │   ├── Dynamic Pricing Engine (Volumetric weight, Zone matrix, COD calculation)
  │   ├── Nearest-Agent Auto-Assignment Engine (Haversine proximity, Zone matching, Concurrency safe)
  │   ├── Immutable Lifecycle State Machine (Valid transitions, Terminal locking)
  │   └── Atomic Rescheduling & Agent Reassignment Flow
  │
  └── Persistence & Event Subsystems
      ├── PostgreSQL 18 (ACID, Pessimistic Row-Locking, Database Triggers)
      └── Transactional Notification Hub (Resend API Gateway / Console Fallback)
```

### Distributed Tracing & Observability Headers
Every request passing through the API contains the following observability headers:
- `X-Request-ID`: Unique UUIDv4 correlating logs, database transactions, and client requests across distributed components.
- `X-Process-Time`: Total server execution latency measured via `time.perf_counter()`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`: Enforced security posture.

### Diagnostics Endpoint: `/health`
Returns live system health with database ping latency and notification provider status:
```json
{
  "status": "healthy",
  "environment": "production",
  "components": {
    "database": {
      "status": "connected",
      "latency_ms": 1.42
    },
    "notifications": {
      "active_provider": "resend",
      "from_email": "onboarding@resend.dev"
    }
  }
}
```

---

## 2. Mutability vs. Immutability Matrix

To guarantee audit compliance and non-repudiation, the database enforces strict mutability rules:

| Table / Entity | Mutability Classification | Permitted Operations | Enforcement Mechanism |
|---|---|---|---|
| `order_status_history` | **Strictly Immutable** | `INSERT` only. `UPDATE` and `DELETE` strictly forbidden. | PostgreSQL Database Trigger `trg_immutable_order_status_history` + ORM event listeners. |
| `assignment_decisions` | **Strictly Immutable** | `INSERT` only. `UPDATE` and `DELETE` strictly forbidden. | PostgreSQL Database Trigger `trg_immutable_assignment_decisions` + ORM listeners. |
| `notifications` | **Strictly Immutable** | `INSERT` only. `UPDATE` and `DELETE` strictly forbidden. | PostgreSQL Database Trigger `trg_immutable_notifications` + ORM listeners. |
| `delivery_attempts` | **Lifecycle Locked** | `INSERT` (PENDING), `UPDATE` (only while PENDING -> TERMINAL), `DELETE` forbidden. | PostgreSQL Database Trigger `trg_terminal_lock_delivery_attempts` + ORM listeners. |
| `orders` | **Controlled Mutable** | State updates via state machine; financial totals frozen at creation. | Rate card snapshotting at creation time (`base_charge`, `cod_charge`, `total_charge`). |
| `rate_cards` | **Versioned Append** | Inactive cards kept; new versions incremented with unique active index. | Partial unique PostgreSQL index `uq_one_active_rate_card_per_type_zone`. |

---

## 3. Incident Runbooks & Failure Mitigations

### Runbook 1: Third-Party Notification Outage / Rate Limit
- **Symptom**: Resend API returns HTTP 429 (Rate Limit Exceeded) or 503 (Gateway Outage).
- **Automated Behavior**: 
  - The notification subsystem catches provider exceptions in an isolated `try/except` block.
  - The notification record is saved with `status = FAILED` and the error reason logged to PostgreSQL.
  - **The calling business transaction (Order Creation, Reschedule, or Delivery Update) is NEVER aborted.**
- **Operator Action**:
  1. Check `/health` endpoint for notification provider status.
  2. If Resend quota is reached, check `RESEND_TEST_EMAIL` or rotate API key in `.env` / Render dashboard.
  3. No database rollback is necessary; order fulfillment proceeds unimpeded.

### Runbook 2: High Concurrency & Simultaneous Agent Claim Race
- **Symptom**: Multiple simultaneous orders competing for the same nearest available agent in a high-density zone.
- **Automated Behavior**:
  - `atomic_claim_agent()` executes atomic conditional SQL `UPDATE delivery_agents SET current_load = current_load + 1 WHERE id = :id AND current_load < max_capacity AND availability_status = 'AVAILABLE'`.
  - Exactly one thread succeeds with `rowcount == 1`. Competing threads receive `rowcount == 0` and seamlessly evaluate the next ranked candidate in the candidate pool.
  - Order assignment endpoints use pessimistic row locks (`SELECT ... FOR UPDATE`) preventing duplicate assignment of the same order.
- **Operator Action**:
  - Monitor agent utilization via Admin Dashboard `/api/admin/dashboard`.
  - Onboard additional courier agents in zones experiencing load saturation.

### Runbook 3: Delivery Failure & Rescheduling SLA Breach
- **Symptom**: Delivery marked `FAILED` (e.g. customer unavailable, incorrect address).
- **Automated Behavior**:
  - Order transitions into `FAILED` state; previous `DeliveryAttempt` is marked terminal `FAILED` and permanently locked against tampering.
  - Customer receives transactional email alert with direct link to reschedule.
  - When customer reschedules:
    1. Previous agent is freed (`current_load` decremented).
    2. Order transitions `FAILED` ➔ `RESCHEDULED` ➔ `ASSIGNED`.
    3. Nearest available agent is automatically assigned.
    4. `DeliveryAttempt #2` is instantiated in `IN_PROGRESS` status.
- **Operator Action**:
  - If no available agents exist at the time of reschedule, the order safely remains in `RESCHEDULED` state.
  - Admin can inspect unassigned rescheduled orders in the Orders tab and trigger "Auto-Assign" or "Manual Assign" once an agent checks in.

### Runbook 4: Database Connection Pool Degradation
- **Symptom**: Database query latency spikes above 200ms or `/health` returns `status: degraded`.
- **Automated Behavior**:
  - FastAPI returns structured 503 status code with explicit error code `DATABASE_UNREACHABLE`.
- **Operator Action**:
  1. Check PostgreSQL active connections:
     ```sql
     SELECT count(*), state FROM pg_stat_activity GROUP BY state;
     ```
  2. Verify connection pool sizing in `app/database.py` (`pool_size=10, max_overflow=20`).
  3. Ensure no orphaned long-running transactions are locking `orders` or `delivery_agents` rows.

---

## 4. Verification & Testing Commands

To run all automated test suites and operational sanity verifications:

```bash
# Run full backend pytest suite (73 tests)
cd backend && source venv/bin/activate && pytest tests/ -v

# Run pre-submission verification audit
python3 scripts/verify_submission.py
```
