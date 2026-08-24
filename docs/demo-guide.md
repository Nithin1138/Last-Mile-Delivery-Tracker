# Evaluator Demo Guide

A step-by-step 5-minute walkthrough of the LastMile Flow platform. Each step specifies the action, expected result, and what it demonstrates.

**Frontend**: [https://lastmileflow.vercel.app/](https://lastmileflow.vercel.app/)  
**Swagger**: [https://lastmile-backend-f1ma.onrender.com/docs](https://lastmile-backend-f1ma.onrender.com/docs)

> **Note**: The Render free-tier backend may take 30–60 seconds to wake on first request. If the login spinner hangs, wait briefly and retry.

---

## Preparation

1. Open the frontend URL in your browser.
2. Optionally open the Swagger docs in a second tab for API inspection.

---

## Flow A: Customer Order Creation & Pricing

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 1 | Login as **Customer**: `alekhya.reddy@gmail.com` / `customer123` | Customer dashboard loads with order history | JWT authentication, RBAC |
| 2 | Click **"New Shipment"** | Order creation form appears with route preset options | Customer-facing UI |
| 3 | Enter dimensions: `50 × 40 × 30 cm`, Weight: `8 kg`, Payment: `COD` | — | Order input schema |
| 4 | Select pickup pincode `500081` (Madhapur) and drop pincode `520010` (Vijayawada) | — | Zone resolution |
| 5 | Click **"Calculate Price"** | Price breakdown shows: Volumetric 12 kg, Chargeable 12 kg, Base ₹290, COD ₹32.25, Total ₹322.25 | Database-driven pricing engine |
| 6 | Click **"Confirm & Place Order"** | Order confirmed, assignment result displayed | Server-side price freeze |

---

## Flow B: Automatic Nearest-Agent Assignment

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 7 | Observe the post-creation confirmation screen | Shows "Courier Assigned: Babu Naidu" with distance and assignment details | Haversine auto-dispatch |
| 8 | Note: No admin action was required | Assignment happened automatically after order commit | Automatic assignment on creation |

---

## Flow C: Admin Inspection

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 9 | Login as **Admin**: `admin@lastmile.dev` / `admin123` | Admin dashboard loads with operational metrics | Admin RBAC |
| 10 | Navigate to **"Shipments"** tab | Order list shows the new order as ASSIGNED to Babu Naidu | Role-scoped data |
| 11 | Click the order row to open details | Assignment audit visible: candidate list, Haversine distances, dispatch decision | Explainable assignment |
| 12 | Note the **"Auto-Assign"** and **"Manual Assign"** buttons | Available as fallback or override | Admin dispatch control |

---

## Flow D: Agent Delivery Lifecycle

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 13 | Login as **Agent**: `babu.naidu@delivery.dev` / `agent123` | Agent dashboard shows assigned delivery | Agent RBAC |
| 14 | Click **"Picked Up"** | Order transitions to PICKED_UP | State machine |
| 15 | Click **"In Transit"** | Order transitions to IN_TRANSIT | State machine |
| 16 | Click **"Out for Delivery"** | Order transitions to OUT_FOR_DELIVERY | State machine |
| 17 | Click **"Mark Delivery Failed"** → Select reason: "Customer unreachable after 3 attempts" | Order transitions to FAILED, Delivery Attempt #1 closed | Failed delivery capture |

---

## Flow E: Customer Reschedule & Automatic Reassignment

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 18 | Login as **Customer**: `alekhya.reddy@gmail.com` / `customer123` | Dashboard shows order as FAILED | Customer view of failed delivery |
| 19 | Open order details | Delivery Attempt #1 visible as FAILED with reason | Attempt history |
| 20 | Click **"Reschedule Delivery"** → Select new date | Order transitions: FAILED → RESCHEDULED → ASSIGNED | Atomic reschedule + reassignment |
| 21 | Observe new assignment | Agent #2 assigned (e.g., Srinivas Rao or Kalyan Varma), Delivery Attempt #2 created | Capacity release + re-dispatch |

---

## Flow F: Second Delivery Attempt

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 22 | Login as the newly assigned **Agent** | Dashboard shows the rescheduled delivery | Agent sees reassigned order |
| 23 | Progress through: Picked Up → In Transit → Out for Delivery → **Delivered** | Order reaches DELIVERED status | Complete lifecycle |

---

## Flow G: Final Timeline Inspection

| Step | Action | Expected Result | Demonstrates |
|---|---|---|---|
| 24 | Open the completed order's details (any role) | Full immutable timeline visible | Audit trail |
| 25 | Verify timeline shows all transitions: CREATED → ASSIGNED → PICKED_UP → ... → FAILED → RESCHEDULED → ASSIGNED → ... → DELIVERED | Complete history preserved | Append-only history |
| 26 | Verify both Delivery Attempts visible: Attempt #1 (FAILED) and Attempt #2 (DELIVERED) | Both attempts with timestamps and agent names | Delivery attempt tracking |
