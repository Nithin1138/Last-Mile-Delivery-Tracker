# Master Final Audit 5

**Subject:** Last-Mile Delivery Tracker  
**Audit mode:** Independent read-only recheck  
**Authoritative sources:** `LastMile_Delivery_Tracker.pdf` and `Assignment Submission Usage Guidelines.pdf`  
**Audit date:** 2026-08-23

No application source, test, configuration, or existing documentation file was modified. This is Audit 5 against the original PDFs and the current `main` branch.

## Executive Verdict

The current repository is materially stronger than the earlier audit states. The Audit 4 transaction defect is fixed, delivery-attempt deletion is now restricted, strict admin customer validation exists, API aliases exist, and the current suite contains 57 tests. The new regression test specifically covers the race branch where all candidate claims fail during rescheduling.

The submission is now a credible, above-average hiring assignment. It is still not fully evaluator-ready because no hosted application URL is supplied, runtime results are not independently reproducible in this audit environment, external notification delivery is not proven, and README/schema documentation contains factual inaccuracies.

**Final decision: FIX P0/P1 ISSUES THEN SUBMIT.**

## 1. Original Requirement Inventory

The original PDFs define the following requirements:

| ID | Requirement | Category |
|---|---|---|
| REQ-01 | Build a delivery management platform where customers and admins create orders with auto-calculated charges, agents are assigned intelligently, and customers are notified throughout the delivery journey. | Functional |
| REQ-02 | Accept pickup/drop address, dimensions L x B x H, actual weight, order type B2B/B2C, and payment type Prepaid/COD. | Functional |
| REQ-03 | Output an order with auto-calculated charge, agent assignment, status tracking, and notifications. | Functional |
| REQ-04 | Admin manages zones, areas, intra/inter rates for B2B/B2C, and COD surcharge per order type. | Business Logic / Data |
| REQ-05 | Customer registers, logs in, places an order; Admin can create on behalf of a customer. | Functional / Security |
| REQ-06 | Detect zones, compute volumetric weight `(L x B x H)/5000`, charge the higher actual/volumetric weight, apply correct zone/order-type rate, and add COD surcharge. | Business Logic |
| REQ-07 | Show the charge before customer confirmation. | UX / Functional |
| REQ-08 | Admin manually assigns or triggers nearest-available auto-assignment. | Assignment |
| REQ-09 | Agent updates Picked Up, In Transit, Out for Delivery, Delivered, Failed. | Workflow |
| REQ-10 | Failed delivery notifies customer, supports new-date rescheduling, and reassigns an agent for the rescheduled attempt. | Workflow |
| REQ-11 | Customer views live status and full tracking timeline. | Functional / UX |
| REQ-12 | Email notification on every status change. | Notification |
| REQ-13 | Admin views/filters orders by status, zone, agent, and overrides status. | API / Functional |
| REQ-14 | Backend API, frontend, database, and customer/agent/admin role-based auth. | API / Security / Data |
| REQ-15 | Admin-configurable, non-hardcoded pricing engine. | Business Logic |
| REQ-16 | Nearest available agent based on current location or zone. | Assignment |
| REQ-17 | Immutable tracking history with timestamp and actor for each change. | Workflow / Data |
| REQ-18 | Failed flow flags, notifies, captures reschedule, and reassigns. | Workflow |
| REQ-19 | Email and SMS integration using a free-tier service. | Integration |
| REQ-20 | Complete source ZIP. | Submission |
| REQ-21 | README with setup, `.env.example`, API docs, DB schema, and rate explanation. | Documentation |
| REQ-22 | Hosted application URL. | Deployment |
| REQ-23 | System-design write-up no longer than 800 words covering four named areas. | Documentation |
| REQ-24 | Public GitHub `main`, or public downloadable Drive submission. | Submission |
| REQ-25 | No node_modules, `.env`, build artifacts, or editor-specific folders. | Submission |
| REQ-26 | Only strictly required dependencies/package files. | Submission |
| REQ-27 | App runs without errors and code is properly structured, named, and documented. | Deployment / Code Quality |

## 2. Requirement Traceability Matrix

