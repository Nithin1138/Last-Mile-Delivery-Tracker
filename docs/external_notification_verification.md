# External Notification Provider Verification Notes

This document records the intended live-verification path for the notification layer without overstating provider delivery guarantees.

**Date**: 2026-08-24  
**Provider**: Resend API (optional transactional email gateway)  
**Verification Goal**: Confirm that the provider integration path is reachable and correctly wired, while keeping automated tests independent from external quota limits.  

---

## 1. Operational Reality

The repository is designed to be robust when live email delivery is unavailable. The automated test suite intentionally disables external provider calls by default and instead uses the Console provider / audited database fallback path. This prevents quota exhaustion and ensures deterministic CI behavior.

### Provider Configuration
- **Adapter Class**: `ResendNotificationProvider` ([`backend/app/services/notification_service.py`](file:///Users/nithin/Desktop/Unthinkable-Last-Mile%20Delivery/backend/app/services/notification_service.py))
- **Gateway Endpoint**: `https://api.resend.com/emails` (via the official `resend` Python SDK)
- **Sender Address**: `onboarding@resend.dev`
- **Environment Dependency**: `RESEND_API_KEY` and a valid provider quota / inbox allowance are required for actual outbound delivery.

### What this means in practice
- **Connectivity checks are valid** when the provider accepts the request.
- **Mailbox delivery is not guaranteed** under trial limits, quota exhaustion, or provider-side restrictions.
- **Automated pass/fail does not depend on external provider delivery**. The code path is validated in tests via the non-blocking notification abstraction and persisted audit records.

---

## 2. Notification System Architecture & Reliability

```
┌────────────────────────────────────────────────────────┐
│                   Order Lifecycle Event                │
│    (Created / Assigned / Picked Up / Failed / etc.)    │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Notification Provider Factory              │
│            get_notification_provider()                 │
└─────────────┬────────────────────────────┬─────────────┘
              │ (If RESEND_API_KEY set)    │ (Fallback / CI / Tests)
              ▼                            ▼
┌───────────────────────────┐ ┌───────────────────────────┐
│ ResendNotificationProvider│ │ConsoleNotificationProvider│
│  - HTML Email Builder     │ │  - Structured Stdout Log  │
│  - Live API Dispatch      │ │  - Zero External Quota    │
│  - Test Email Routing     │ │  - Safe Offline CI        │
└─────────────┬─────────────┘ └────────────┬──────────────┘
              │                            │
              └─────────────┬──────────────┘
                            ▼
┌────────────────────────────────────────────────────────┐
│         PostgreSQL `notifications` Table               │
│  - Append-Only Audit Logging                           │
│  - Status Tracking (SENT / FAILED)                     │
│  - Error Capture without Transaction Rollback          │
└────────────────────────────────────────────────────────┘
```

### Key Reliability Invariants:
1. **Transaction Safety**: Third-party API failures (timeouts, network hiccups, rate limits) are caught in isolated exception blocks. The core business transaction (Order Creation, State Transition, Reschedule) is never rolled back.
2. **Quota Protection during CI/Pytest**: `conftest.py` strictly forces `settings.RESEND_API_KEY = None` during automated test runs, ensuring no external API dependency and deterministic execution while still validating audit-table behavior.
3. **Optional Live Verification**: If a valid live provider key and quota are available, a manual provider smoke test can be run. That path is operationally helpful, but it is intentionally not the automated correctness gate for the project.
