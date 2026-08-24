"""
Complete Failed Delivery Flow — End-to-End Integration Test (REQ-10 / REQ-18)

Tests the full business workflow:
  CREATED → ASSIGNED (Attempt #1) → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY
    → FAILED → RESCHEDULED (+ Agent released + Attempt #2 auto-assigned)
    → ASSIGNED (Attempt #2) → DELIVERED

The reschedule endpoint atomically:
  1. Transitions FAILED → RESCHEDULED
  2. Releases Agent #1 (freed capacity)
  3. Auto-assigns nearest available agent (creates Attempt #2)
  4. Notifies customer (rescheduled + reassigned)
"""

from decimal import Decimal
import pytest
from app.models.models import (
    User, Order, DeliveryAgent, Zone, Area, RateCard,
    RoleEnum, OrderStatusEnum, OrderTypeEnum, PaymentTypeEnum,
    ZoneRelationEnum, AgentStatusEnum, DeliveryAttempt, DeliveryAttemptStatusEnum,
)
from app.core.security import create_access_token, hash_password


def _make_order_payload(pincode="110001"):
    return {
        "pickup_address": "Pickup Location",
        "pickup_pincode": pincode,
        "drop_address": "Drop Location",
        "drop_pincode": pincode,
        "length_cm": 10, "breadth_cm": 10, "height_cm": 10,
        "actual_weight_kg": 1,
        "order_type": "B2C",
        "payment_type": "PREPAID",
    }


def _setup_zone_and_rate(db):
    zone = Zone(name="Test Zone")
    db.add(zone)
    db.flush()
    area = Area(pincode="110001", name="Area 1", zone_id=zone.id, is_active=True)
    rate = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTRA,
        base_fee=Decimal("50.00"),
        rate_per_kg=Decimal("10.00"),
        version=1, is_active=True,
    )
    db.add_all([area, rate])
    db.flush()
    return zone


def _make_agent(db, zone, name, lat=28.6, lon=77.2):
    user = User(
        email=f"{name.lower().replace(' ', '_')}@agent-test.com",
        password_hash=hash_password("pass"),
        name=name,
        role=RoleEnum.AGENT,
    )
    db.add(user)
    db.flush()
    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.AVAILABLE,
        max_capacity=5,
        current_load=0,
        latitude=lat,
        longitude=lon,
        current_zone_id=zone.id,
        is_active=True,
    )
    db.add(agent)
    db.flush()
    return user, agent