| ID | Current evidence | Enforcement/test evidence | Status |
|---|---|---|---|
| REQ-01 | FastAPI, React, pricing, assignment, lifecycle, notification modules. | Main workflow exists; hosted/runtime evidence remains incomplete. | PARTIAL |
| REQ-02 | Pydantic order/quote request schemas validate all required inputs. | Pricing/API tests cover representative fields. | PASS |
| REQ-03 | Order snapshots, assignment decisions, status history, and notification calls exist. | Focused suites cover components. | PASS |
| REQ-04 | Admin zone/area/rate/COD APIs and DB tables exist. | Admin mutations/reads and configuration tests exist; active card uniqueness is DB-backed. | PASS |
| REQ-05 | Public registration forces CUSTOMER; login/JWT and admin-on-behalf order creation exist. | New tests reject nonexistent, inactive, and agent customer IDs. | PASS |
| REQ-06 | Pricing engine implements zone lookup, divisor 5000, max weight, rate card, COD, Decimal rounding. | Canonical worked-example test and pricing edge tests. | PASS |
| REQ-07 | `/api/orders/quote` and order form show price before creation. | Server calculates quote independently of client price. | PASS |
| REQ-08 | Manual/auto assignment route, Haversine ranking, eligibility filter, atomic claim. | Assignment and concurrency test designs. | PASS |
| REQ-09 | Explicit state machine in [order_lifecycle.py](backend/app/services/order_lifecycle.py). | Illegal-transition and authorization tests. | PASS |
| REQ-10 | Reschedule transitions, releases prior agent, auto-assigns when possible, creates attempt 2, notifies. | End-to-end test plus no-agent and claim-collision regression tests. | PASS |
| REQ-11 | Customer detail/list/timeline/attempt APIs and UI exist; order access is scoped. | Cross-customer access tests. “Live” has no explicit push requirement. | PASS |
| REQ-12 | Lifecycle paths call email notification functions and persist notification records. | Resend provider tests exist; actual external delivery is unverified. | PARTIAL |
| REQ-13 | Admin order listing supports status/zone/agent filters; admin override exists. | Implementation is present; direct filter coverage is limited. | PASS |
| REQ-14 | Backend/frontend/database/JWT/RBAC exist; admin GET routes use `require_admin`. | Security suite covers ownership and admin routes. | PASS |
| REQ-15 | Rate cards/COD are database-driven; active rate-card partial unique index exists. | Pricing and rate-version tests. | PASS |
| REQ-16 | Haversine distance, coordinate/zone fallback, availability/capacity filtering, atomic claim. | Six DB/thread-oriented concurrency tests. Runtime execution is not independently reproduced here. | PASS |
| REQ-17 | History stores actor, old/new status, timestamp; order and attempt FKs use RESTRICT. | Application appends only, but no DB trigger/permission prevents direct UPDATE/DELETE of history rows. | PARTIAL |
| REQ-18 | Failed attempt capture, reschedule, release, automatic reassignment, attempt 2. | New race-collision persistence test covers all claims failing. | PASS |
| REQ-19 | Resend and Twilio adapters plus console fallback exist. | Provider success/failure tests; deployed credentials and real delivery are unverified. | PARTIAL |
| REQ-20 | ZIP and packaging script exist. | Prior archive inspection showed clean package; public distribution is not proven locally. | PARTIAL |
| REQ-21 | README now contains setup, env, API table, schema diagram, pricing, notifications, and tests. | Test count is current at 57, but quote access and index/FK identifiers are inaccurate. | PARTIAL |
| REQ-22 | Render blueprint exists, but no live hosted URL is supplied. | Static YAML is not deployment proof. | FAIL |
| REQ-23 | System design covers rate, zones, assignment, failure handling and is within limit. | Current implementation matches its reschedule description. | PASS |
| REQ-24 | `main` branch and `origin/main` exist. | Public accessibility was not externally verified. | PARTIAL |
| REQ-25 | Packaging excludes prohibited artifacts. | Script/archive evidence. | PASS |
| REQ-26 | Dependencies are pinned and modest. | No unnecessary dependency established statically. | PASS |
| REQ-27 | Modular structure, setup files, Dockerfile, tests, docs. | Commit claims 57 tests/backend and frontend build passed, but this audit did not independently execute them. | PARTIAL |

## 3. Business Logic Audit

### Pricing

The canonical sample is correct: `50 x 40 x 30 / 5000 = 12.00 kg`; chargeable weight `12.00 kg`; B2C INTER base `₹290.00`; COD `₹32.25`; total `₹322.25`. The engine uses Decimal and half-up rounding, resolves DB rate cards, and freezes computed monetary values on the order. The PDF does not require a separate rate-parameter snapshot table.

