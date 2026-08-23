# Master Final Audit 4

**Subject:** Last-Mile Delivery Tracker  
**Audit mode:** Independent read-only recheck  
**Authoritative sources:** `LastMile_Delivery_Tracker.pdf` and `Assignment Submission Usage Guidelines.pdf`  
**Audit date:** 2026-08-23

No application source, test, configuration, or existing documentation file was modified. This report is a fresh audit of the current `main` branch, not a copy of earlier reports.

## Executive Verdict

The repository has improved materially since Audit 3. Current code includes 56 tests, route aliases, strict admin customer validation, narrowed reschedule exception handling, actor-scoped idempotency, admin-only configuration reads, a partial unique active-rate-card index, Twilio/Resend adapters, and an end-to-end failed-delivery test.

**However, Audit 4 identifies a new P1 transaction bug in the reschedule race path:** `auto_assign_order()` calls `db.rollback()` when all ranked candidate claims fail. The reschedule endpoint has already transitioned the order to `RESCHEDULED`, released/cleared the prior agent, and flushed those changes. The rollback can erase those changes, after which the handler can still commit and return a response that claims no-agent handling. This path is not covered by the current tests.

The submission remains **above average**, but it is not yet evaluator-ready for maximum credit because the hosted URL is absent, runtime execution is unverified here, and documentation still contains factual mismatches.

**Decision: FIX P0/P1 ISSUES THEN SUBMIT.**

## 1. Baseline and Changes Since Audit 3

Current branch is `main`, with `HEAD` at `270b937 fix(eval): out-of-the-box test runner defaults and route aliasing`. Recent commits also include strict admin customer validation and the frontend entry screen. The current worktree has no application modifications from this audit; only this report is new.

The latest code/docs changes verified during this pass:

- README test claim is now 56.
- `PATCH /api/orders/{id}/status` aliases the implemented POST route.
- `/api/orders/{id}/assignment-decision` aliases `/assignments`.
- Reschedule catches only `NO_AVAILABLE_AGENT`.
- Admin creation validates referenced customers more strictly through new tests and code.
- Test settings now have development defaults, although dependencies/database are still environment prerequisites.

## 2. Original Requirements Inventory

The original PDFs require:

| ID | Requirement | Category |
|---|---|---|
| REQ-01 | Delivery platform where customers/admins create orders with auto-calculated charges, intelligent assignment, and customer notifications. | Functional |
| REQ-02 | Pickup/drop address, dimensions, actual weight, B2B/B2C, Prepaid/COD input. | Functional |
| REQ-03 | Auto-calculated order charge, agent assignment, status tracking, notifications. | Functional |
| REQ-04 | Admin zones, area-to-zone mapping, B2B/B2C intra/inter rates, COD surcharge by order type. | Business Logic / Data |
| REQ-05 | Customer register/login/place order; Admin creates on behalf of customer. | Functional / Security |
| REQ-06 | Zone detection, volumetric weight `(L x B x H)/5000`, higher actual/volumetric chargeable weight, correct rate, COD surcharge. | Business Logic |
| REQ-07 | Charge shown before customer confirms. | UX / Functional |
| REQ-08 | Manual assignment and nearest-available auto-assignment. | Assignment |
| REQ-09 | Agent status updates: Picked Up, In Transit, Out for Delivery, Delivered, Failed. | Workflow |
| REQ-10 | Failure notification, customer reschedule, agent reassignment for rescheduled attempt. | Workflow |
| REQ-11 | Customer live status and full tracking timeline. | Functional / UX |
| REQ-12 | Email on every status change. | Notification |
| REQ-13 | Admin views/filter orders and overrides status. | Functional / API |
| REQ-14 | Backend API, frontend, database, and customer/agent/admin RBAC. | API / Security / Data |
| REQ-15 | Admin-configurable, non-hardcoded pricing engine. | Business Logic |
| REQ-16 | Nearest available agent based on location or zone. | Assignment |
| REQ-17 | Immutable history with timestamp and actor per status change. | Workflow / Data |
| REQ-18 | Failed flow flags, notifies, captures reschedule, and reassigns. | Workflow |
| REQ-19 | Email and SMS free-tier integration. | Integration |
| REQ-20 | Complete source ZIP. | Submission |
| REQ-21 | README setup, `.env.example`, API docs, DB schema, rate-calculation explanation. | Documentation |
| REQ-22 | Hosted application URL. | Deployment |
| REQ-23 | Maximum 800-word system-design write-up covering four named subjects. | Documentation |
| REQ-24 | Public GitHub `main` or public downloadable Drive submission. | Submission |
| REQ-25 | No node_modules, `.env`, build artifacts, editor folders. | Submission |
| REQ-26 | Only strictly required dependencies/package files. | Submission |
| REQ-27 | App runs without errors; structured/named/documented code. | Deployment / Code Quality |