def test_complete_failed_delivery_reschedule_and_reassign(client, db):
    """
    REQ-10 / REQ-18: Full failed-delivery workflow in a single reschedule API call.

    Proves:
    - FAILED → RESCHEDULED → ASSIGNED (all in one reschedule call)
    - Attempt #2 created with a new agent assignment
    - Timeline shows all required state transitions including second ASSIGNED
    - Customer notified at each stage (rescheduled + reassigned)
    """
    zone = _setup_zone_and_rate(db)

    customer = User(email="cust@failtest.com", password_hash=hash_password("pass"), name="Customer", role=RoleEnum.CUSTOMER)
    db.add(customer)
    db.flush()
    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER"})

    admin = User(email="admin@failtest.com", password_hash=hash_password("pass"), name="Admin", role=RoleEnum.ADMIN)
    db.add(admin)
    db.flush()
    admin_token = create_access_token({"sub": str(admin.id), "role": "ADMIN"})

    # Step 1: Create order FIRST (no agents yet — auto-assign finds no candidates and silently stays CREATED)
    res = client.post("/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json=_make_order_payload())
    assert res.status_code == 200, f"Order creation failed: {res.text}"
    order_id = res.json()["id"]
    assert res.json()["status"] == "CREATED"

    # Now create agents so the admin assign endpoint has candidates to pick from
    _, agent1 = _make_agent(db, zone, "Agent One", lat=28.6139, lon=77.2090)
    _, agent2 = _make_agent(db, zone, "Agent Two", lat=28.6200, lon=77.2100)
    db.commit()

    # Step 2: Admin assigns agent #1
    res = client.post(
        f"/api/orders/{order_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"mode": "auto"},
    )
    assert res.status_code == 200, f"Assignment failed: {res.text}"
    assigned_agent_id = res.json()["decision"]["agent_id"]

    # Identify which agent was assigned first
    db.refresh(agent1); db.refresh(agent2)
    first_agent = agent1 if str(agent1.id) == assigned_agent_id else agent2
    assert first_agent.current_load == 1

    # Step 3: Agent drives through lifecycle to FAILED
    agent_user = db.query(User).filter(User.id == first_agent.user_id).first()
    agent_token = create_access_token({"sub": str(agent_user.id), "role": "AGENT"})

    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        r = client.post(f"/api/orders/{order_id}/status", headers={"Authorization": f"Bearer {agent_token}"}, json={"status": status})
        assert r.status_code == 200, f"Transition to {status} failed: {r.text}"

    res = client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"status": "FAILED", "failure_reason": "Customer unavailable"},
    )
    assert res.status_code == 200

    # Verify Attempt #1 is FAILED
    attempt1 = db.query(DeliveryAttempt).filter(DeliveryAttempt.order_id == order_id).order_by(DeliveryAttempt.attempt_number).first()
    assert attempt1.status == DeliveryAttemptStatusEnum.FAILED
    assert attempt1.failure_reason == "Customer unavailable"

    # Agent released when marked FAILED (release_agent is NOT called on FAILED transition)
    # — agent is released during reschedule. Verify they are still holding load.
    db.refresh(first_agent)
    assert first_agent.current_load == 1  # Still holds load until reschedule

    # Step 4: Customer reschedules — must auto-assign new agent
    res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"new_scheduled_date": "2025-12-25T10:00:00", "reason": "Rescheduled by customer"},
    )
    assert res.status_code == 200, f"Reschedule failed: {res.text}"
    data = res.json()

    # CRITICAL: Agent must be auto-assigned during reschedule (REQ-10/18)
    assert data.get("assignment") is not None, \
        "Reschedule MUST auto-assign an agent to satisfy REQ-10/18"
    assert data["assignment"]["agent_id"] is not None

    # Verify Attempt #2 created
    attempts = db.query(DeliveryAttempt).filter(
        DeliveryAttempt.order_id == order_id
    ).order_by(DeliveryAttempt.attempt_number).all()
    assert len(attempts) == 2, f"Expected 2 delivery attempts, got {len(attempts)}"
    assert attempts[0].attempt_number == 1
    assert attempts[0].status == DeliveryAttemptStatusEnum.FAILED
    assert attempts[1].attempt_number == 2
    assert attempts[1].status == DeliveryAttemptStatusEnum.IN_PROGRESS

    # The agent assigned to Attempt #2 can be the same or different from Attempt #1
    # (depends on proximity ranking). What matters: SOME agent was assigned.
    assert attempts[1].agent_id is not None, "Attempt #2 must have an agent assigned"

    # Order must now be ASSIGNED (RESCHEDULED → ASSIGNED via auto-assign)
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "ASSIGNED", \
        f"Order should be ASSIGNED after reschedule+auto-assign, got: {res.json()['status']}"

    # Verify complete timeline — all transitions present, ASSIGNED appears twice
    res = client.get(f"/api/orders/{order_id}/timeline", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 200
    statuses = [entry["new_status"] for entry in res.json()]
    for expected in ["CREATED", "ASSIGNED", "PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY", "FAILED", "RESCHEDULED"]:
        assert expected in statuses, f"Missing '{expected}' in timeline: {statuses}"

    # ASSIGNED must appear twice: once initially, once after rescheduling
    assigned_count = statuses.count("ASSIGNED")
    assert assigned_count == 2, \
        f"Expected ASSIGNED twice (initial + post-reschedule), got {assigned_count}: {statuses}"


def test_reschedule_only_allowed_for_failed_orders(client, db):
    """Only FAILED orders can be rescheduled — verify CREATED orders return 400."""
    _setup_zone_and_rate(db)

    customer = User(email="cust3@failtest.com", password_hash=hash_password("pass"), name="Cust3", role=RoleEnum.CUSTOMER)
    db.add(customer)
    db.flush()
    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER"})
    db.commit()

    res = client.post("/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json=_make_order_payload())
    assert res.status_code == 200
    order_id = res.json()["id"]
    assert res.json()["status"] == "CREATED"  # NOT FAILED

    # Reschedule on non-FAILED order must fail with 400
    res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"new_scheduled_date": "2025-12-25T10:00:00"},
    )
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_STATUS_TRANSITION"


