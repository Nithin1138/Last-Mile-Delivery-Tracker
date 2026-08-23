# 🚚 Last-Mile Delivery Tracker

A production-minded logistics and dispatch management platform featuring a **database-driven rate engine**, **concurrency-safe nearest-agent auto-assignment**, **immutable tracking history**, and a complete **failed-delivery & rescheduling workflow**.

---

## ⚡ 5-Minute Evaluation Flow

The application comes pre-seeded with realistic operational data (demo accounts, rate cards, pincodes, and active delivery agents).

> **Evaluation Environments**:
> - **Hosted Production** (`VITE_DEMO_MODE=false`): Uses standard email/password authentication with JWT-based sessions and server-side RBAC. Sign in directly using the pre-seeded credentials below.
> - **Local Development** (`VITE_DEMO_MODE=true` in `frontend/.env.example`): Features an optional 1-click role switcher banner in the header for rapid persona switching.

### Complete End-to-End Walkthrough

```text
1. Customer Login (Email: rohit.verma@gmail.com / Pass: customer123)
   ├── Create a new order with dimensions: 50 × 40 × 30 cm, Actual Weight: 8 kg, Payment: COD
   ├── Observe Dynamic Price Preview:
   │   ├── Volumetric Weight = (50×40×30)/5000 = 12.00 kg (Volumetric wins over 8 kg)
   │   ├── Chargeable Weight = 12.00 kg
   │   ├── Route: Delhi (North Zone) → Mumbai (South Zone) = INTER Zone
   │   ├── Base Charge = ₹50 + (₹20 × 12) = ₹290.00
   │   ├── COD Surcharge = ₹25 + (2.5% × ₹290) = ₹32.25
   │   └── Total Payable = ₹322.25
   └── Click "Confirm & Place Order"

2. Admin Login (Email: admin@lastmile.dev / Pass: admin123)
   ├── Navigate to "Orders" tab → Locate the newly created order (Status: CREATED)
   ├── Click "Auto-Assign"
   └── View assignment audit decision: Inspect evaluated candidates, Haversine proximity distance, and assigned agent

3. Agent Login (Email: vikram.singh@delivery.dev / Pass: agent123)
   ├── Navigate to "Assigned Deliveries"
   ├── Step order through state machine: Picked Up ➔ In Transit ➔ Out for Delivery
   └── Click "Mark Delivery Failed" → Select reason: "Customer unreachable after 3 attempts"

4. Customer Login (Email: rohit.verma@gmail.com / Pass: customer123)
   ├── Open the order details → Notice Delivery Attempt #1 recorded as FAILED
   ├── Click "Reschedule Delivery" → Select new delivery date
   └── Atomic Execution: System transitions order FAILED ➔ RESCHEDULED ➔ ASSIGNED, releases Agent #1, auto-dispatches the nearest available Agent #2, creates Delivery Attempt #2, and sends transactional email/SMS notifications!

5. Agent Login (Assigned Agent)
   ├── Mark "Delivered" with proof/notes
   └── Open Order Details: Verify complete immutable history timeline and both Delivery Attempts (#1 FAILED, #2 DELIVERED)
```

---

## 🔑 Demo Accounts (Pre-Seeded)

| Role | Email | Password | Description |
|---|---|---|---|
| **Admin** | `admin@lastmile.dev` | `admin123` | Full administrative control, fleet dispatch, rate cards, zones |
| **Customer (B2C)** | `rohit.verma@gmail.com` | `customer123` | Retail customer placing orders and tracking deliveries |
| **Customer (B2B)** | `logistics@acmecorp.in` | `customer123` | Merchant shipper placing bulk commercial orders |
| **Agent 1** | `vikram.singh@delivery.dev` | `agent123` | Delhi NCR Agent (Connaught Place, Available) |
| **Agent 2** | `rahul.sharma@delivery.dev` | `agent123` | Delhi NCR Agent (Saket, Busy with load) |
| **Agent 3** | `amit.kumar@delivery.dev` | `agent123` | Mumbai Metro Agent (Fort, Available) |
| **Agent 4** | `priya.patel@delivery.dev` | `agent123` | Mumbai Metro Agent (BKC, Offline) |

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, PostgreSQL 18
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons
- **Security**: JWT authentication (HS256), bcrypt password hashing, server-side RBAC
- **Testing**: Pytest (51 unit, security, integration, notification and concurrency tests)

---

## 🔔 Notification Engine (Email & SMS)

The platform includes production-ready transactional notification provider abstractions with graceful failure resilience:

