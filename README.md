# 🚚 Last-Mile Delivery Tracker

A production-minded logistics and dispatch management platform featuring a **database-driven rate engine**, **concurrency-safe nearest-agent auto-assignment**, **immutable tracking history**, and a complete **failed-delivery & rescheduling workflow**.

---

## 🌐 Live Hosted Application (REQ-22)

- **Frontend Application**: [https://lastmileflow.vercel.app/](https://lastmileflow.vercel.app/)
- **Backend API**: [https://lastmile-backend-f1ma.onrender.com/](https://lastmile-backend-f1ma.onrender.com/)
- **Interactive Swagger Docs**: [https://lastmile-backend-f1ma.onrender.com/docs](https://lastmile-backend-f1ma.onrender.com/docs)
- **GitHub Repository**: [https://github.com/Nithin1138/Last-Mile-Delivery-Tracker](https://github.com/Nithin1138/Last-Mile-Delivery-Tracker)

---

## ⚡ 5-Minute Evaluation Flow

The application comes pre-seeded with realistic operational data (demo accounts, rate cards, pincodes, and active delivery agents).

> **Evaluation Environments**:
> - **Hosted Production** (`VITE_DEMO_MODE=false`): Uses standard email/password authentication with JWT-based sessions and server-side RBAC. Sign in directly using the pre-seeded credentials below.
> - **Local Development** (`VITE_DEMO_MODE=true` in `frontend/.env.example`): Features an optional 1-click role switcher banner in the header for rapid persona switching.

### Complete End-to-End Walkthrough

```text
1. Customer Login (Email: alekhya.reddy@gmail.com / Pass: customer123)
   ├── Create a new order with dimensions: 50 × 40 × 30 cm, Actual Weight: 8 kg, Payment: COD
   ├── Observe Dynamic Price Preview:
   │   ├── Volumetric Weight = (50×40×30)/5000 = 12.00 kg (Volumetric wins over 8 kg)
   │   ├── Chargeable Weight = 12.00 kg
   │   ├── Route: Hyderabad (North Zone) → Vijayawada (South Zone) = INTER Zone
   │   ├── Base Charge = ₹50 + (₹20 × 12) = ₹290.00
   │   ├── COD Surcharge = ₹25 + (2.5% × ₹290) = ₹32.25
   │   └── Total Payable = ₹322.25
   ├── Click "Confirm & Place Order"
   └── System immediately auto-dispatches nearest available agent (Babu Naidu)
       ↳ Order returns status: ASSIGNED in the same response — no admin action required!

2. Admin Login (Email: admin@lastmile.dev / Pass: admin123)
   ├── Navigate to "Orders" tab → Order already shows ASSIGNED to Babu Naidu
   ├── Inspect assignment audit: Haversine proximity ranking, evaluated candidates, dispatch decision
   └── "Auto-Assign" / "Manual Assign" button available as fallback or to override/reassign

3. Agent Login (Email: babu.naidu@delivery.dev / Pass: agent123)
   ├── Navigate to "Assigned Deliveries"
   ├── Step order through state machine: Picked Up ➔ In Transit ➔ Out for Delivery
   └── Click "Mark Delivery Failed" → Select reason: "Customer unreachable after 3 attempts"

4. Customer Login (Email: alekhya.reddy@gmail.com / Pass: customer123)
   ├── Open the order details → Notice Delivery Attempt #1 recorded as FAILED
   ├── Click "Reschedule Delivery" → Select new delivery date
   └── Atomic Execution: System transitions order FAILED ➔ RESCHEDULED ➔ ASSIGNED, releases Agent #1, auto-dispatches the nearest available Agent #2 (Srinivas Rao), creates Delivery Attempt #2, and triggers customer notifications!

5. Agent Login (Assigned Agent)
   ├── Mark "Delivered" with proof/notes
   └── Open Order Details: Verify complete immutable history timeline and both Delivery Attempts (#1 FAILED, #2 DELIVERED)
```

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Persona Name | Email | Password | Description |
|---|---|---|---|---|
| **Admin** | Veera Nithin | `admin@lastmile.dev` | `admin123` | Full administrative control, fleet dispatch, rate cards, zones |
| **Customer (B2C)** | Alekhya Reddy | `alekhya.reddy@gmail.com` | `customer123` | Retail customer placing orders and tracking deliveries |
| **Customer (B2B)** | Pujitha Rao | `pujitha.logistics@andhraexports.in` | `customer123` | Enterprise shipper placing bulk commercial orders |
| **Agent 1** | Babu Naidu | `babu.naidu@delivery.dev` | `agent123` | Hyderabad / Cyberabad Agent (Madhapur, Available) |
| **Agent 2** | Srinivas Rao | `srinivas.rao@delivery.dev` | `agent123` | Hyderabad Hub Agent (Banjara Hills, Busy with load) |
| **Agent 3** | Kalyan Varma | `kalyan.varma@delivery.dev` | `agent123` | Vijayawada Metro Agent (Benz Circle, Available) |
| **Agent 4** | Ananya Chowdary | `ananya.chowdary@delivery.dev` | `agent123` | Visakhapatnam Hub Agent (MVP Colony, Offline) |

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, PostgreSQL 18
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Security**: JWT authentication (HS256), bcrypt password hashing, server-side RBAC
- **Testing**: Pytest (73 unit, security, integration, e2e smoke, notification, database immutability triggers and multithreaded concurrency tests)

---

## 🔔 Transactional Notification Engine

The platform implements a clean provider abstraction for customer lifecycle notifications:

- **Modular Provider Interface** (`NotificationProvider`):
  - **Console Provider** (`ConsoleNotificationProvider`): Default zero-dependency provider for local development and offline evaluation. Dispatches structured logs and persists audit records directly into PostgreSQL.
  - **Production Email Provider** (`ResendNotificationProvider`): Sends branded, responsive HTML emails via the Resend API when `RESEND_API_KEY` is configured.
- **Fault-Tolerant Non-Blocking Architecture**: External API latency, network timeouts, or provider downtime never abort core database transactions. Every notification attempt is tracked immutably in the `notifications` audit table with delivery status (`SENT` / `FAILED`).

---

## 📐 Rate Calculation Engine Explanation

Pricing is 100% database-driven and adheres to courier industry standards:

1. **Volumetric Weight**:
   $$\text{Volumetric Weight (kg)} = \frac{\text{Length (cm)} \times \text{Breadth (cm)} \times \text{Height (cm)}}{5000}$$
2. **Chargeable Weight**:
   $$\text{Chargeable Weight} = \max(\text{Actual Weight}, \text{Volumetric Weight})$$
3. **Zone Relation**:
   - `INTRA`: Pickup Zone == Drop Zone
   - `INTER`: Pickup Zone != Drop Zone
4. **Base Delivery Charge**:
   $$\text{Base Charge} = \text{RateCard.base\_fee} + (\text{RateCard.rate\_per\_kg} \times \text{Chargeable Weight})$$
5. **COD Surcharge** (if payment method is Cash on Delivery):
   $$\text{COD Charge} = \text{CODSurcharge.flat\_amount} + \left(\frac{\text{percent\_of\_base}}{100} \times \text{Base Charge}\right)$$
6. **Total Charge**:
   $$\text{Total} = \text{Base Charge} + \text{COD Charge}$$

### Immutable Historical Pricing Snapshots:
When an order is created, all computed charge components are frozen on the `orders` record. Editing a rate card in the Admin portal deactivates the current version and inserts version $N+1$, ensuring historical orders never change price. A database-level partial unique index `uq_rate_cards_one_active_per_type` strictly guarantees only one active card exists per `(order_type, zone_type)`.

---

## 🔒 Concurrency-Safe Auto-Assignment Strategy

To prevent race conditions where simultaneous orders over-allocate agent capacity, the system executes an **atomic conditional update** with rowcount verification:

```sql
UPDATE delivery_agents
SET current_load = current_load + 1,
    availability_status = CASE
        WHEN current_load + 1 >= max_capacity THEN CAST('BUSY' AS agent_status_enum)
        ELSE CAST('AVAILABLE' AS agent_status_enum)
    END,
    updated_at = NOW()
WHERE id = :agent_id
  AND availability_status = CAST('AVAILABLE' AS agent_status_enum)
  AND current_load < max_capacity;
```

- If `rowcount == 1`: Reservation succeeded.
- If `rowcount == 0`: Another concurrent transaction claimed the agent capacity first. The assignment algorithm automatically advances to the next candidate in the ranked list.

### Three-Tier Ranking Policy:
1. **Haversine Great-Circle Proximity**: Nearest agent to the pickup coordinates (GPS distance).
2. **Zone Match Preference**: Same-zone agents preferred as tie-breaker.
3. **Load Balancing**: Least-loaded eligible agents selected.

---

## 📋 Complete REST API Reference

| Method | Endpoint | Access / Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register customer account (strictly forces CUSTOMER role) |
| `POST` | `/api/auth/login` | Public | Authenticate user & return JWT token |
| `GET` | `/api/auth/me` | Authenticated | Fetch current user profile |
| `PUT` | `/api/auth/me` | Authenticated | Update user profile and notification preferences |
| `POST` | `/api/orders/quote` | Authenticated (Customer / Admin) | Live rate preview calculation (L×B×H, weight, pincodes) |
| `POST` | `/api/orders` | Customer / Admin | Idempotent order creation with server-side price freeze |
| `GET` | `/api/orders` | Customer / Admin | List orders (Admin views all; Customer views own) |
| `GET` | `/api/orders/{id}` | Owner / Agent / Admin | Get order details and itemized pricing breakdown |
| `POST` / `PATCH` | `/api/orders/{id}/status` | Agent / Admin | Transition order status (state-machine validated) |
| `POST` | `/api/orders/{id}/assign` | Admin | Assign agent (Auto-dispatch nearest or Manual override) |
| `POST` | `/api/orders/{id}/reschedule` | Owner / Admin | Reschedule failed order & atomically reassign agent #2 |
| `GET` | `/api/orders/{id}/timeline` | Owner / Agent / Admin | Immutable audit log of all status transitions |
| `GET` | `/api/orders/{id}/attempts` | Owner / Agent / Admin | List all delivery attempts (#1 Failed, #2 In Progress/Delivered) |
| `GET` | `/api/orders/{id}/assignments` | Owner / Agent / Admin | Explainable candidate ranking, distances & dispatch audit log |
| `GET` | `/api/admin/dashboard` | Admin Only | Real-time fleet metrics, active orders, COD stats |
| `GET` | `/api/admin/agents` | Admin Only | List all fleet delivery agents with status & load |
| `POST` | `/api/admin/agents` | Admin Only | Register new delivery agent with capacity & zone |
| `PATCH`| `/api/admin/agents/{agent_id}` | Admin Only | Update delivery agent capacity or active status |
| `GET` | `/api/admin/zones` | Admin Only | List logistics zones |
| `POST` | `/api/admin/zones` | Admin Only | Create new logistics zone |
| `GET` | `/api/admin/areas` | Admin Only | List postal pincode areas |
| `POST` | `/api/admin/areas` | Admin Only | Add pincode area mapping to logistics zone |
| `GET` | `/api/admin/rate-cards` | Admin Only | List active and historical rate cards |
| `POST` | `/api/admin/rate-cards` | Admin Only | Version and activate new rate card |
| `PUT`  | `/api/admin/rate-cards/{card_id}` | Admin Only | Update rate card parameters with version preservation |
| `GET` | `/api/admin/cod-surcharges` | Admin Only | List COD surcharge configurations |
| `POST` | `/api/admin/cod-surcharges` | Admin Only | Update COD surcharge parameters |

---

## 🗄️ Database Schema & Audit Immutability Invariants

```
               ┌───────────────┐
               │     Users     │
               └───────┬───────┘
                       │ (1:N)
         ┌─────────────┼─────────────┐
         │             │             │
         ▼             ▼             ▼
   ┌───────────┐ ┌───────────┐ ┌───────────────┐
   │  Orders   │ │   Zones   │ │DeliveryAgents │
   └─────┬─────┘ └─────┬─────┘ └───────┬───────┘
         │             │ (1:N)         │
         │             ▼               │
         │       ┌───────────┐         │
         │       │   Areas   │         │
         │       └───────────┘         │
         ├─────────────────────────────┤
         │                             │
         ▼ (1:N) RESTRICT              ▼ (1:N) RESTRICT
   ┌───────────────────┐        ┌───────────────────┐
   │ OrderStatusHistory│        │ DeliveryAttempts  │
   └───────────────────┘        └───────────────────┘
```

- **Partial Unique Index**: `uq_rate_cards_one_active_per_type` enforces at database level that only 1 active rate card exists per `(order_type, zone_type)`.
- **Append-Only History Protection**: `OrderStatusHistory`, `AssignmentDecision`, and `Notification` are strictly append-only audit tables. Any SQL `UPDATE` or `DELETE` is blocked via PostgreSQL triggers (`trg_immutable_order_status_history`, `trg_immutable_assignment_decisions`, `trg_immutable_notifications`) and SQLAlchemy ORM event listeners.
- **DeliveryAttempt Lifecycle & Terminal Immutability**:
  - `DeliveryAttempt` identity fields (`id`, `order_id`, `attempt_number`) are immutable.
  - Active attempts transition through legitimate state machine steps (`PENDING -> IN_PROGRESS -> FAILED / DELIVERED`).
  - Terminal attempts (`FAILED`, `DELIVERED`) are strictly immutable.
  - Deletions are forbidden across all states.
- **Foreign Key RESTRICT**: `ondelete="RESTRICT"` prevents cascading deletions of parent order records.
- **Actor-Scoped Idempotency**: `IdempotencyKey` stores `(user_id, key)` with a composite uniqueness constraint.

---

## 🚀 Local Setup & Installation

### Prerequisites
- Python 3.12+
- Node.js 20+ & npm
- PostgreSQL running locally on port 5432

### 1. Backend Setup
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create environment configuration
cp .env.example .env

# Seed clean database with demo accounts, zones, rate cards, and orders
python seed.py

# Start backend server (starts on http://127.0.0.1:8000)
uvicorn app.main:app --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install

# Start Vite development server (starts on http://localhost:5173)
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 🧪 Comprehensive Automated Test Suite (73 Tests)

Run the complete backend test suite:

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Complete Test Suite Coverage (73 Tests):
- `test_security_rbac.py` (19 tests): Role injection prevention during registration, status update authorization, multi-tenant order isolation, delivery attempt protection, capacity boundaries, strict admin-only GET protection for zones, areas, rate-cards, and COD surcharges, admin order creation validation for nonexistent customers, inactive accounts, and agent IDs, admin agent updates persisting coordinates and all fields, ORM append-only history and DeliveryAttempt immutability listeners, PENDING to terminal transition and subsequent lock, complete lifecycle state machine and terminal lock validation, and PostgreSQL engine-level triggers blocking direct SQL mutations on audit tables and terminal delivery attempts.
- `test_pricing_engine.py` (8 tests): Volumetric weight calculation, chargeable weight determination, B2B vs. B2C rate cards, INTRA vs. INTER zone pricing, COD surcharge formulas, and the canonical worked evaluation example.
- `test_concurrency.py` (7 tests): True multithreaded PostgreSQL concurrent claim race conditions across isolated threads and sessions, atomic claim rowcount semantics, inactive agent rejection, concurrent duplicate order assignment prevention via `SELECT FOR UPDATE`, initial active rate card concurrent creation race conflict handling through FastAPI HTTP endpoint proving exact `[200, 409]` conflict behavior, capacity limits, and release mechanics.
- `test_api.py` (7 tests): RBAC server-side enforcement, idempotency key duplicate prevention, actor-scoped idempotency isolation, rate card versioning price freeze, structured 400 error responses on malformed UUID inputs, order notification list endpoints, and concurrent rate card versioning safety.
- `test_notifications.py` (6 tests): Resend email provider, Console provider fallbacks, factory configuration, lifecycle event notification dispatch, password reset HTML templates, and structured database audit logging.
- `test_order_lifecycle.py` (5 tests): State machine transitions matrix, illegal transitions, cancellation rules, failure transitions from `ASSIGNED` / `PICKED_UP` / `IN_TRANSIT`, and append-only status history auditing.
- `test_assignment_engine.py` (6 tests): Haversine distance ranking, zero-distance preservation, zone matching, availability filtering, fallback handling, and **API-level proof that auto-dispatch fires immediately on order creation** (`test_auto_assign_fires_on_order_creation`).
- `test_failed_delivery_flow.py` (5 tests): End-to-end failed delivery flow (Created ➔ Assigned ➔ Out for Delivery ➔ Failed ➔ Rescheduled ➔ Auto-Assigned Attempt #2 ➔ Delivered), rejection of rescheduling non-failed orders, no-agent reschedule state preservation, propagation of unexpected assignment errors, and concurrency race collision resilience where all candidate claims fail while preserving the outer reschedule transaction state.
- `test_zone_service.py` (4 tests): Pincode resolution, unknown pincode rejection, and inactive area rejection.
- `test_distance.py` (4 tests): Haversine mathematical accuracy (Delhi–Mumbai sanity check, coordinates distance formula).
- `test_e2e_smoke.py` (2 tests): Full multi-role end-to-end platform journey smoke test (registration, pricing, auto-dispatch, status transitions, failure, reschedule, second agent assignment, delivery completion, audit verification, request ID tracing headers) + live Resend external gateway integration smoke test.

---

## ☁️ Cloud Deployment Guide

### Option 1: 1-Click Render Blueprint (Recommended)
This repository includes a [`render.yaml`](render.yaml) specification:
1. Connect this GitHub repository to [Render](https://render.com).
2. Click **New ➔ Blueprint** and select `render.yaml`.
3. Render automatically provisions the PostgreSQL database, builds and seeds the FastAPI backend, and deploys the Vite frontend.

### Option 2: Docker Container Deployment
- **Backend Dockerfile**: [`backend/Dockerfile`](backend/Dockerfile)
  ```bash
  docker build -t lastmile-backend backend/
  docker run -p 8000:8000 \
    -e DATABASE_URL="postgresql://user:pass@host:5432/delivery_tracker" \
    -e JWT_SECRET_KEY="your-secure-jwt-secret-key-at-least-32-chars" \
    -e CORS_ORIGINS="http://localhost:5173" \
    lastmile-backend
  ```

---

## 📦 Building Clean Submission Archive

To generate a clean, zero-bloat ZIP archive (excluding `node_modules`, `venv`, `dist`, `__pycache__`, `.env`, and local artifacts):

```bash
python3 scripts/package_submission.py
```
This produces a lightweight distribution archive `LastMileDeliveryTracker-Submission.zip` ready for evaluation.

---

## 📚 Project Documentation Links

- [System Architecture](docs/architecture.md)
- [Requirements Mapping Matrix](docs/requirements-mapping.md)
- [Engineering Trade-Offs](docs/tradeoffs.md)
- [System Design Write-Up (Deliverable #4)](docs/system-design.md)
- [External Notification Verification](docs/external_notification_verification.md)