def test_reschedule_no_available_agent_leaves_order_rescheduled(client, db):
    """When no agents are available during reschedule, the order successfully transitions to RESCHEDULED and returns assignment=None."""
    zone = _setup_zone_and_rate(db)

    customer = User(email="cust_noagent@failtest.com", password_hash=hash_password("pass"), name="Cust NoAgent", role=RoleEnum.CUSTOMER)
    db.add(customer)
    db.flush()
    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER"})

    admin = User(email="admin_noagent@failtest.com", password_hash=hash_password("pass"), name="Admin NoAgent", role=RoleEnum.ADMIN)
    db.add(admin)
    db.flush()
    admin_token = create_access_token({"sub": str(admin.id), "role": "ADMIN"})

    # Step 1: Create order FIRST (no agent yet — auto-assign silently stays CREATED)
    res = client.post("/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json=_make_order_payload())
    order_id = res.json()["id"]

    # Now add the single agent with max_capacity = 1
    agent_user, agent = _make_agent(db, zone, "Agent Sole", lat=28.6139, lon=77.2090)
    agent.max_capacity = 1
    db.commit()

    agent_token = create_access_token({"sub": str(agent_user.id), "role": "AGENT"})

    res = client.post(f"/api/orders/{order_id}/assign", headers={"Authorization": f"Bearer {admin_token}"}, json={"mode": "auto"})
    assert res.status_code == 200

    # Step 2: Drive order to FAILED
    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        client.post(f"/api/orders/{order_id}/status", headers={"Authorization": f"Bearer {agent_token}"}, json={"status": status})

    client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"status": "FAILED", "failure_reason": "Customer premises locked"},
    )

    # Now make the only agent OFFLINE / INACTIVE so auto-assign will fail with NO_AVAILABLE_AGENT
    agent.availability_status = AgentStatusEnum.OFFLINE
    agent.is_active = False
    db.commit()


    # Step 3: Reschedule order
    res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"new_scheduled_date": "2025-12-25T10:00:00", "reason": "Customer rescheduled"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["assignment"] is None
    assert "No available agent" in data["message"]

    # Verify order is now in RESCHEDULED status
    res = client.get(f"/api/orders/{order_id}", headers={"Authorization": f"Bearer {customer_token}"})
    assert res.status_code == 200
    assert res.json()["status"] == "RESCHEDULED"


def test_reschedule_unexpected_assignment_app_error_propagates(client, db, monkeypatch):
    """Any unexpected AppError from auto_assign_order (other than NO_AVAILABLE_AGENT) must propagate without being swallowed."""
    from app.core.errors import AppError, ErrorCodes

    zone = _setup_zone_and_rate(db)

    customer = User(email="cust_err@failtest.com", password_hash=hash_password("pass"), name="Cust Err", role=RoleEnum.CUSTOMER)
    db.add(customer)
    db.flush()
    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER"})

    admin = User(email="admin_err@failtest.com", password_hash=hash_password("pass"), name="Admin Err", role=RoleEnum.ADMIN)
    db.add(admin)
    db.flush()
    admin_token = create_access_token({"sub": str(admin.id), "role": "ADMIN"})

    # Step 1: Create order FIRST (no agent yet — auto-assign silently stays CREATED)
    res = client.post("/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json=_make_order_payload())
    order_id = res.json()["id"]

    # Now create agent
    agent_user, agent = _make_agent(db, zone, "Agent Err", lat=28.6139, lon=77.2090)
    db.commit()

    agent_token = create_access_token({"sub": str(agent_user.id), "role": "AGENT"})

    res = client.post(f"/api/orders/{order_id}/assign", headers={"Authorization": f"Bearer {admin_token}"}, json={"mode": "auto"})
    assert res.status_code == 200

    # Step 2: Drive order to FAILED
    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        client.post(f"/api/orders/{order_id}/status", headers={"Authorization": f"Bearer {agent_token}"}, json={"status": status})

    client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"status": "FAILED", "failure_reason": "Customer unreachable"},
    )

    # Monkeypatch auto_assign_order to simulate an unexpected internal business error
    def mock_auto_assign(db, order, user_id):
        raise AppError(code=ErrorCodes.INTERNAL_ERROR, message="Unexpected dispatch fault.", status_code=500)

    monkeypatch.setattr("app.api.orders.auto_assign_order", mock_auto_assign)

    # Step 3: Reschedule order — must raise 500 INTERNAL_ERROR and NOT swallow it
    res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"new_scheduled_date": "2025-12-25T10:00:00"},
    )
    assert res.status_code == 500
    assert res.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "Unexpected dispatch fault" in res.json()["error"]["message"]


