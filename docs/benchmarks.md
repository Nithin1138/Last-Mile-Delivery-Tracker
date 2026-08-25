# ⚡ System Performance & Scalability Benchmark Report

This document presents empirical performance, latency percentiles (`p50`, `p95`, `p99`), database query counts, and concurrency collision benchmarks for the **Last-Mile Delivery Tracker** platform across both **Local High-Performance Execution** and **Live Cloud Production Execution**.

> **Testing Environments**:
> 1. **Local In-Process Benchmark**:
>    - **OS / Hardware**: macOS (Apple Silicon ARM64)
>    - **Runtime**: Python 3.12 (FastAPI ASGI) + PostgreSQL 16
>    - **Database**: Local PostgreSQL instance with active triggers and ACID transaction safety
> 2. **Production Cloud Benchmark**:
>    - **Hosting**: Render Cloud Web Service (`https://lastmile-backend-f1ma.onrender.com`)
>    - **Protocol**: Public Internet HTTPS/TLS with HTTP Keep-Alive connection pooling
>    - **Client**: Authenticated customer session (`alekhya.reddy@gmail.com`)
>    - **Harness**: [`scripts/run_benchmarks.py`](../scripts/run_benchmarks.py)

---

## 1. Dispatch Assignment Engine at Scale (Local CPU / In-Memory)

Measures candidate agent discovery, zone affinity filtering, and Great-Circle Haversine proximity ranking across increasing agent pool sizes.

| Agent Pool Size | DB Queries | Mean Latency | p50 (Median) | p95 Latency | p99 Latency | Max Latency |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **10 Agents** | **1 query** | `0.327 ms` | **`0.303 ms`** | `0.368 ms` | `1.388 ms` | `1.520 ms` |
| **100 Agents** | **1 query** | `0.753 ms` | **`0.731 ms`** | `0.837 ms` | `1.358 ms` | `1.610 ms` |
| **1,000 Agents** | **1 query** | `7.442 ms` | **`7.387 ms`** | `15.605 ms` | `16.981 ms` | `18.250 ms` |

### Key Architectural Insights:
1. **Constant Database Query Count:** Candidate discovery executes exactly one indexed database query across the tested 10–1,000 agent pools (`WHERE is_active = true AND availability_status = 'AVAILABLE' AND current_load < max_capacity`). Candidate ranking is subsequently performed in memory.
2. **Sub-Millisecond Candidate Ranking:** The in-memory 3-tier ranking strategy handles 100 active candidates in under 1 ms in the tested environment. At 1,000 agents, the measured mean ranking/discovery latency was 7.442 ms.

---

## 2. High-Concurrency & Atomic Collision Stress Test

Evaluates race-condition safety and collision resolution when **50 simultaneous worker threads** attempt to claim assignments concurrently against an agent pool with **10 agents (20 total capacity slots)**.

```
[50 Concurrent Dispatch Requests]
               │
               ▼
   [Atomic Conditional Claim]
   UPDATE delivery_agents
   SET availability_status = 'BUSY', current_load = current_load + 1
   WHERE id = :agent_id AND availability_status = 'AVAILABLE' AND current_load < max_capacity;
               │
               ├───────────────────────────────────────────┐
               ▼                                           ▼
      [Rowcount == 1: SUCCESS]                    [Rowcount == 0: COLLISION]
      Order ASSIGNED to Candidate #1              Step to Candidate #2 in Ranked List
```

### Empirical Concurrency Metrics:
- **Total Concurrent Requests**: 50 orders
- **Total Processing Time**: `148.32 ms` (All 50 orders resolved concurrently)
- **Successful Order Dispatches**: **20 / 20 orders** (100% capacity utilization)
- **Graceful Unassigned Orders**: **30 orders** (Left in `CREATED` status when all 20 agent capacity slots filled)
- **Oversubscription Violations**: **0 agents** (Zero capacity breaches; zero race conditions)
- **Data Invariant Integrity**: **100%** (CHECK constraints and atomic SQL locks completely prevented phantom double-booking)

---

## 3. Pricing Engine Throughput & Latency (Local Execution)

Measures deterministic rate calculation (volumetric weight resolution, active rate-card lookup, zone relation matching, and COD surcharge calculation).

| Workload | Total Time | Throughput | Mean Latency | p50 | p95 | p99 |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **1,000 Sequential Quotes** | `812 ms` | **1,231 quotes/sec** | `0.78 ms` | **`0.72 ms`** | `1.12 ms` | `1.85 ms` |
| **10,000 Sequential Quotes** | `7,410 ms` | **1,349 quotes/sec** | `0.74 ms` | **`0.68 ms`** | `1.05 ms` | `1.45 ms` |
| **100 Concurrent Requests** | `92 ms` | **1,086 req/sec** | `0.85 ms` | **`0.80 ms`** | `1.42 ms` | `2.10 ms` |

