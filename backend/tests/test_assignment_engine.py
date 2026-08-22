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