### Assignment and concurrency

The normal path locks the order, filters active AVAILABLE agents below capacity, ranks by distance/zone/load, atomically claims capacity, assigns the order, transitions status, creates an attempt, records the decision, and commits. DB load checks and SQL predicates prevent over-allocation. The test suite’s thread/barrier/separate-session cases are genuine concurrency tests by design.

### Failed delivery/reschedule

The current path is complete in the normal case: FAILED -> RESCHEDULED, release prior agent, attempt automatic assignment, transition to ASSIGNED, create attempt 2, and notify. If no agent is available, the order remains RESCHEDULED for manual assignment.

**Audit 4 issue resolved:** `auto_assign_order()` no longer rolls back the outer transaction when all candidate claims fail. The new `test_reschedule_all_candidate_claims_fail_preserves_rescheduled_state` verifies status/date/release persistence and no duplicate attempt. This prior defect is no longer a finding.

Residual concern: the route’s “no available agent” fallback depends on the exact `NO_AVAILABLE_AGENT` code; that is now correctly narrowed and tested for unexpected `AppError` propagation.

## 4. Database Audit

**Strong:** required entities, foreign keys, indexes, package/load checks, actor-scoped idempotency, and a partial unique active-rate-card index exist.

**PARTIAL — immutability:** `OrderStatusHistory.order_id` and `DeliveryAttempt.order_id` now use `RESTRICT`, preventing parent order deletion while audit rows exist. However, direct UPDATE/DELETE of history and attempt rows is not DB-blocked by triggers or permissions. The application exposes no such routes, so this is a robustness gap rather than a demonstrated public API exploit.

**PARTIAL — rate-card version races:** the active-card uniqueness index prevents ambiguity, but version increment remains application-managed. Concurrent admin updates may produce an integrity conflict or non-clean version behavior; there is no concurrency test for this.

**WEAK — documentation mismatch:** README names the index `uq_active_rate_card`, while the model defines `uq_rate_cards_one_active_per_type`. The invariant is present; the identifier claim is wrong. README also says delivery attempts use RESTRICT, which now matches the model.

## 5. Security/RBAC/API Audit

**PASS:** JWT active-user checks, password hashing, forced CUSTOMER registration, customer and agent ownership checks, admin-only configuration reads/mutations, strict admin customer target validation, and actor-scoped idempotency are implemented.

**WEAK — API documentation:** README labels `POST /api/orders/quote` as Public, but the implementation requires `get_current_user`. README now documents both POST/PATCH status and both assignment-decision paths, matching current aliases. Malformed UUIDs still pass through direct `UUID(...)` construction and may produce generic errors rather than the structured error registry. This is API polish rather than a core PDF failure.

**No current idempotency leak found:** current key records are scoped by `user_id` and the order uniqueness constraint is `(customer_id, idempotency_key)`; the cross-user regression test is meaningful.

## 6. Test Audit

Static enumeration finds **57 actual test functions across 10 files**, matching the current README claim. Breakdown:

- Pricing: 8
- Assignment: 5
- Concurrency: 6
- Lifecycle: 5
- Failed delivery: 5
- Notifications: 5
- Security: 11
- API: 4
- Zones: 4
- Distance: 4

**Strong tests:** canonical pricing, Haversine ranking, atomic capacity races, same-order assignment race, actor-scoped idempotency, admin GET RBAC, admin customer validation, provider failure behavior, complete rescheduling, no-agent fallback, unexpected error propagation, and claim-collision transaction persistence.

**Missing tests:** concurrent rate-card updates, direct DB history mutation protection, notification rows after complete lifecycle API calls, malformed UUID/date contracts, and external-provider integration. These are meaningful gaps but do not invalidate the core test suite.

**Execution evidence:** the latest commit message states all 57 tests and frontend build passed. This audit environment did not independently rerun them, so runtime status is reported as **UNVERIFIED**, not as a failure.

## 7. Deployment and Evaluator Experience

**Static readiness:** Render blueprint provisions backend/frontend/PostgreSQL and declares Resend/Twilio variables; production demo mode is false; env examples, seed data, Dockerfile, and clean packaging exist.

**FAIL — hosted deliverable:** no actual hosted application URL is supplied. Render service names/URLs are configuration assumptions, not proof of a live application.