### Key Findings:
- Pure `Decimal` calculations combined with indexed rate-card queries achieved **>1,200 quotes/sec in the tested local environment**.
- All monetary calculations use Python `Decimal` with explicit `ROUND_HALF_UP` rounding, avoiding binary floating-point representation errors.

---

## 4. Local FastAPI In-Process API Latency Distribution

Measures full HTTP request-response round-trips through FastAPI ASGI, JWT authentication, Pydantic schema validation, and PostgreSQL transaction commits.

| Endpoint | Method | Scope | p50 (Median) | p95 | p99 | Mean |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| `/api/orders/quote` | `POST` | Pincode $\to$ Zone lookup + Dynamic price resolution | **`2.69 ms`** | `4.56 ms` | `14.77 ms` | `3.04 ms` |
| `/api/orders` | `POST` | Full workflow: Rate calculation + DB insert + Auto-dispatch + Immutable history | **`14.65 ms`** | `16.18 ms` | `22.01 ms` | `14.67 ms` |
| `/api/orders/{id}/timeline` | `GET` | Fetch append-only audit trail and status transition history | **`2.46 ms`** | `2.64 ms` | `3.95 ms` | `2.47 ms` |

---

## 5. Live Production Cloud API (Render over Public HTTPS)

Measures real-world production performance over the public internet connecting to the live Render deployment (`https://lastmile-backend-f1ma.onrender.com`) using persistent connection pooling (HTTP Keep-Alive).

### Latency Distributions:
| Endpoint & Operation | Samples | p50 (Median) | p95 Latency | p99 Latency | Mean Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`POST /api/orders/quote`** <br> *(Price Calculation)* | 50 | **`283.8 ms`** | `438.2 ms` | `563.4 ms` | `317.0 ms` |
| **`POST /api/orders`** <br> *(Full Cloud Lifecycle + Auto-Dispatch)* | 15 | **`594.1 ms`** | `887.2 ms` | `887.2 ms` | `604.5 ms` |
| **`GET /api/orders/{id}/timeline`** <br> *(Cloud Audit Trail Query)* | 50 | **`304.2 ms`** | `400.2 ms` | `412.3 ms` | `303.2 ms` |
| **20 Concurrent Cloud Requests** <br> *(Simultaneous HTTPS Traffic)* | 20 | **`726.4 ms`** | `927.6 ms` | `927.6 ms` | `685.6 ms` |

### Reliability & Error Rates:
| Test / Endpoint | Samples | Successful | Failed | Error Rate |
| :--- | :---: | :---: | :---: | :---: |
| **Price Quote** (`POST /quote`) | 50 | 50 | 0 | **0.0%** |
| **Order Creation** (`POST /orders`) | 15 | 15 | 0 | **0.0%** |
| **Timeline Query** (`GET /timeline`) | 50 | 50 | 0 | **0.0%** |
| **20 Concurrent Quotes** | 20 | 20 | 0 | **0.0%** |

---

## 6. Performance Comparison Summary (Local vs. Cloud)

| Operation | Local p50 | Cloud p50 |
| :--- | :---: | :---: |
| **Price Quote** (`POST /quote`) | **`2.69 ms`** | **`283.8 ms`** *(End-to-end HTTPS)* |
| **Order Creation** (`POST /orders`) | **`14.65 ms`** | **`594.1 ms`** *(End-to-end HTTPS)* |
| **Timeline Query** (`GET /timeline`) | **`2.46 ms`** | **`304.2 ms`** *(End-to-end HTTPS)* |
| **Candidate Ranking, 100 agents** | **`0.731 ms`** | N/A |
| **Pricing Throughput, 10k operations** | **`1,349 quotes/sec`** | Not measured |

> **Local measurements isolate application/database execution in a controlled environment. Cloud measurements represent end-to-end HTTPS latency against the deployed Render service and include network, deployment, connection, and server-side processing overhead.**

---

## 7. Benchmark Scope & Limitations

> These measurements represent empirical observations from the specified local and deployed environments and are not production SLO guarantees. Local benchmarks isolate application and database execution, while cloud benchmarks measure end-to-end HTTPS request latency. The production benchmark uses relatively small sample sizes, particularly for order creation, so the reported percentiles should be interpreted as observed sample statistics rather than statistically stable long-term production percentiles. The benchmarks do not evaluate horizontal scaling, multi-instance deployments, geographically distributed clients, or sustained high-volume production traffic.

---

## 8. Reproduction

```bash
# Run both local and live cloud benchmarks
python3 scripts/run_benchmarks.py
```

The harness records request latency, percentile distributions, throughput, database query counts and concurrency outcomes for the supported benchmark scenarios.
