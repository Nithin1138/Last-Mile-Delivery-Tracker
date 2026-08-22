"""
Tests for concurrency safety on agent claims, capacity handling, and race conditions.

Includes:
- State boundary tests (capacity, release, inactive status)
- Real multithreaded PostgreSQL concurrent claim tests
- Real multithreaded PostgreSQL concurrent assignment tests for the same order
"""

from decimal import Decimal
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest
from sqlalchemy.orm import joinedload

from app.services.agent_claim import atomic_claim_agent, release_agent
from app.services.assignment_engine import auto_assign_order
from app.models.models import (
    User, RoleEnum, DeliveryAgent, AgentStatusEnum, Zone, Order,
    OrderStatusEnum, OrderTypeEnum, PaymentTypeEnum, AssignmentDecision, DeliveryAttempt,
)
from app.core.errors import AppError, ErrorCodes
from tests.conftest import TestingSessionLocal


def test_atomic_claim_success_and_second_claim_fails(db):
    """
    Simultaneous or sequential claims for the same AVAILABLE agent:
    First claim succeeds (True).
    Second claim must fail (False) because status became BUSY.
    """
    user = User(email="claim_agent@test.com", password_hash="pass", name="Claim Agent", role=RoleEnum.AGENT)
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.AVAILABLE,
        max_capacity=1,
        current_load=0,
    )
    db.add(agent)
    db.flush()

    order_1 = uuid.uuid4()
    order_2 = uuid.uuid4()

    # First reservation attempt
    claim_1 = atomic_claim_agent(db, agent.id, order_1)
    assert claim_1 is True

    # Refresh agent from DB
    db.refresh(agent)
    assert agent.availability_status == AgentStatusEnum.BUSY
    assert agent.current_load == 1

    # Second reservation attempt for same agent
    claim_2 = atomic_claim_agent(db, agent.id, order_2)
    assert claim_2 is False

    # Refresh again - load and status remain untouched by the failed claim
    db.refresh(agent)
    assert agent.current_load == 1


def test_agent_release_resets_available_status(db):
    """Releasing agent decrements load and makes agent AVAILABLE when load is 0."""
    user = User(email="rel_agent@test.com", password_hash="pass", name="Rel Agent", role=RoleEnum.AGENT)
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.BUSY,
        max_capacity=5,
        current_load=1,
    )
    db.add(agent)
    db.flush()

    release_agent(db, agent.id)
    db.refresh(agent)

    assert agent.current_load == 0
    assert agent.availability_status == AgentStatusEnum.AVAILABLE


def test_capacity_exceeded_prevents_claim(db):
    """Agent at max_capacity (e.g. 2/2) cannot be claimed even if marked available."""
    user = User(email="cap_agent@test.com", password_hash="pass", name="Cap Agent", role=RoleEnum.AGENT)
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.AVAILABLE,
        max_capacity=2,
        current_load=2,  # Already at capacity
    )
    db.add(agent)
    db.flush()

    order_id = uuid.uuid4()
    claimed = atomic_claim_agent(db, agent.id, order_id)
    assert claimed is False


def test_inactive_agent_cannot_be_claimed(db):
    """Inactive agent (is_active = False) cannot be claimed even if status is AVAILABLE."""
    user = User(email=f"inact_agent_{uuid.uuid4().hex[:6]}@test.com", password_hash="pass", name="Inactive Agent", role=RoleEnum.AGENT)
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        availability_status=AgentStatusEnum.AVAILABLE,
        is_active=False,  # Inactive agent
        max_capacity=5,
        current_load=0,
    )
    db.add(agent)
    db.flush()

    order_id = uuid.uuid4()
    claimed = atomic_claim_agent(db, agent.id, order_id)
    assert claimed is False


def test_real_multithreaded_concurrent_agent_claims(db):
    """
    True PostgreSQL Concurrency Integration Test:
    Spawns 5 concurrent worker threads with separate DB connections simultaneously
    attempting to claim an agent with max_capacity = 1.

    Guarantee: Exactly 1 thread succeeds (True), and exactly 4 fail (False).
    Prevents over-allocation in high-throughput dispatch spikes.
    """
    with TestingSessionLocal() as init_db:
        user = User(
            email=f"race_agent_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pass",
            name="Race Agent",
            role=RoleEnum.AGENT,
        )
        init_db.add(user)
        init_db.flush()

        agent = DeliveryAgent(
            user_id=user.id,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=1,
            current_load=0,
        )
        init_db.add(agent)
        init_db.commit()
        agent_id = agent.id

    num_threads = 5
    barrier = threading.Barrier(num_threads)

    def worker_claim(order_id: uuid.UUID) -> bool:
        barrier.wait()  # Synchronize threads so they hit the DB at the exact same millisecond
        with TestingSessionLocal() as session:
            try:
                success = atomic_claim_agent(session, agent_id, order_id)
                if success:
                    session.commit()
                else:
                    session.rollback()
                return success
            except Exception:
                session.rollback()
                return False

    orders = [uuid.uuid4() for _ in range(num_threads)]
    results = []

    with ThreadPoolExecutor(max_workers=num_threads) as executor:
        futures = [executor.submit(worker_claim, o) for o in orders]
        for future in as_completed(futures):
            results.append(future.result())

    # Assert exact concurrency guarantees
    success_count = sum(1 for r in results if r is True)
    failure_count = sum(1 for r in results if r is False)

    assert success_count == 1, f"Expected exactly 1 claim to succeed, got {success_count}"
    assert failure_count == (num_threads - 1), f"Expected {num_threads - 1} claims to fail, got {failure_count}"

    # Verify final DB state
    with TestingSessionLocal() as verify_db:
        final_agent = verify_db.query(DeliveryAgent).filter(DeliveryAgent.id == agent_id).first()
        assert final_agent.current_load == 1
        assert final_agent.availability_status == AgentStatusEnum.BUSY


