"""Tests for assignment engine ranking and assignment logic."""

from decimal import Decimal
import pytest
from app.services.assignment_engine import (
    find_eligible_agents,
    rank_candidates,
    auto_assign_order,
    manual_assign_order,
)
from app.models.models import (
    User, RoleEnum, DeliveryAgent, AgentStatusEnum, Zone, Order, OrderStatusEnum,
    OrderTypeEnum, PaymentTypeEnum, AssignmentModeEnum
)
from app.core.errors import AppError, ErrorCodes


def test_find_eligible_agents(db):
    user1 = User(email="a1@test.com", password_hash="pass", name="A1", role=RoleEnum.AGENT)
    user2 = User(email="a2@test.com", password_hash="pass", name="A2", role=RoleEnum.AGENT)
    user3 = User(email="a3@test.com", password_hash="pass", name="A3", role=RoleEnum.AGENT)
    db.add_all([user1, user2, user3])
    db.flush()

    # Agent 1: Available, load 0/5 -> Eligible
    a1 = DeliveryAgent(user_id=user1.id, availability_status=AgentStatusEnum.AVAILABLE, current_load=0, max_capacity=5)
    # Agent 2: Busy -> Ineligible
    a2 = DeliveryAgent(user_id=user2.id, availability_status=AgentStatusEnum.BUSY, current_load=1, max_capacity=5)
    # Agent 3: Available but at capacity (5/5) -> Ineligible
    a3 = DeliveryAgent(user_id=user3.id, availability_status=AgentStatusEnum.AVAILABLE, current_load=5, max_capacity=5)

    db.add_all([a1, a2, a3])
    db.flush()

    eligible = find_eligible_agents(db)
    assert len(eligible) == 1
    assert eligible[0].id == a1.id


def test_rank_candidates_nearest_and_zone_match(db):
    zone_a = Zone(name="Zone A")
    zone_b = Zone(name="Zone B")
    db.add_all([zone_a, zone_b])
    db.flush()

    user1 = User(email="u1@test.com", password_hash="p", name="U1", role=RoleEnum.AGENT)
    user2 = User(email="u2@test.com", password_hash="p", name="U2", role=RoleEnum.AGENT)
    db.add_all([user1, user2])
    db.flush()

    # Agent 1: In Zone A, 5km away
    a1 = DeliveryAgent(
        user_id=user1.id, current_zone_id=zone_a.id,
        latitude=28.6500, longitude=77.2100,
        availability_status=AgentStatusEnum.AVAILABLE, current_load=0, max_capacity=5
    )
    # Agent 2: In Zone B, 1km away
    a2 = DeliveryAgent(
        user_id=user2.id, current_zone_id=zone_b.id,
        latitude=28.6150, longitude=77.2100,
        availability_status=AgentStatusEnum.AVAILABLE, current_load=0, max_capacity=5
    )
    db.add_all([a1, a2])
    db.flush()

    # Pickup is in Zone A (lat: 28.6139, lon: 77.2090)
    ranked = rank_candidates([a1, a2], 28.6139, 77.2090, zone_a.id)

    # Agent 2 should rank first because of closer distance (1km vs 5km)
    assert ranked[0][0].id == a2.id
    assert ranked[0][1] < ranked[1][1]  # distance comparison

    # When distances are equal, zone match is the tie-breaker
    a3 = DeliveryAgent(user_id=user1.id, current_zone_id=zone_a.id, latitude=28.6150, longitude=77.2100)
    a4 = DeliveryAgent(user_id=user2.id, current_zone_id=zone_b.id, latitude=28.6150, longitude=77.2100)
    tie_ranked = rank_candidates([a4, a3], 28.6139, 77.2090, zone_a.id)
    assert tie_ranked[0][0].id == a3.id  # Same distance: Zone match wins tie-break