- **Email Provider** (`NotificationProvider` ➔ `ResendNotificationProvider`): Sends transactional HTML emails on order lifecycle events (Created, Assigned, Status Updates, Delivery Failed, Rescheduled). Configured via `RESEND_API_KEY` and `NOTIFICATION_FROM_EMAIL`. (Supports `RESEND_TEST_EMAIL` for developer testing).
- **SMS Provider** (`SmsProvider` ➔ `TwilioSmsProvider`): Sends instant SMS text alerts to customer mobile numbers via Twilio REST API. Configured via `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`. (Supports `TWILIO_TEST_PHONE` for testing trial accounts).
- **Zero-Config Local Evaluation**: Automatically falls back to `ConsoleNotificationProvider` and `ConsoleSmsProvider` when API keys are not present in `.env`, logging structured payloads without failing transactions.
- **Fault-Tolerant & Audit Logged**: External provider downtimes never block core database transactions. Every notification attempt is tracked in the `notifications` audit table with delivery status (`SENT` / `FAILED`) and error details.

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
When an order is created, all computed charge components are frozen on the `orders` record. Editing a rate card in the Admin portal deactivates the current version and inserts version $N+1$, ensuring historical orders never change price. A database-level partial unique index `uq_active_rate_card` strictly guarantees only one active card exists per `(order_type, zone_type)`.

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
| `PUT` | `/api/auth/me` | Authenticated | Update user profile / mobile number for SMS |
| `POST` | `/api/orders/quote` | Public / Auth | Live rate preview calculation (L×B×H, weight, route) |
| `POST` | `/api/orders` | Customer / Admin | Idempotent order creation with server-side price freeze |
| `GET` | `/api/orders` | Customer / Admin | List orders (Admin views all; Customer views own) |
| `GET` | `/api/orders/{id}` | Owner / Agent / Admin | Get order details and pricing breakdown |
| `PATCH`| `/api/orders/{id}/status` | Agent / Admin | Transition order status (state-machine validated) |
| `POST` | `/api/orders/{id}/assign` | Admin | Assign agent (Auto-dispatch nearest or Manual) |
| `POST` | `/api/orders/{id}/reschedule` | Owner / Admin | Reschedule failed order & atomically reassign agent #2 |
| `GET` | `/api/orders/{id}/timeline` | Owner / Agent / Admin | Immutable audit log of all status transitions |
| `GET` | `/api/orders/{id}/attempts` | Owner / Agent / Admin | List all delivery attempts (#1 Failed, #2 Delivered) |
| `GET` | `/api/orders/{id}/assignment-decision` | Owner / Agent / Admin | Explainable candidate ranking & distance decision |
| `GET` | `/api/agents/me` | Delivery Agent | Fetch agent status, assigned zone, and current load |
| `PUT` | `/api/agents/me` | Delivery Agent | Toggle availability status (`AVAILABLE` / `OFF_DUTY`) |
| `GET` | `/api/admin/dashboard` | Admin Only | Real-time fleet metrics, active orders, COD stats |
| `GET` | `/api/admin/agents` | Admin Only | List all fleet delivery agents with status & load |
| `POST` | `/api/admin/agents` | Admin Only | Register new delivery agent with capacity & zone |
| `GET` | `/api/admin/zones` | Admin Only | List logistics zones |
| `POST` | `/api/admin/zones` | Admin Only | Create new logistics zone |
| `GET` | `/api/admin/rate-cards` | Admin Only | List active and historical rate cards |
| `POST` | `/api/admin/rate-cards` | Admin Only | Version and activate new rate card |
| `GET` | `/api/admin/cod-surcharges` | Admin Only | List COD surcharge configurations |
| `POST` | `/api/admin/cod-surcharges` | Admin Only | Update COD surcharge parameters |

---

## 🗄️ Database Schema & Invariants

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
         ▼ (1:N) RESTRICT              ▼ (1:N)
   ┌───────────────────┐        ┌───────────────────┐
   │ OrderStatusHistory│        │ DeliveryAttempts  │
   └───────────────────┘        └───────────────────┘
```

- **Partial Unique Index**: `uq_active_rate_card` enforces at database level that only 1 active rate card exists per `(order_type, zone_type)`.
- **Append-Only History Protection**: `OrderStatusHistory` and `DeliveryAttempts` enforce `ondelete="RESTRICT"` to prevent cascade deletion.
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

## 🧪 Running Automated Tests

Run the complete backend test suite:

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

### Complete Test Suite Coverage (51 Tests):
- `test_failed_delivery_flow.py` (2 tests): End-to-end failed delivery flow (Created ➔ Assigned ➔ Out for Delivery ➔ Failed ➔ Rescheduled ➔ Auto-Assigned Attempt #2 ➔ Delivered), rejection of rescheduling non-failed orders.
- `test_security_rbac.py` (8 tests): Role injection prevention during registration, status update authorization, multi-tenant order isolation, delivery attempt protection, capacity boundaries, and strict admin-only GET protection for zones, areas, rate-cards, and COD surcharges.
- `test_concurrency.py` (6 tests): True multithreaded PostgreSQL concurrent claim race conditions, atomic claim rowcount semantics, inactive agent rejection, concurrent duplicate order assignment prevention via SELECT FOR UPDATE, capacity limits, release mechanics.
- `test_pricing_engine.py` (8 tests): Volumetric weight, chargeable weight, B2B/B2C, INTRA/INTER rates, COD formulas, canonical worked example.
- `test_order_lifecycle.py` (5 tests): State machine transitions, illegal transitions, cancellation rules, append-only history.
- `test_assignment_engine.py` (5 tests): Haversine distance ranking, zero-distance preservation, zone matching, availability filtering, fallback handling.
- `test_notifications.py` (5 tests): Resend email provider, Twilio SMS provider, Console provider fallbacks, graceful error and network failure handling.
- `test_api.py` (4 tests): RBAC server-side enforcement, idempotency key duplicate prevention, actor-scoped idempotency isolation, rate card versioning price freeze.
- `test_zone_service.py` (4 tests): Pincode resolution, unknown pincode rejection, inactive area rejection.
- `test_distance.py` (4 tests): Haversine accuracy (Delhi–Mumbai sanity check).

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