def test_concurrent_assignment_same_order(db):
    """
    True PostgreSQL Concurrency Integration Test:
    Two concurrent transactions attempt to auto-assign the exact same order simultaneously.

    Using PostgreSQL SELECT ... FOR UPDATE row-level locking:
    - Exactly 1 transaction succeeds and assigns an agent.
    - Exactly 1 transaction fails with INVALID_STATUS_TRANSITION error.
    - Exactly 1 assignment decision is recorded in DB.
    - Exactly 1 delivery attempt is created.
    - Order is assigned to exactly 1 agent.
    - Only 1 agent's current_load is incremented.
    """
    with TestingSessionLocal() as init_db:
        cust_user = User(
            email=f"race_cust_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pass",
            name="Race Customer",
            role=RoleEnum.CUSTOMER,
        )
        agent1_user = User(
            email=f"ag1_race_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pass",
            name="Agent 1",
            role=RoleEnum.AGENT,
        )
        agent2_user = User(
            email=f"ag2_race_{uuid.uuid4().hex[:6]}@test.com",
            password_hash="pass",
            name="Agent 2",
            role=RoleEnum.AGENT,
        )
        zone = Zone(name="Race Zone")
        init_db.add_all([cust_user, agent1_user, agent2_user, zone])
        init_db.flush()

        agent1 = DeliveryAgent(
            user_id=agent1_user.id,
            current_zone_id=zone.id,
            latitude=28.6100,
            longitude=77.2000,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=5,
            current_load=0,
        )
        agent2 = DeliveryAgent(
            user_id=agent2_user.id,
            current_zone_id=zone.id,
            latitude=28.6200,
            longitude=77.2100,
            availability_status=AgentStatusEnum.AVAILABLE,
            max_capacity=5,
            current_load=0,
        )
        init_db.add_all([agent1, agent2])
        init_db.flush()

        order = Order(
            customer_id=cust_user.id,
            pickup_address="Pickup A",
            pickup_pincode="110001",
            pickup_zone_id=zone.id,
            pickup_latitude=28.6139,
            pickup_longitude=77.2090,
            drop_address="Drop B",
            drop_pincode="110001",
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
        init_db.add(order)
        init_db.commit()

        order_id = order.id
        agent1_id = agent1.id
        agent2_id = agent2.id

    barrier = threading.Barrier(2)

    def assign_worker() -> dict:
        barrier.wait()
        with TestingSessionLocal() as session:
            try:
                # Call auto_assign_order directly — locking is enforced inside the assignment engine
                order_to_assign = session.query(Order).filter(Order.id == order_id).first()
                decision = auto_assign_order(session, order_to_assign)
                session.commit()
                return {"success": True, "agent_id": str(decision.selected_agent_id)}
            except AppError as e:
                session.rollback()
                return {"success": False, "code": e.code, "message": e.message}
            except Exception as ex:
                session.rollback()
                return {"success": False, "code": "EXCEPTION", "message": str(ex)}

    with ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(assign_worker)
        f2 = executor.submit(assign_worker)
        r1 = f1.result()
        r2 = f2.result()

    results = [r1, r2]
    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]

    assert len(successes) == 1, f"Expected exactly 1 success, got {len(successes)}"
    assert len(failures) == 1, f"Expected exactly 1 failure, got {len(failures)}"
    assert failures[0]["code"] == ErrorCodes.INVALID_STATUS_TRANSITION

    # Verify final database consistency
    with TestingSessionLocal() as verify_db:
        final_order = verify_db.query(Order).filter(Order.id == order_id).first()
        assert final_order.status == OrderStatusEnum.ASSIGNED.value
        assert final_order.agent_id in [agent1_id, agent2_id]

        decisions = verify_db.query(AssignmentDecision).filter(AssignmentDecision.order_id == order_id).all()
        assert len(decisions) == 1

        attempts = verify_db.query(DeliveryAttempt).filter(DeliveryAttempt.order_id == order_id).all()
        assert len(attempts) == 1

        # Check agent loads: exactly one agent has load 1, the other agent has load 0
        a1 = verify_db.query(DeliveryAgent).filter(DeliveryAgent.id == agent1_id).first()
        a2 = verify_db.query(DeliveryAgent).filter(DeliveryAgent.id == agent2_id).first()
        loads = {a1.current_load, a2.current_load}
        assert loads == {0, 1}