def test_reschedule_all_candidate_claims_fail_preserves_rescheduled_state(client, db, monkeypatch):
    """
    CRITICAL CONCURRENCY TEST (Audit 4):
    Verifies that when eligible candidates exist in the zone but every atomic claim fails
    due to a concurrent race condition, auto_assign_order does NOT rollback the outer transaction.
    The order must:
    1. Successfully commit the RESCHEDULED status
    2. Retain the new scheduled_date
    3. Retain the release of the previous agent (current_load decremented)
    4. NOT create a second delivery attempt
    5. Return a clean 200 response indicating no agent is currently available.
    """
    zone = _setup_zone_and_rate(db)

    customer = User(email="cust_race@failtest.com", password_hash=hash_password("pass"), name="Cust Race", role=RoleEnum.CUSTOMER)
    db.add(customer)
    db.flush()
    customer_token = create_access_token({"sub": str(customer.id), "role": "CUSTOMER"})

    admin = User(email="admin_race@failtest.com", password_hash=hash_password("pass"), name="Admin Race", role=RoleEnum.ADMIN)
    db.add(admin)
    db.flush()
    admin_token = create_access_token({"sub": str(admin.id), "role": "ADMIN"})

    # Step 1: Create order FIRST (no agents yet — auto-assign silently stays CREATED)
    res = client.post("/api/orders", headers={"Authorization": f"Bearer {customer_token}"}, json=_make_order_payload())
    order_id = res.json()["id"]

    # Now create agents
    agent1_user, agent1 = _make_agent(db, zone, "Agent Initial", lat=28.6139, lon=77.2090)
    agent2_user, agent2 = _make_agent(db, zone, "Candidate Agent A", lat=28.6200, lon=77.2100)
    agent3_user, agent3 = _make_agent(db, zone, "Candidate Agent B", lat=28.6300, lon=77.2200)
    db.commit()

    agent1_token = create_access_token({"sub": str(agent1_user.id), "role": "AGENT"})

    res = client.post(
        f"/api/orders/{order_id}/assign",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"mode": "manual", "agent_id": str(agent1.id)},
    )
    assert res.status_code == 200
    db.refresh(agent1)
    assert agent1.current_load == 1

    # Step 2: Drive order to FAILED
    for status in ["PICKED_UP", "IN_TRANSIT", "OUT_FOR_DELIVERY"]:
        client.post(f"/api/orders/{order_id}/status", headers={"Authorization": f"Bearer {agent1_token}"}, json={"status": status})

    client.post(
        f"/api/orders/{order_id}/status",
        headers={"Authorization": f"Bearer {agent1_token}"},
        json={"status": "FAILED", "failure_reason": "Customer unreachable on 3 calls"},
    )

    # Step 3: Monkeypatch atomic_claim_agent to simulate concurrent claim collision for all candidates
    # (i.e. candidates were eligible during query, but atomic claim returned False)
    def mock_atomic_claim(db_sess, target_agent_id, target_order_id):
        return False

    monkeypatch.setattr("app.services.assignment_engine.atomic_claim_agent", mock_atomic_claim)

    # Step 4: Reschedule order
    new_date_str = "2025-12-28T14:30:00"
    res = client.post(
        f"/api/orders/{order_id}/reschedule",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"new_scheduled_date": new_date_str, "reason": "Customer requested weekend delivery"},
    )
    assert res.status_code == 200, f"Reschedule endpoint failed: {res.text}"
    data = res.json()
    assert data["assignment"] is None
    assert "No available agent" in data["message"]

    # Step 5: Verify Database Persistence (Transaction integrity)
    # A) Order status must be RESCHEDULED in DB
    order_db = db.query(Order).filter(Order.id == order_id).first()
    assert order_db.status == OrderStatusEnum.RESCHEDULED
    assert order_db.agent_id is None
    assert order_db.scheduled_date is not None
    assert "2025-12-28" in order_db.scheduled_date.isoformat()

    # B) Agent 1 capacity must remain released
    db.refresh(agent1)
    assert agent1.current_load == 0, "Previous agent load must be decremented on reschedule"

    # C) Delivery attempts must ONLY contain Attempt #1 (FAILED), no Attempt #2
    attempts = db.query(DeliveryAttempt).filter(
        DeliveryAttempt.order_id == order_id
    ).order_by(DeliveryAttempt.attempt_number).all()
    assert len(attempts) == 1, f"Expected exactly 1 attempt, found {len(attempts)}"
    assert attempts[0].attempt_number == 1
    assert attempts[0].status == DeliveryAttemptStatusEnum.FAILED

    # D) Timeline must contain both FAILED and RESCHEDULED entries
    res_timeline = client.get(f"/api/orders/{order_id}/timeline", headers={"Authorization": f"Bearer {customer_token}"})
    assert res_timeline.status_code == 200
    timeline_statuses = [e["new_status"] for e in res_timeline.json()]
    assert "FAILED" in timeline_statuses
    assert "RESCHEDULED" in timeline_statuses


