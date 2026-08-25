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
1. **$O(1)$ Database Query Complexity**: Regardless of whether the agent pool contains 10 or 1,000 agents, the discovery engine executes **exactly 1 single indexed database query** (`WHERE is_active = true AND availability_status = 'AVAILABLE' AND current_load < max_capacity`).
2. **Sub-Millisecond Candidate Sorting**: In-memory 3-tier candidate ranking (Haversine distance $\to$ zone match $\to$ load balance) handles 100 active candidates in **$< 1 \text{ ms}$**, eliminating any need for distributed batch workers at standard city fleet scale.

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
- Pure decimal mathematical calculations combined with indexed rate-card queries achieve **$> 1,200 \text{ quotes/sec}$** on a single core.
- Zero floating-point drift: All pricing uses Python `Decimal` with `ROUND_HALF_UP` banking precision.

---

## 4. Local FastAPI In-Process API Latency Distribution

Measures full HTTP request-response round-trips through FastAPI ASGI, JWT authentication, Pydantic schema validation, and PostgreSQL transaction commits.

| Endpoint | Method | Scope | p50 (Median) | p95 | p99 | Mean |
| :--- | :---: | :--- | :---: | :---: | :---: | :---: |
| `/api/orders/quote` | `POST` | Pincode $\to$ Zone lookup + Dynamic price resolution | **`2.77 ms`** | `4.64 ms` | `15.21 ms` | `3.15 ms` |
| `/api/orders` | `POST` | Full workflow: Rate calculation + DB insert + Auto-dispatch + Immutable history | **`13.36 ms`** | `15.24 ms` | `22.29 ms` | `13.62 ms` |
| `/api/orders/{id}/timeline` | `GET` | Fetch append-only audit trail and status transition history | **`2.50 ms`** | `3.01 ms` | `4.06 ms` | `2.49 ms` |

---

## 5. Live Production Cloud API (Render over Public HTTPS)

Measures real-world production performance over the public internet connecting to the live Render deployment (`https://lastmile-backend-f1ma.onrender.com`) using persistent connection pooling (HTTP Keep-Alive).

| Endpoint & Operation | Samples | p50 (Median) | p95 Latency | p99 Latency | Mean Latency |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`POST /api/orders/quote`** <br> *(Instant Price Calculation)* | 50 | **`294.5 ms`** | `489.2 ms` | `555.6 ms` | `316.3 ms` |
| **`POST /api/orders`** <br> *(Full Cloud Lifecycle + Auto-Dispatch)* | 15 | **`611.9 ms`** | `815.5 ms` | `815.5 ms` | `623.3 ms` |
| **`GET /api/orders/{id}/timeline`** <br> *(Cloud Audit Trail Query)* | 50 | **`312.8 ms`** | `411.8 ms` | `450.1 ms` | `325.6 ms` |
| **20 Concurrent Cloud Requests** <br> *(Simultaneous HTTPS Traffic)* | 20 | **`581.5 ms`** | `942.0 ms` | `942.0 ms` | `639.4 ms` |

---

## 6. Performance Comparison Summary (Local vs. Cloud)

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               LATENCY COMPARISON SUMMARY                              │
├────────────────────────────────┬──────────────────────────┬────────────────────────────┤
│ Operation                      │ Local In-Process (Core)  │ Live Cloud (Public HTTPS)  │
├────────────────────────────────┼──────────────────────────┼────────────────────────────┤
│ Price Quote (POST /quote)      │ 2.77 ms                  │ 294.5 ms (Network bounded) │
│ Order Creation (POST /orders)  │ 13.36 ms                 │ 611.9 ms (ACID + Network)  │
│ Timeline Query (GET /timeline) │ 2.50 ms                  │ 312.8 ms (Network bounded) │
│ Candidate Ranking (100 agents) │ 0.73 ms                  │ Sub-millisecond CPU math   │
│ Pricing Throughput (10k ops)   │ 1,349 quotes/sec         │ High-throughput scalable   │
└────────────────────────────────┴──────────────────────────┴────────────────────────────┘
```

---

## 7. How to Reproduce Locally & Against Production

The unified benchmark harness is executable with a single command:

```bash
# Run both Local In-Process and Live Cloud Production benchmarks
python3 scripts/run_benchmarks.py
```