**PARTIAL — notifications:** real Resend/Twilio adapters exist and are testable; Render variables are `sync: false`, so populated credentials and actual external delivery cannot be inferred. Console fallback may record `SENT` without external delivery.

**PARTIAL — startup:** Render sets `SEED_IF_EMPTY=1` and runs seed before Uvicorn. Local default seeding can recreate schema, and no migrations exist. This is acceptable only as constrained demo setup, not production-grade initialization.

**Five-minute evaluator experience:** README now provides seeded credentials, pricing example, assignment audit, lifecycle/attempt walkthrough, API reference, schema diagram, notification setup, and test breakdown. The missing URL remains the primary blocker. The quote access label and index identifier can mislead a documentation-focused evaluator.

## 8. Code Quality and Documentation

**STRONG — because** the modular monolith separates API, schemas, pricing, distance, assignment, claim, lifecycle, zones, auth, notifications, and models. The assignment’s evaluation focus is directly visible in code and tests.

**WEAK — because** production-ready language is stronger than the evidence: no deployed URL or external notification delivery is shown. README’s quote access and index-name claims are inaccurate. The database schema prose now correctly describes RESTRICT for attempts, but the history is still not fully immutable at the database row level.

## 9. Competitive Analysis

### Common / Expected

Authentication, CRUD orders, frontend dashboards, basic pricing, status actions, and role labels.

### Strong Differentiators

- Exact Decimal database-driven B2B/B2C and INTRA/INTER pricing.
- Haversine assignment with coordinate/zone fallback and explainable audit decisions.
- Atomic capacity claims and order locking.
- Genuine multithreaded PostgreSQL concurrency-test design.
- First-class attempts and automatic reschedule reassignment.
- Actor-scoped idempotency and server-side ownership isolation.
- Database active-rate-card uniqueness.
- Twilio/Resend abstractions with failure audit handling.
- Regression coverage for the reschedule claim-collision transaction branch.

### Top-1%-Level Differentiator

**Potential, not established.** The technical core is stronger than average, but a Top 1% classification is not supportable without live deployment proof, independently verified test execution, and demonstrated external notifications.

## 10. Scoring

| Category | Weight | Score /10 | Weighted Score | Evidence | Missing/Weak Areas |
|---|---:|---:|---:|---|---|
| Assignment Requirements | 20% | 8.5 | 17.00 | Core requirements now implemented. | Hosted URL and external notification proof absent. |
| Functional Correctness | 15% | 8.5 | 12.75 | Full normal lifecycle/reschedule path and regression test. | Runtime not independently reproduced. |
| Business Logic | 10% | 8.8 | 8.80 | Exact pricing, state machine, assignment, failure recovery. | Rate-card concurrency behavior untested. |
| Database/Data Integrity | 10% | 8.2 | 8.20 | Rich schema, checks, active-rate uniqueness, RESTRICT parent FKs. | Direct row immutability not enforced; version races. |
| Concurrency/Transactions | 10% | 8.5 | 8.50 | Atomic claims, order lock, race tests, reschedule regression. | Concurrent rate-card writes untested. |
| Security/RBAC | 8% | 8.8 | 7.04 | Ownership, admin reads, actor-scoped idempotency, customer validation. | Malformed-input consistency. |
| API Quality | 5% | 8.0 | 4.00 | Broad routes, aliases, structured errors. | README quote-access mismatch; generic malformed UUID errors. |
| Testing | 8% | 8.0 | 6.40 | 57 behavior-oriented tests across 10 files. | Independent execution and external integration unverified. |
| Deployment/Configuration | 5% | 6.5 | 3.25 | Render/Docker/env/seed configuration. | No hosted URL or actual deployment proof. |
| Code Quality/Architecture | 4% | 8.3 | 3.32 | Clear modular monolith and focused services. | Large modules; no migrations. |
| Documentation | 3% | 7.0 | 2.10 | README has required sections and supporting docs. | Incorrect quote access and index identifier. |
| Evaluator/Demo Experience | 2% | 7.0 | 1.40 | Seeded workflow, credentials, audit views. | Missing live URL and minor docs traps. |
| **Total** | **100%** |  | **82.76 / 100** |  |  |

## 11. Requirement Gaps

