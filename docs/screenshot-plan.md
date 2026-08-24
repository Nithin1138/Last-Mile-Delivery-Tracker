# Screenshot Plan

Manual instructions for capturing production-quality screenshots for the README and documentation.

---

## General Rules

- **Resolution**: 1440 × 900 or 1440 × 960
- **Theme**: Light theme (default) unless dark theme communicates something specific
- **Browser chrome**: Exclude (no tabs, address bar, or bookmarks visible)
- **Developer tools**: Must be closed
- **Data**: Use seeded demo accounts only. No personal information
- **Empty states**: Avoid screenshots of empty dashboards
- **File format**: PNG
- **Location**: Save all screenshots to `docs/assets/`

---

## Screenshot 1: Customer Pricing Preview

**Filename**: `docs/assets/customer-pricing.png`

| Detail | Value |
|---|---|
| **Login as** | Customer: `alekhya.reddy@gmail.com` / `customer123` |
| **Page** | New Shipment → Order Creation |
| **Data** | Dimensions: 50 × 40 × 30 cm, Actual Weight: 8 kg, Payment: COD |
| **Pincodes** | Pickup: 500081, Drop: 520010 |
| **Action** | Click "Calculate Price" but do NOT confirm yet |
| **What should be visible** | Price breakdown card showing: Volumetric Weight 12 kg, Chargeable Weight 12 kg, Base Charge ₹290, COD Surcharge ₹32.25, Total ₹322.25 |
| **Crop** | Center on the pricing breakdown card and order form |
| **Reference in** | README.md under "Rate Calculation Engine" section |

---

## Screenshot 2: Automatic Assignment Result

**Filename**: `docs/assets/auto-assignment.png`

| Detail | Value |
|---|---|
| **Login as** | Customer: `alekhya.reddy@gmail.com` / `customer123` |
| **Page** | Order Creation → Post-confirmation screen |
| **Action** | Confirm the order from Screenshot 1 |
| **What should be visible** | Assignment confirmation showing: "Courier Assigned: Babu Naidu", distance, and the 3-step milestone (Order Created → Dispatch Engine → Courier Assigned) |
| **Crop** | Center on the assignment confirmation card |
| **Reference in** | README.md under "Engineering Highlights" or "Concurrency-Safe Auto-Assignment" |

> **This is the most important screenshot** — it demonstrates the key differentiator.

---

## Screenshot 3: Admin Operations Dashboard

**Filename**: `docs/assets/admin-dashboard.png`

| Detail | Value |
|---|---|
| **Login as** | Admin: `admin@lastmile.dev` / `admin123` |
| **Page** | Dashboard (default landing page) |
| **Action** | None — capture the dashboard with existing data |
| **What should be visible** | Operational KPI cards (total orders, active, delivered, agents), pipeline status, recent activity stream |
| **Crop** | Full dashboard view, edge-to-edge |
| **Reference in** | README.md or docs/architecture.md |

---

## Screenshot 4: Agent Delivery Dashboard

**Filename**: `docs/assets/agent-dashboard.png`

| Detail | Value |
|---|---|
| **Login as** | Agent: `babu.naidu@delivery.dev` / `agent123` |
| **Page** | Agent dashboard with assigned deliveries |
| **Action** | Ensure at least one delivery is assigned and partially progressed |
| **What should be visible** | Delivery card with status progression buttons (Picked Up → In Transit → Out for Delivery) |
| **Crop** | Center on the delivery card and status controls |
| **Reference in** | docs/demo-guide.md, Flow D |

---

## Screenshot 5: Failed Delivery & Reschedule

**Filename**: `docs/assets/reschedule-flow.png`

| Detail | Value |
|---|---|
| **Login as** | Customer: `alekhya.reddy@gmail.com` / `customer123` |
| **Page** | Order details of a FAILED order, or the post-reschedule confirmation |
| **Action** | After agent marks delivery failed, open the order and capture the RESCHEDULED → new agent assigned state |
| **What should be visible** | Delivery Attempt #1 (FAILED) visible, reschedule action available or completed, Agent #2 assignment |
| **Crop** | Center on the order detail showing both the failure and the new assignment |
| **Reference in** | README.md under "Core Business Flow" |

---

## Screenshot 6: Final Tracking Timeline

**Filename**: `docs/assets/tracking-timeline.png`

| Detail | Value |
|---|---|
| **Login as** | Any role with access to the completed order |
| **Page** | Order detail → Timeline tab |
| **Action** | Open a fully completed order that went through: Attempt #1 FAILED → Attempt #2 DELIVERED |
| **What should be visible** | Complete immutable timeline: CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY → FAILED → RESCHEDULED → ASSIGNED → ... → DELIVERED. Both Delivery Attempts with timestamps |
| **Crop** | Full timeline, scrolled to show key transitions |
| **Reference in** | README.md, docs/demo-guide.md Flow G |

---

## After Capturing

1. Place all screenshots in `docs/assets/`.
2. Add to README.md under a "Product Screenshots" section (3–4 max):
   ```markdown
   ## Product Screenshots

   ![Pricing Preview](docs/assets/customer-pricing.png)
   ![Auto-Assignment](docs/assets/auto-assignment.png)
   ![Admin Dashboard](docs/assets/admin-dashboard.png)
   ![Tracking Timeline](docs/assets/tracking-timeline.png)
   ```
3. Commit and push.