## 3. Requirement Traceability Matrix

| ID | Current implementation and evidence | Test/enforcement evidence | Status |
|---|---|---|---|
| REQ-01 | FastAPI, React, orders, pricing, assignment, lifecycle, notifications. | Core path exists; hosted/runtime proof absent. | PARTIAL |
| REQ-02 | Pydantic order/quote schemas validate required inputs in [orders.py](backend/app/schemas/orders.py) and [pricing.py](backend/app/schemas/pricing.py). | Pricing/API tests cover representative inputs. | PASS |
| REQ-03 | Order snapshots, assignment decisions, status history, and notification calls exist. | Multiple focused suites. | PASS |
| REQ-04 | Zone/area, rate-card, and COD admin APIs plus DB models exist in [admin.py](backend/app/api/admin.py) and [models.py](backend/app/models/models.py). | Admin protection and configuration tests exist. | PASS |
| REQ-05 | Register forces CUSTOMER; customer order creation and admin-on-behalf flow exist; admin customer validation was recently tightened. | Security tests cover role injection and invalid/non-customer/inactive admin targets. | PASS |
| REQ-06 | `calculate_price()` implements zone, divisor, max weight, rate lookup, COD, Decimal rounding in [pricing_engine.py](backend/app/services/pricing_engine.py). | Exact canonical example and edge tests. | PASS |
| REQ-07 | `/api/orders/quote` and [OrderCreatePage.tsx](frontend/src/pages/OrderCreatePage.tsx) provide pre-confirmation pricing. | Quote is server-calculated. | PASS |
| REQ-08 | Manual/auto assignment route, ranking, and atomic claim exist. | Assignment tests and PostgreSQL race-test designs. | PASS |
| REQ-09 | Explicit lifecycle map validates required states in [order_lifecycle.py](backend/app/services/order_lifecycle.py). | Lifecycle/security tests cover invalid transitions and roles. | PASS |
| REQ-10 | Reschedule now transitions, releases old agent, calls auto-assignment, creates attempt 2 when possible, and notifies. | End-to-end test covers successful path and no-agent path. Race rollback path is untested. | PARTIAL |
| REQ-11 | Customer order/detail/timeline/attempt endpoints and UI exist; ownership is checked. | Cross-customer access tests. | PASS |
| REQ-12 | Status/failure/creation/assignment/reschedule call notification functions and persist notification records. | Provider tests exist; external delivery not verified. | PARTIAL |
| REQ-13 | Admin order listing includes status/zone/agent filters; admin override exists. | Route code supports it; filter/override tests limited. | PASS |
| REQ-14 | Backend/frontend/database/JWT/RBAC exist; admin configuration reads now require admin. | Security suite includes admin GET protection and ownership checks. | PASS |
| REQ-15 | Rate cards/COD values are DB-backed; no business rate constants in pricing engine; active rate-card partial unique index exists. | Pricing/version tests. | PASS |
| REQ-16 | Haversine, location/zone fallback, eligibility filter, atomic claim, and order lock exist. | Six concurrency tests are genuinely multithreaded/DB-oriented by design. Runtime unverified. | PASS |
| REQ-17 | Status history records actor/timestamp/old/new; order-history deletion is restricted. | Appends are tested. Direct history row UPDATE/DELETE is not DB-blocked. | PARTIAL |
| REQ-18 | Failure capture, notification, reschedule, release, automatic assignment, and attempt 2 exist. | End-to-end failed-delivery test. Race rollback can compromise the flow. | PARTIAL |
| REQ-19 | Twilio and Resend adapters plus console fallbacks exist in [notification_service.py](backend/app/services/notification_service.py). | Provider success/failure tests; Render secrets are declared but not proven populated. | PARTIAL |
| REQ-20 | Submission ZIP and packaging script exist. | Prior archive inspection showed clean contents; public delivery is unverified. | PARTIAL |
| REQ-21 | README now includes setup, env, API table, schema diagram, pricing, notifications, and tests. | Several claims still do not exactly match code. | PARTIAL |
| REQ-22 | Render blueprint exists in [render.yaml](render.yaml); no hosted URL is present or verified. | Static config is not deployment proof. | FAIL |
| REQ-23 | [system-design.md](docs/system-design.md) covers the requested areas and is within the stated word limit. | Current implementation now better matches its reschedule description. | PASS |
| REQ-24 | Branch and origin branch are `main`; public accessibility was not externally verified. | Local Git evidence only. | PARTIAL |
| REQ-25 | Packaging script excludes prohibited directories/files and archive listing was previously clean. | Static/package evidence. | PASS |
| REQ-26 | Pinned, modest backend/frontend dependencies. | No clearly unnecessary package established. | PASS |
| REQ-27 | Modular structure and setup files exist; latest commit adds default test settings. | Backend/frontend execution was not freshly verified in this environment. | PARTIAL |

