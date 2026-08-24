# Testing Strategy

## Test Suite Summary

```text
73 collected, 72 passed, 1 skipped, 0 failed
```

The backend test suite runs against a real PostgreSQL database using isolated test sessions. Each test starts with clean tables (full `DROP ALL` / `CREATE ALL` per test) to guarantee complete isolation.

### The Skipped Test

`test_live_resend_external_gateway_integration` in `test_e2e_smoke.py` is the optional live external email-provider smoke test. It is decorated with `@pytest.mark.skipif` when `RESEND_API_KEY` is not configured. This test exists to verify live provider connectivity when credentials are available, but is intentionally excluded from the deterministic automated suite to prevent quota consumption and external API dependency.

---

## Test Architecture

### Database Isolation

Tests use a separate `TEST_DATABASE_URL` that must differ from `DATABASE_URL`. This is enforced at import time in `conftest.py` with a hard `RuntimeError` if the URLs match. This prevents any possibility of test teardown destroying application data.

### Concurrency Tests

`test_concurrency.py` uses **real multithreaded PostgreSQL sessions** — not mocked concurrency. Tests coordinate with `threading.Barrier(2)` to force simultaneous database operations, validating that the atomic capacity claim correctly handles race conditions.

The key race scenario:

```text
Thread A: Order #1 → claims Agent X (rowcount = 1) → succeeds
Thread B: Order #2 → claims Agent X (rowcount = 0) → falls back to next candidate
```

This proves that the `UPDATE ... WHERE current_load < max_capacity` pattern is truly concurrent-safe.

### Notification Test Isolation

All automated tests force `settings.RESEND_API_KEY = None` in `conftest.py`, ensuring the Console provider is always selected. This gives deterministic behavior while still verifying:
- Notification dispatch logic fires on lifecycle events
- Audit records are persisted to the `notifications` table
- Provider factory correctly selects Console vs Resend based on configuration

---

## Test Modules

| Module | Tests | Coverage Area |
|---|:---:|---|
| `test_security_rbac.py` | 19 | Role injection prevention, status update authorization, multi-tenant isolation, delivery attempt protection, capacity boundaries, admin-only route protection, ORM append-only enforcement, PostgreSQL trigger-level immutability |
| `test_pricing_engine.py` | 8 | Volumetric weight formula, chargeable weight determination, B2B/B2C rate cards, INTRA/INTER zone pricing, COD surcharge calculation, canonical worked example (₹322.25) |
| `test_concurrency.py` | 7 | Multithreaded agent claim races, atomic rowcount verification, inactive agent rejection, concurrent duplicate assignment prevention via `SELECT FOR UPDATE`, concurrent rate card creation race, capacity limits and release |
| `test_api.py` | 7 | RBAC enforcement via HTTP, idempotency key duplicate prevention, actor-scoped idempotency isolation, rate card versioning price freeze, structured error responses, notification list endpoints, concurrent rate card safety |
| `test_assignment_engine.py` | 6 | Haversine distance ranking, zero-distance handling, zone matching, availability filtering, fallback when no agents available, API-level proof that auto-dispatch fires on order creation |
| `test_notifications.py` | 6 | Resend provider, Console provider, factory configuration, lifecycle event dispatch, password reset templates, database audit logging |
| `test_order_lifecycle.py` | 5 | State transition validation matrix, illegal transition rejection, cancellation rules, failure from multiple states, append-only status history |
| `test_failed_delivery_flow.py` | 5 | Complete failure/reschedule/reassignment flow, rejection of rescheduling non-failed orders, no-agent reschedule preservation, error propagation, concurrent claim collision resilience |
| `test_zone_service.py` | 4 | Valid pincode resolution, unknown pincode rejection, inactive area rejection, zone type determination |
| `test_distance.py` | 4 | Haversine formula accuracy (Delhi–Mumbai sanity), coordinate distance calculations |
| `test_e2e_smoke.py` | 2 | Full multi-role end-to-end journey (registration through delivery completion), live Resend gateway integration (skipped without API key) |

---

## Running Tests

```bash
cd backend
source venv/bin/activate
pytest tests/ -v
```

For CI environments, see `.github/workflows/ci.yml` which provisions a PostgreSQL service container and runs the full suite automatically.
