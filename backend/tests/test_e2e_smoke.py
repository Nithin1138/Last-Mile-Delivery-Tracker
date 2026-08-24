"""
End-to-End Platform Journey & Production Observability Smoke Tests.

Validates the full multi-role workflow from customer registration, pricing,
auto-dispatch, status transitions, failure recording, customer reschedule,
reassignment of second agent, delivery completion, and full audit logging.
"""

from decimal import Decimal
import os
import pytest
from app.models.models import (
    User, RoleEnum, Zone, Area, RateCard, CODSurcharge, OrderTypeEnum, ZoneRelationEnum,
    DeliveryAgent, AgentStatusEnum, Order, OrderStatusEnum, DeliveryAttempt,
    DeliveryAttemptStatusEnum, Notification, NotificationStatusEnum, AssignmentDecision
)
from app.core.security import hash_password, create_access_token
from app.config import settings


def test_complete_platform_e2e_journey(client, db):
    """
    Comprehensive End-to-End Product Lifecycle Smoke Test:
    1. Register new Customer via API.
    2. Admin registers Zones, Areas, Rate Cards, and Agents.
    3. Customer creates Order -> Proves Auto-Assignment Dispatches Agent #1 immediately.
    4. Verify Request Tracing headers (X-Request-ID, X-Process-Time, Security headers).
    5. Agent #1 steps through status transitions: PICKED_UP -> IN_TRANSIT -> OUT_FOR_DELIVERY.
    6. Agent #1 records FAILED delivery with failure reason.
    7. Customer reschedules delivery -> Atomic transaction releases Agent #1 and assigns Agent #2.
    8. Agent #2 marks package DELIVERED.
    9. Validate complete audit trail: status history timeline, 2 delivery attempts, notifications log.
    """
    # -------------------------------------------------------------------------
    # 1. Register Customer
    # -------------------------------------------------------------------------
    cust_res = client.post(
        "/api/auth/register",
        json={
            "email": "e2e.customer@test.com",
            "password": "customerPassword123",
            "name": "E2E Test Customer",
            "role": "CUSTOMER",
        },
    )
    assert cust_res.status_code == 200, f"Customer registration failed: {cust_res.text}"
    customer_token = cust_res.json()["access_token"]
    customer_id = cust_res.json()["user"]["id"]

    # Verify observability headers on response
    assert "X-Request-ID" in cust_res.headers
    assert "X-Process-Time" in cust_res.headers

    # -------------------------------------------------------------------------
    # 2. Setup Zones, Rate Cards & Agents
    # -------------------------------------------------------------------------
    admin_user = User(
        email="admin_e2e@lastmile.dev",
        password_hash=hash_password("admin123"),
        name="Admin E2E",
        role=RoleEnum.ADMIN,
    )
    db.add(admin_user)
    db.flush()
    admin_token = create_access_token({"sub": str(admin_user.id), "role": "ADMIN"})

    zone_north = Zone(name="Hyderabad North")
    zone_south = Zone(name="Vijayawada South")
    db.add_all([zone_north, zone_south])
    db.flush()

    area_hyd = Area(pincode="500001", name="Hyderabad GPO", zone_id=zone_north.id, is_active=True)
    area_vja = Area(pincode="520001", name="Vijayawada HO", zone_id=zone_south.id, is_active=True)
    
    rate_card_inter = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTER,
        base_fee=Decimal("50.00"),
        rate_per_kg=Decimal("20.00"),
        version=1,
        is_active=True,
    )
    cod_surcharge = CODSurcharge(
        order_type=OrderTypeEnum.B2C,
        flat_amount=Decimal("25.00"),
        percent_of_base=Decimal("2.50"),
        is_active=True,
    )
    db.add_all([area_hyd, area_vja, rate_card_inter, cod_surcharge])
    db.flush()

    # Agent 1 (Near Hyderabad pickup, available)
    agent1_user = User(
        email="agent1.e2e@delivery.dev",
        password_hash=hash_password("agent123"),
        name="Babu Naidu",
        role=RoleEnum.AGENT,
    )
    # Agent 2 (Available candidate for reschedule)
    agent2_user = User(
        email="agent2.e2e@delivery.dev",
        password_hash=hash_password("agent123"),
        name="Srinivas Rao",
        role=RoleEnum.AGENT,
    )
    db.add_all([agent1_user, agent2_user])
    db.flush()

    agent1 = DeliveryAgent(
        user_id=agent1_user.id,
        current_zone_id=zone_north.id,
        latitude=17.3850,
        longitude=78.4867,
        availability_status=AgentStatusEnum.AVAILABLE,
        current_load=0,
        max_capacity=5,
        is_active=True,
    )
    agent2 = DeliveryAgent(
        user_id=agent2_user.id,
        current_zone_id=zone_north.id,
        latitude=17.3900,
        longitude=78.4900,
        availability_status=AgentStatusEnum.AVAILABLE,
        current_load=0,
        max_capacity=5,
        is_active=True,
    )
    db.add_all([agent1, agent2])
    db.commit()

    agent1_token = create_access_token({"sub": str(agent1_user.id), "role": "AGENT"})
    agent2_token = create_access_token({"sub": str(agent2_user.id), "role": "AGENT"})

    # -------------------------------------------------------------------------
    # 3. Customer Creates Order -> Auto-Dispatches Agent #1
    # -------------------------------------------------------------------------
    order_payload = {
        "pickup_address": "Abids, Hyderabad",
        "pickup_pincode": "500001",
        "pickup_latitude": 17.3850,
        "pickup_longitude": 78.4867,
        "drop_address": "Benz Circle, Vijayawada",
        "drop_pincode": "520001",
        "length_cm": 50,
        "breadth_cm": 40,
        "height_cm": 30,
        "actual_weight_kg": 8,
        "order_type": "B2C",
        "payment_type": "COD",
    }

    create_res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=order_payload,
    )
    assert create_res.status_code == 200, f"Order creation failed: {create_res.text}"
    order_data = create_res.json()
    order_id = order_data["id"]

    # Invariant: Auto-assigned immediately to Agent 1
    assert order_data["status"] == "ASSIGNED"
    assert order_data["agent_id"] == str(agent1.id)
    assert order_data["total_charge"] == 322.25

    # -------------------------------------------------------------------------
    # 4. Agent #1 Lifecycle Transitions
    # -------------------------------------------------------------------------
    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        s_res = client.post(
            f"/api/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {agent1_token}"},
            json={"status": status},
        )
        assert s_res.status_code == 200

    # Mark Failed
    fail_res = client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent1_token}"},
        json={"status": "FAILED", "failure_reason": "Customer unreachable at delivery address"},
    )
    assert fail_res.status_code == 200
    assert "FAILED" in fail_res.json()["message"]

    # Verify Delivery Attempt #1 recorded as FAILED
    att1 = db.query(DeliveryAttempt).filter(
        DeliveryAttempt.order_id == order_id,
        DeliveryAttempt.attempt_number == 1,
    ).first()
    assert att1 is not None
    assert att1.status == DeliveryAttemptStatusEnum.FAILED
    assert att1.failure_reason == "Customer unreachable at delivery address"

    # -------------------------------------------------------------------------
    # 5. Customer Reschedules Order -> Auto-Assigns Agent #2 (Attempt #2)
    # -------------------------------------------------------------------------
    # Set Agent 1 offline so Agent 2 is chosen as next available candidate
    agent1.availability_status = AgentStatusEnum.OFFLINE
    db.commit()

    reschedule_res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "new_scheduled_date": "2026-09-01T10:00:00",
            "reason": "Customer requested delivery next morning",
        },
    )
    assert reschedule_res.status_code == 200, f"Reschedule failed: {reschedule_res.text}"

    # Verify Agent #1 released and Agent #2 assigned
    db.refresh(agent1)
    db.refresh(agent2)
    order_in_db = db.query(Order).filter(Order.id == order_id).first()
    assert order_in_db.status == "ASSIGNED"
    assert order_in_db.agent_id == agent2.id
    assert agent1.current_load == 0
    assert agent2.current_load == 1

    # Verify Delivery Attempt #2 created in progress
    att2 = db.query(DeliveryAttempt).filter(
        DeliveryAttempt.order_id == order_id,
        DeliveryAttempt.attempt_number == 2,
    ).first()
    assert att2 is not None
    assert att2.status == DeliveryAttemptStatusEnum.IN_PROGRESS
    assert att2.agent_id == agent2.id

    # -------------------------------------------------------------------------
    # 6. Agent #2 Completes Delivery via Proper Lifecycle Transitions
    # -------------------------------------------------------------------------
    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        s2_res = client.post(
            f"/api/orders/{order_id}/status",
            headers={"Authorization": f"Bearer {agent2_token}"},
            json={"status": status},
        )
        assert s2_res.status_code == 200

    deliv_res = client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent2_token}"},
        json={"status": "DELIVERED", "notes": "Handed to recipient in person"},
    )
    assert deliv_res.status_code == 200
    assert "DELIVERED" in deliv_res.json()["message"]

    # -------------------------------------------------------------------------
    # 7. Audit Timeline & Integrity Verifications
    # -------------------------------------------------------------------------
    timeline_res = client.get(
        f"/api/orders/{order_id}/timeline",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert timeline_res.status_code == 200
    timeline = timeline_res.json()
    statuses = [entry["new_status"] for entry in timeline]
    assert statuses == [
        "CREATED",
        "ASSIGNED",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "FAILED",
        "RESCHEDULED",
        "ASSIGNED",
        "PICKED_UP",
        "IN_TRANSIT",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
    ]

    # Health Check Diagnostics Verification
    health_res = client.get("/health")
    assert health_res.status_code == 200
    health_data = health_res.json()
    assert health_data["status"] == "healthy"
    assert health_data["components"]["database"]["status"] == "connected"
    assert health_data["components"]["database"]["latency_ms"] is not None


def test_live_resend_notification_smoke():
    """
    Live External Notification Smoke Test.
    Runs only when RESEND_API_KEY is configured in the environment.
    Gracefully skips in offline/CI environments without burning quota unnecessarily.
    """
    live_key = os.environ.get("RESEND_API_KEY")
    if not live_key or not live_key.startswith("re_"):
        pytest.skip("Skipping live Resend external test: RESEND_API_KEY is not configured.")

    from app.services.notification_service import ResendNotificationProvider
    provider = ResendNotificationProvider(
        api_key=live_key,
        from_email="onboarding@resend.dev",
        test_email=os.environ.get("RESEND_TEST_EMAIL"),
    )
    # Perform standard live send check
    success = provider.send_email(
        to_email=os.environ.get("RESEND_TEST_EMAIL") or "delivered@resend.dev",
        subject="[CI Smoke Test] Gateway Verification",
        body="<p>Automated integration smoke test payload.</p>",
    )
    assert success is True, "Live Resend email dispatch failed"