## 4. Static Business-Logic Review

### Pricing

The canonical sample remains correct: `50 x 40 x 30 / 5000 = 12.00`; chargeable weight `12.00`; B2C INTER base `₹290.00`; COD `₹32.25`; total `₹322.25`. Decimal and half-up rounding are used. Computed order charges are frozen. The PDF does not require a separate snapshot table, so the lack of copied rate parameters is a robustness issue, not a requirement failure.

### Assignment/concurrency

The normal path is order lock -> eligible-agent query -> distance/zone/load ranking -> atomic conditional claim -> order assignment -> lifecycle transition -> attempt -> audit decision -> commit. Agent capacity and inactive status are checked in SQL. The concurrency tests use barriers, thread pools, separate sessions, and final DB assertions, so they are not merely sequential tests.

### Critical reschedule transaction finding

`reschedule_order()` performs the FAILED -> RESCHEDULED transition, agent release, and `db.flush()`, then calls `auto_assign_order()`. In `auto_assign_order()`, if candidates exist but every atomic claim returns false, the function calls `db.rollback()` before raising `NO_AVAILABLE_AGENT`. That rollback can erase the already-flushed reschedule transition, date, and agent release. The caller catches `NO_AVAILABLE_AGENT`, sets `assignment_result = None`, then calls `db.commit()` and returns the “No available agent” response. This can produce a response inconsistent with persisted state, and may leave the order FAILED rather than RESCHEDULED. The no-candidate path does not necessarily perform that rollback, so the bug is race/claim-failure specific.

**WEAK — because** the successful and empty-availability tests do not simulate “eligible candidates returned, then all claims fail.” This is exactly the concurrency-sensitive branch the workflow added.

## 5. Database Audit

**Strong:** required business concepts, foreign keys, indexes, package/load checks, actor-scoped idempotency, and active-rate-card uniqueness are modeled.

**PARTIAL — immutable history:** order deletion is now restricted when history exists, but history rows themselves are still update/deleteable by direct DB access. Delivery attempts still use `ondelete="CASCADE"`, despite README/schema prose claiming attempts use RESTRICT. Attempt fields are mutable and no DB append-only trigger exists.