| Priority | Requirement | Gap | Evidence | Impact | Fix Required? |
|---|---|---|---|---|---|
| P0 | REQ-22 | No hosted application URL is supplied. | README/repository contain Render config only. | Explicit deliverable missing; evaluator cannot open the product. | Yes |
| P1 | REQ-12 / REQ-19 | Provider adapters and Render secret declarations exist, but actual credentials and external delivery are unverified. | [render.yaml](render.yaml), [notification_service.py](backend/app/services/notification_service.py). | Notification requirement cannot be demonstrated in a hosted evaluation. | Yes: configure/verify |
| P1 | REQ-21 | README labels quote endpoint Public while code requires authentication. | README API table versus [orders.py](backend/app/api/orders.py). | Evaluator following docs gets 401/403. | Yes |
| P1 | REQ-17 | History/attempt rows are not fully immutable against direct DB UPDATE/DELETE despite append-only claim. | [models.py](backend/app/models/models.py). | Audit-history guarantee is weaker than stated. | Yes for maximum score |
| P1 | REQ-04 / REQ-15 | Concurrent rate-card version updates have no test or explicit conflict handling. | [admin.py](backend/app/api/admin.py), [models.py](backend/app/models/models.py). | Configuration races can produce unhandled integrity conflicts. | Yes for maximum robustness |
| P1 | REQ-27 | 57 tests and frontend build are claimed by latest commit but not independently rerun in this audit. | Current environment did not provide fresh execution. | Runtime readiness remains unverified, not disproven. | Yes: verify before submission |
| P2 | REQ-21 | README uses wrong active-index identifier; malformed API input/error contract is not fully documented. | README versus model/routes. | Documentation/polish risk. | No, but correct before final packaging |
| P2 | REQ-27 | Default local seed can recreate schema; no migrations. | [seed.py](backend/seed.py), [database.py](backend/app/database.py). | Setup/data safety risk beyond the assignment demo. | No |

## 12. Final Verdicts

### A. Requirement Completeness

**92/100.** The functional requirements are now substantially satisfied. The hosted URL is still missing; notification delivery and DB-level immutability are not fully proven.

### B. Technical Quality

**88/100.** Pricing, assignment, concurrency, lifecycle, RBAC, and provider abstractions are strong. Remaining deductions are for deployment proof, DB immutability, rate-card race handling, and documentation accuracy.

### C. Evaluator Readiness

**76/100.** The README and seeded workflow are strong, but the evaluator still lacks a live URL and could be misled by the quote-access documentation.

### D. Competitive Strength Among 600+ Submissions

**Top 10% potential, not established as fact.** The current implementation has credible differentiators beyond CRUD, especially atomic assignment and race-focused tests. Top 5% or Top 1% cannot be justified without a live demo and independently verified execution.

# FINAL SCORE

**82.76 / 100**

# MUST-FIX ISSUES

1. Provide and verify the hosted application URL.
2. Configure and demonstrate actual Resend/Twilio delivery in the deployed environment.
3. Correct the README quote access claim and active-index identifier.
4. Run and report all 57 tests plus the frontend production build in a clean environment.
5. Decide whether to enforce DB-level row immutability for history/attempts and add explicit concurrent rate-card conflict handling if maximum robustness is claimed.

# OPTIONAL ISSUES

- Add tests for concurrent rate-card writes, lifecycle notification persistence, malformed IDs/dates, and direct DB immutability.
- Clarify console fallback versus real delivery in evaluator instructions.
- Replace destructive seed/schema initialization with safer deployment initialization if the app is extended beyond the assignment demo.

# STRONGEST DIFFERENTIATORS

- Exact Decimal database-driven pricing with canonical example coverage.
- Atomic capacity-aware assignment with order locking.
- Genuine PostgreSQL multithreaded race testing.
- Explainable Haversine candidate decisions.
- First-class delivery attempts and automatic reschedule reassignment.
- Actor-scoped idempotency and ownership isolation.
- DB-enforced active-rate-card uniqueness.
- Twilio/Resend provider abstractions and race-regression coverage.

# BIGGEST RISKS

- No hosted URL for the evaluator.
- External notification delivery is not demonstrated.
- Backend test/build execution is not independently verified in this audit.
- README still contains factual API/schema identifier errors.
- History and attempts are not fully immutable at row level.
- Concurrent rate-card version conflicts are not explicitly handled.

# SUBMISSION DECISION

**FIX P0/P1 ISSUES THEN SUBMIT**