def test_auto_assign_success(db):
    zone = Zone(name="Delivery Zone")
    cust_user = User(email="c@test.com", password_hash="p", name="Customer", role=RoleEnum.CUSTOMER)
    agent_user = User(email="ag@test.com", password_hash="p", name="Agent", role=RoleEnum.AGENT)
    db.add_all([zone, cust_user, agent_user])
    db.flush()

    agent = DeliveryAgent(
        user_id=agent_user.id, current_zone_id=zone.id,
        latitude=28.6139, longitude=77.2090,
        availability_status=AgentStatusEnum.AVAILABLE, current_load=0, max_capacity=5
    )
    db.add(agent)
    db.flush()

    order = Order(
        customer_id=cust_user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        pickup_latitude=28.6139, pickup_longitude=77.2090,
        drop_address="B", drop_pincode="110002", drop_zone_id=zone.id,
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.flush()

    decision = auto_assign_order(db, order)
    db.refresh(agent)

    assert order.status == OrderStatusEnum.ASSIGNED.value
    assert order.agent_id == agent.id
    assert agent.availability_status == AgentStatusEnum.AVAILABLE
    assert agent.current_load == 1
    assert decision.selected_agent_id == agent.id
    assert decision.selection_mode == AssignmentModeEnum.AUTO


def test_auto_assign_no_available_agent_raises(db):
    zone = Zone(name="Zone")
    cust_user = User(email="c2@test.com", password_hash="p", name="Customer", role=RoleEnum.CUSTOMER)
    db.add_all([zone, cust_user])
    db.flush()

    order = Order(
        customer_id=cust_user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110002", drop_zone_id=zone.id,
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.flush()

    with pytest.raises(AppError) as exc_info:
        auto_assign_order(db, order)
    assert exc_info.value.code == ErrorCodes.NO_AVAILABLE_AGENT


def test_auto_assign_preserves_zero_distance(db):
    """Proves that an agent located exactly at the pickup coordinates produces
    distance_km == 0.0 and assignment decision preserves 0.0 rather than converting to None.
    """
    zone = Zone(name="Zero Dist Zone")
    cust_user = User(email="c_zero@test.com", password_hash="p", name="Customer Zero", role=RoleEnum.CUSTOMER)
    agent_user = User(email="ag_zero@test.com", password_hash="p", name="Agent Zero", role=RoleEnum.AGENT)
    db.add_all([zone, cust_user, agent_user])
    db.flush()

    # Agent located EXACTLY at pickup coordinates (28.6139, 77.2090)
    agent = DeliveryAgent(
        user_id=agent_user.id,
        current_zone_id=zone.id,
        latitude=28.6139,
        longitude=77.2090,
        availability_status=AgentStatusEnum.AVAILABLE,
        current_load=0,
        max_capacity=5,
    )
    db.add(agent)
    db.flush()

    order = Order(
        customer_id=cust_user.id,
        pickup_address="A",
        pickup_pincode="110001",
        pickup_zone_id=zone.id,
        pickup_latitude=28.6139,
        pickup_longitude=77.2090,
        drop_address="B",
        drop_pincode="110002",
        drop_zone_id=zone.id,
        length_cm=Decimal("10"),
        breadth_cm=Decimal("10"),
        height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"),
        volumetric_weight_kg=Decimal("0.2"),
        chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"),
        cod_charge=Decimal("0"),
        total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C,
        payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.flush()

    decision = auto_assign_order(db, order)

    assert decision.selected_distance_km == 0.0
    assert decision.selected_distance_km is not None
    assert decision.selected_agent_id == agent.id


def test_auto_assign_fires_on_order_creation(client, db):
    """REQ-08 API-level proof: when an available agent exists, creating an order via the
    REST API must return status=ASSIGNED with agent_id populated — no admin action needed.

    This is the end-to-end proof that automatic dispatch runs immediately after the
    order creation commit, satisfying the PDF objective:
    'Output: Order with auto-calculated charge, agent assignment, status tracking, notifications.'
    """
    from app.models.models import (
        Area, RateCard, ZoneRelationEnum, DeliveryAttempt,
        DeliveryAttemptStatusEnum, AssignmentDecision,
    )
    from app.core.security import hash_password, create_access_token

    # Setup zone + area + rate card
    zone = Zone(name="Auto Assign On Create Zone")
    db.add(zone)
    db.flush()
    area = Area(pincode="560001", name="Bangalore Central", zone_id=zone.id, is_active=True)
    rate = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTRA,
        base_fee=Decimal("50.00"),
        rate_per_kg=Decimal("10.00"),
        version=1,
        is_active=True,
    )
    db.add_all([area, rate])
    db.flush()

    # Create customer
    customer_user = User(
        email="auto_dispatch_cust@test.com",
        password_hash=hash_password("pass"),
        name="Dispatch Test Customer",
        role=RoleEnum.CUSTOMER,
    )
    db.add(customer_user)
    db.flush()
    customer_token = create_access_token({"sub": str(customer_user.id), "role": "CUSTOMER"})

    # Create available delivery agent
    agent_user = User(
        email="auto_dispatch_agent@test.com",
        password_hash=hash_password("pass"),
        name="Dispatch Test Agent",
        role=RoleEnum.AGENT,
    )
    db.add(agent_user)
    db.flush()
    agent = DeliveryAgent(
        user_id=agent_user.id,
        current_zone_id=zone.id,
        latitude=12.9716,
        longitude=77.5946,
        availability_status=AgentStatusEnum.AVAILABLE,
        current_load=0,
        max_capacity=5,
        is_active=True,
    )
    db.add(agent)
    db.commit()

    # Create order via API — agent is available, so auto-assign must fire
    res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "pickup_address": "MG Road, Bangalore",
            "pickup_pincode": "560001",
            "drop_address": "Brigade Road, Bangalore",
            "drop_pincode": "560001",
            "length_cm": 20,
            "breadth_cm": 15,
            "height_cm": 10,
            "actual_weight_kg": 2,
            "order_type": "B2C",
            "payment_type": "PREPAID",
            "pickup_latitude": 12.9716,
            "pickup_longitude": 77.5946,
        },
    )
    assert res.status_code == 200, f"Order creation failed: {res.text}"
    data = res.json()

    # CRITICAL: status must be ASSIGNED (not CREATED) — auto-dispatch fired
    assert data["status"] == "ASSIGNED", (
        f"Expected ASSIGNED after order creation with available agent, got: {data['status']}"
    )
    assert data["agent_id"] is not None, "agent_id must be set after auto-dispatch"
    assert data["agent_id"] == str(agent.id)

    # Verify Delivery Attempt #1 was created (proves full assignment pipeline ran)
    order_id = data["id"]
    attempts = db.query(DeliveryAttempt).filter(
        DeliveryAttempt.order_id == order_id
    ).all()
    assert len(attempts) == 1, f"Expected 1 delivery attempt after auto-assign, got {len(attempts)}"
    assert attempts[0].attempt_number == 1
    assert attempts[0].status == DeliveryAttemptStatusEnum.IN_PROGRESS

    # Verify AssignmentDecision audit record was written
    decision = db.query(AssignmentDecision).filter(
        AssignmentDecision.order_id == order_id
    ).first()
    assert decision is not None, "AssignmentDecision audit record must exist"
    assert decision.selected_agent_id == agent.id

    # Verify agent load incremented
    db.refresh(agent)
    assert agent.current_load == 1

    # Verify complete timeline: CREATED → ASSIGNED both present
    res_tl = client.get(
        f"/api/orders/{order_id}/timeline",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert res_tl.status_code == 200
    statuses = [e["new_status"] for e in res_tl.json()]
    assert "CREATED" in statuses
    assert "ASSIGNED" in statuses

