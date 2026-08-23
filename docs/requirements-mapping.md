# Requirements Mapping Document

This document provides a 1-to-1 mapping from every graded requirement in the assignment specification to its exact implementation files, API endpoints, automated test cases, and frontend UI components.

---

## 1. Rate Calculation Engine

| Requirement | Implementation File | API Endpoint | Automated Tests | Frontend UI |
|---|---|---|---|---|
| **Volumetric Weight Calculation** `(L×B×H)/5000` | [`backend/app/services/pricing_engine.py`](../backend/app/services/pricing_engine.py) | `POST /api/orders/quote`, `POST /api/orders` | `tests/test_pricing_engine.py::test_volumetric_weight_formula` | `PricingBreakdownCard.tsx` |
| **Chargeable Weight** `max(actual, volumetric)` | [`backend/app/services/pricing_engine.py`](../backend/app/services/pricing_engine.py) | `POST /api/orders/quote`, `POST /api/orders` | `tests/test_pricing_engine.py::test_chargeable_weight_volumetric_wins` | `PricingBreakdownCard.tsx` |
| **Database-Driven Rate Cards** (B2B/B2C × INTRA/INTER) | [`backend/app/services/pricing_engine.py`](../backend/app/services/pricing_engine.py) | `GET /api/admin/rate-cards`, `POST /api/admin/rate-cards` | `tests/test_pricing_engine.py::test_exact_assignment_worked_example` | `AdminRateCardsPage.tsx` |
| **COD Surcharge** (Flat + Base % Matrix) | [`backend/app/services/pricing_engine.py`](../backend/app/services/pricing_engine.py) | `GET /api/admin/cod-surcharges`, `POST /api/admin/cod-surcharges` | `tests/test_pricing_engine.py::test_cod_charge_calculation` | `PricingBreakdownCard.tsx` |
| **Frozen Pricing Snapshot on Order** (Rate version immutability) | [`backend/app/api/orders.py`](../backend/app/api/orders.py) | `POST /api/orders` | `tests/test_api.py::test_rate_card_versioning_preserves_historical_order_price` | `OrderDetailModal.tsx` |

---

## 2. Zone & Area Resolution

| Requirement | Implementation File | API Endpoint | Automated Tests | Frontend UI |
|---|---|---|---|---|
| **Deterministic Pincode → Area → Zone** | [`backend/app/services/zone_service.py`](../backend/app/services/zone_service.py) | `POST /api/orders/quote`, `POST /api/orders` | `tests/test_zone_service.py::test_valid_pincode_resolution` | `OrderCreatePage.tsx` |
| **Intra vs Inter Zone Classification** | [`backend/app/services/zone_service.py`](../backend/app/services/zone_service.py) | `POST /api/orders/quote` | `tests/test_zone_service.py::test_determine_zone_type` | `PricingBreakdownCard.tsx` |
| **Admin Zone & Area Configuration** | [`backend/app/api/admin.py`](../backend/app/api/admin.py) | `POST /api/admin/zones`, `POST /api/admin/areas` | `tests/test_api.py::test_auth_and_rbac` | `AdminZonesPage.tsx` |

---

## 3. Dispatch & Agent Assignment

| Requirement | Implementation File | API Endpoint | Automated Tests | Frontend UI |
|---|---|---|---|---|
| **Haversine Distance Calculation** | [`backend/app/services/distance.py`](../backend/app/services/distance.py) | Internal service | `tests/test_distance.py` | `AssignmentAuditCard.tsx` |
| **Nearest Available Agent Ranking** | [`backend/app/services/assignment_engine.py`](../backend/app/services/assignment_engine.py) | `POST /api/orders/{id}/assign` | `tests/test_assignment_engine.py::test_rank_candidates_nearest_and_zone_match` | `AssignmentAuditCard.tsx` |
| **Duty Status & Capacity Filtering** | [`backend/app/services/assignment_engine.py`](../backend/app/services/assignment_engine.py) | `POST /api/orders/{id}/assign` | `tests/test_assignment_engine.py::test_find_eligible_agents` | `AdminAgentsPage.tsx` |
| **Concurrency-Safe Atomic Claim** | [`backend/app/services/agent_claim.py`](../backend/app/services/agent_claim.py) | `POST /api/orders/{id}/assign` | `tests/test_concurrency.py::test_atomic_claim_success_and_second_claim_fails` | `AdminOrdersPage.tsx` |
| **Assignment Decision Audit Trail** | [`backend/app/models/models.py`](../backend/app/models/models.py) | `GET /api/orders/{id}/assignments` | `tests/test_assignment_engine.py` | `AssignmentAuditCard.tsx` |

---

## 4. Order Lifecycle & Status History

| Requirement | Implementation File | API Endpoint | Automated Tests | Frontend UI |
|---|---|---|---|---|
| **Explicit State Machine Matrix** | [`backend/app/services/order_lifecycle.py`](../backend/app/services/order_lifecycle.py) | `POST /api/orders/{id}/status` | `tests/test_order_lifecycle.py::test_transition_validation_matrix` | `AgentDashboard.tsx` |
| **Append-Only Immutable Timeline** | [`backend/app/services/order_lifecycle.py`](../backend/app/services/order_lifecycle.py) | `GET /api/orders/{id}/timeline` | `tests/test_order_lifecycle.py::test_order_transition_and_history_creation` | `OrderTimeline.tsx` |
| **First-Class Delivery Attempts** | [`backend/app/services/order_lifecycle.py`](../backend/app/services/order_lifecycle.py) | `GET /api/orders/{id}/attempts` | `tests/test_order_lifecycle.py::test_delivery_attempts_tracking` | `DeliveryAttemptsList.tsx` |
| **Failed Delivery & Rescheduling Flow** | [`backend/app/api/orders.py`](../backend/app/api/orders.py) | `POST /api/orders/{id}/reschedule` | `tests/test_order_lifecycle.py` | `OrderDetailModal.tsx` |

---

## 5. Security, RBAC & Architecture

| Requirement | Implementation File | API Endpoint | Automated Tests | Frontend UI |
|---|---|---|---|---|
| **Role-Based Access Control (RBAC)** | [`backend/app/core/deps.py`](../backend/app/core/deps.py) | All authenticated routes | `tests/test_api.py::test_auth_and_rbac` | `Navbar.tsx` & Router Guards |
| **Structured Error Code Registry** | [`backend/app/core/errors.py`](../backend/app/core/errors.py) | Global exception handler | `tests/test_zone_service.py`, `tests/test_api.py` | Toast & Alert Modals |
| **Actor-Scoped Idempotency Support** | [`backend/app/api/orders.py`](../backend/app/api/orders.py) | `POST /api/orders` | `tests/test_api.py::test_idempotent_order_creation`, `test_idempotency_scoped_to_user_allows_different_users_same_key` | `OrderCreatePage.tsx` |
| **Notification Provider Abstraction (Email & SMS)** | [`backend/app/services/notification_service.py`](../backend/app/services/notification_service.py) | Internal service (Resend + Twilio + Console) | `tests/test_notifications.py` (5 tests) | `OrderDetailModal.tsx` |
