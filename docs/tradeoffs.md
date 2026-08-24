# Engineering Trade-Offs & Design Decisions

This document outlines the core architectural and technical decisions made during the development of the Last-Mile Delivery Tracker, including explicit trade-offs and rationale.

---

## 1. Why PostgreSQL over NoSQL / Document Store

- **Decision**: PostgreSQL with relational constraints, Foreign Keys, CHECK constraints, and ACID transactions.
- **Rationale**: Logistics operations require absolute data consistency. Orders, agents, delivery attempts, and pricing cards have strict relational invariants (e.g. an order cannot reference a non-existent customer; an agent load cannot exceed max capacity).
- **Trade-off**: Slightly more upfront schema definition compared to schemaless MongoDB, but eliminates data anomalies and enables concurrency-safe atomic conditional updates.

---

## 2. Why Haversine Distance over Paid Geocoding / Road Routing APIs

- **Decision**: Deterministic Great-Circle Haversine distance formula implemented directly in Python.
- **Rationale**: 
  1. Complete offline testability and zero external API dependencies (no Google Maps / Mapbox billing requirements for local evaluation).
  2. Deterministic and reproducible: distance calculations run in sub-millisecond time and are 100% testable in automated CI/CD.
  3. Evaluates straight-line proximity cleanly across candidates.
- **Trade-off**: Straight-line distance does not account for real-time traffic jams or physical barriers (e.g. rivers/bridges). In an enterprise production deployment, this service would be swapped for an OSRM or Google Distance Matrix provider behind the same interface.

---

## 3. Why Pincode-to-Zone Mapping over Polygon Geofencing

- **Decision**: Admin-configurable indexed table mapping 6-digit postal pincodes to operational zones.
- **Rationale**: 
  1. Indian logistics networks (Delhivery, BlueDart, India Post) operate primarily on pincode hubs.
  2. Single-indexed DB lookup is instant ($O(1)$) and avoids point-in-polygon computational overhead and edge-boundary GPS jitter.
- **Trade-off**: Two addresses within the same pincode boundary cannot belong to different zones. For hyper-local food delivery, polygon containment is superior, but for last-mile courier logistics, pincodes are the industry standard.

---

## 4. Why Modular Monolith over Microservices

- **Decision**: Single unified FastAPI backend with clear domain service boundaries (`pricing_engine`, `assignment_engine`, `order_lifecycle`, `zone_service`).
- **Rationale**: 
  1. Avoids distributed transaction overhead, network latency, and service-discovery complexity.
  2. Atomic PostgreSQL transactions can span order creation, history appending, and agent claim in a single step.
  3. Submissions over-engineered with microservices/Kafka/Kubernetes introduce operational fragility without adding any domain correctness.
- **Trade-off**: Services scale together rather than independently; however, for the target scale of this management portal, a modular monolith easily handles tens of thousands of requests per minute on a standard instance.

---

## 5. Why Console Provider Default with Configurable Resend Provider

- **Decision**: `NotificationProvider` interface with automatic fallback to `ConsoleNotificationProvider` when no `RESEND_API_KEY` is set.
- **Rationale**: 
  1. An evaluator must be able to clone and run the application locally in under 2 minutes without needing an active third-party email API key.
  2. Dispatch and delivery event notifications are fully logged and visible in stdout/logs for demonstration.
  3. Production deployments can enable real transactional emails simply by adding the environment variable.
- **Trade-off**: Local demos log notifications to terminal and database audit records rather than requiring third-party credentials to send live emails to arbitrary tester inboxes.

---

## 6. Why Frozen Pricing Snapshots on Orders

- **Decision**: Store computed `base_charge`, `cod_charge`, and `total_charge` directly on the `Order` record, and version `rate_cards`.
- **Rationale**: In real logistics billing, an order booked at ₹320 yesterday must never retroactively change to ₹400 if an administrator updates today's rate cards.
- **Trade-off**: Requires storing 4 extra numeric columns on the order table instead of dynamically querying the rate card table on every read.