**Strong but incomplete — rate cards:** the partial unique index now prevents multiple active cards per `(order_type, zone_type)`. Version numbering remains application-managed; concurrent updates may raise conflicts rather than produce a clean deterministic version sequence. No race test proves behavior.

**WEAK — seed/deployment data safety:** `seed.py` can drop/recreate schema without `SEED_IF_EMPTY=1`; Render sets the flag, but default local seeding is destructive. This is not a core PDF requirement but is relevant to evaluator reliability.

## 6. Security/RBAC/API Audit

**PASS:** JWT active-user checks, password hashing, registration privilege prevention, customer/agent ownership, admin mutation controls, admin configuration GET protection, and actor-scoped idempotency are implemented and tested.

**PASS:** Recent route aliases make the documented PATCH status route and singular assignment-decision route callable, although the canonical implementation remains POST and plural assignments.

**WEAK — documentation contract:** README currently calls `POST /api/orders/quote` “Public,” but code requires `get_current_user`; an unauthenticated quote request receives an authentication failure. This is a direct evaluator-facing mismatch. The README now includes aliases for earlier method/path mismatches, but this access mismatch remains.

Malformed UUIDs are parsed by direct `UUID(...)` calls in routes and may produce generic failures instead of the structured error registry. This is API polish, not an explicit assignment failure.

## 7. Test Audit

Static enumeration finds **56 actual test functions across 10 files**, matching the current README claim. Coverage includes:

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

The suite is broad and behavior-oriented. Strong tests include exact pricing, real multithreaded agent claims, same-order assignment race, actor-scoped idempotency, admin GET protection, strict admin customer validation, provider failures, and end-to-end rescheduling.

**Missing high-value test:** all eligible candidate claims failing after the reschedule transition has been flushed. Also missing are concurrent rate-card version writes, DB-level history mutation protection, notification rows after real lifecycle endpoints, and a route-contract test for quote authentication.

**Runtime:** UNVERIFIED in this audit. The current shell did not provide a fresh test/build execution; declared defaults in `config.py` improve collection ergonomics but do not establish installed dependencies, PostgreSQL availability, or passing results.

## 8. Deployment and Evaluator Experience

**Static readiness:** Render provisions backend/frontend/database, notification secret variables, production demo mode false, seed data, env examples, Dockerfile, and clean packaging. CORS includes assumed Render frontend and localhost.

**FAIL — hosted deliverable:** no actual hosted URL is supplied. Render service names and URLs in configuration are not evidence of a running deployment.

**PARTIAL — notifications:** Twilio/Resend providers are real adapters, and secrets are declared with `sync: false`. Actual values and external delivery were not verified. Console fallback can report `SENT` without sending externally.

**PARTIAL — startup:** Render uses `SEED_IF_EMPTY=1`; local default seed remains destructive, and there is no migration system. Docker requires env values and was not executed here.

**Five-minute evaluator experience:** README now has credentials, seeded workflow, pricing, assignment audit, lifecycle, attempts, API reference, schema diagram, notifications, and test breakdown. The missing URL remains a direct blocker. The quote access claim can mislead API-focused evaluators.

## 9. Documentation and Code Quality

**STRONG — because** the modular monolith has useful boundaries for pricing, distance, assignment, atomic claims, lifecycle, zones, auth, schemas, and notifications. The assignment’s evaluation focus is visible in both code and tests.

**WEAK — because** README still states production-ready behavior without proof of deployment or populated provider secrets; it says the quote is public although the route is authenticated. The database diagram/prose says delivery attempts use RESTRICT, but [models.py](backend/app/models/models.py) uses CASCADE. These are factual evaluator-trust issues.

The latest frontend entry-screen work improves first impression, but no browser/runtime verification was possible in this pass.

## 10. Competitive Analysis

### Common / Expected

Authentication, CRUD order flow, React dashboards, basic pricing, status actions, and role labels.

### Strong Differentiators

- Exact Decimal database-driven B2B/B2C and INTRA/INTER pricing.
- Haversine ranking and explainable candidate audit records.
- Atomic capacity claims and order locking.
- Genuine PostgreSQL multithreaded race-test design.
- First-class delivery attempts and automatic reschedule reassignment.
- Server-side ownership isolation and actor-scoped idempotency.
- DB partial unique active-rate-card invariant.
- Twilio/Resend provider abstractions and notification audit records.

### Top-1%-Level Differentiator

**Potential, not established.** The technical design is stronger than average, but no Top 1% claim is justified without verified test execution, a live URL, externally demonstrated notifications, and correction of remaining transaction/documentation risks.

## 11. Scoring

| Category | Weight | Score /10 | Weighted Score | Evidence | Missing/Weak Areas |
|---|---:|---:|---:|---|---|
| Assignment Requirements | 20% | 8.0 | 16.00 | Core requirements and recent fixes are present. | Hosted URL absent; notification/runtime proof incomplete. |
| Functional Correctness | 15% | 8.0 | 12.00 | Full normal failed-delivery flow now exists and is tested. | Reschedule claim-failure rollback inconsistency. |
| Business Logic | 10% | 8.5 | 8.50 | Exact pricing, state machine, assignment, failed flow. | Uncovered race-specific workflow branch. |
| Database/Data Integrity | 10% | 8.0 | 8.00 | Rich schema, checks, active-rate uniqueness, restricted order-history deletion. | Direct history/attempt mutation; attempts CASCADE. |
| Concurrency/Transactions | 10% | 7.5 | 7.50 | Strong agent/order race design. | Reschedule rollback bug; rate-card race untested. |
| Security/RBAC | 8% | 8.5 | 6.80 | Admin GET fix, ownership, actor-scoped idempotency, strict customer target validation. | Quote auth documentation mismatch; malformed IDs. |
| API Quality | 5% | 7.5 | 3.75 | Broad surface, aliases, structured errors. | Quote access mismatch in README; inconsistent malformed-input errors. |
| Testing | 8% | 7.5 | 6.00 | 56 meaningful tests across 10 files. | Runtime not verified; missing race/DB immutability tests. |
| Deployment/Configuration | 5% | 6.0 | 3.00 | Render blueprint, env variables, Docker, seed. | No hosted URL; no actual deployment/provider proof. |
| Code Quality/Architecture | 4% | 8.0 | 3.20 | Focused modular monolith and useful abstractions. | Large modules; no migrations; transaction coupling. |
| Documentation | 3% | 6.5 | 1.95 | README expanded with API/schema/test material. | Quote access and attempt FK claims inaccurate. |
| Evaluator/Demo Experience | 2% | 6.5 | 1.30 | Seeded credentials and rich walkthrough. | Missing URL; API/docs mismatch. |
| **Total** | **100%** |  | **78.00 / 100** |  |  |

## 12. Requirement Gaps

| Priority | Requirement | Gap | Evidence | Impact | Fix Required? |
|---|---|---|---|---|---|
| P0 | REQ-22 | Hosted application URL is absent/unverified. | README/repository contain Render config but no live URL. | Explicit deliverable missing; evaluator cannot open the app. | Yes |
| P1 | REQ-10 / REQ-18 | Reschedule claim-failure branch can roll back already-flushed reschedule changes, then return a misleading no-agent response. | `reschedule_order()` plus `auto_assign_order()` rollback behavior. | State/response inconsistency under assignment race. | Yes |
| P1 | REQ-21 | README says quote endpoint is Public, but route requires authentication. | README API table versus [orders.py](backend/app/api/orders.py). | Evaluator following docs gets auth failure. | Yes |
| P1 | REQ-17 | History/attempt immutability is not fully DB-enforced; attempts still cascade. | [models.py](backend/app/models/models.py). | Audit preservation claim is overstated. | Yes for maximum score |
| P1 | REQ-19 / REQ-12 | Providers exist, but populated Render credentials and actual external delivery are unverified. | [render.yaml](render.yaml), [notification_service.py](backend/app/services/notification_service.py). | Hosted notification requirement cannot be proven. | Yes: configure/verify |
| P1 | REQ-27 | Full 56-test suite and frontend build are not verified in this environment. | No fresh executable run; PostgreSQL required for fixtures/races. | Runtime readiness cannot be claimed. | Yes: verify before submission |
| P1 | REQ-04 / REQ-15 | Rate-card active uniqueness is fixed, but concurrent version update behavior lacks test/error handling. | [admin.py](backend/app/api/admin.py), [models.py](backend/app/models/models.py). | Configuration race may produce unhandled conflict. | Yes for maximum robustness |
| P2 | REQ-21 | DB documentation says attempts use RESTRICT while model uses CASCADE. | README schema section versus [models.py](backend/app/models/models.py). | Documentation trust/preservation confusion. | Yes, documentation correction |
| P2 | REQ-27 | Destructive default local seed and generic malformed UUID errors. | [seed.py](backend/seed.py), route UUID parsing. | Setup/polish risk, not core assignment omission. | No, unless time permits |

## 13. Final Verdicts

### A. Requirement Completeness

**88/100.** Core requirements are now substantially implemented. Hosted delivery is missing; notification/runtime proof and strict DB immutability remain incomplete.

### B. Technical Quality

**84/100.** Pricing, assignment, concurrency design, lifecycle, provider abstractions, and RBAC are strong. The reschedule rollback path and DB/documentation inconsistencies prevent a higher score.

### C. Evaluator Readiness

**70/100.** The README and seeded demo are much stronger, but no live URL and no verified clean execution remain serious blockers.

### D. Competitive Strength Among 600+ Submissions

**Above average, with Top 10% potential after fixes.** The implementation has credible Top 10% engineering characteristics. Top 5% or Top 1% is not supportable without a verified deployment, passing test run, accurate documentation, and the race-path repair.

# FINAL SCORE

**78.00 / 100**

# MUST-FIX ISSUES

1. Provide and verify the hosted application URL.
2. Repair the reschedule/all-claims-fail transaction path so rollback cannot erase the prior reschedule state or produce an inconsistent response.
3. Correct README/API/schema claims, especially quote authentication and delivery-attempt FK behavior.
4. Configure and verify real Resend/Twilio delivery in the deployed environment.
5. Run and report all 56 tests against isolated PostgreSQL and verify the frontend production build.
6. Strengthen or accurately qualify database-level history and delivery-attempt immutability.

# OPTIONAL ISSUES

- Add concurrent rate-card update tests and explicit conflict handling.
- Add notification persistence tests through real lifecycle API calls.
- Add malformed UUID/date and API contract tests.
- Replace destructive seed/startup initialization with safer deployment initialization if the project extends beyond the assignment demo.

# STRONGEST DIFFERENTIATORS

- Exact Decimal database-driven pricing and canonical worked-example test.
- Atomic capacity-aware assignment with order locking.
- Genuine multithreaded PostgreSQL race-test design.
- Explainable Haversine candidate audit trail.
- First-class delivery attempts and automatic reschedule reassignment.
- Actor-scoped idempotency and server-side ownership isolation.
- Database active-rate-card uniqueness.
- Twilio/Resend provider abstractions with failure audit logging.

# BIGGEST RISKS

- No hosted URL for evaluator access.
- Reschedule race can leave persisted state inconsistent with the response.
- Runtime/test pass status is unverified.
- README and schema documentation still contain factual mismatches.
- External notification delivery is not demonstrated.
- History and attempts are not fully immutable at database level.

# SUBMISSION DECISION

**FIX P0/P1 ISSUES THEN SUBMIT**
