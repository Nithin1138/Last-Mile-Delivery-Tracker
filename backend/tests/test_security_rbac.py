"""
Security & RBAC Test Suite

Verifies strict server-side authorization:
- Public registration creates CUSTOMER only (no privilege escalation).
- Customer cannot update order delivery status (403).
- Customer cannot access another customer's order, timeline, attempts, or assignment audit (403).
- Customer cannot reschedule another customer's order (403).
- Customer/Agent cannot modify rate cards, manage agents, or access admin dashboards (403).
- Agent cannot view or update another agent's assigned order, timeline, or attempts (403).
- Multi-capacity agent load management bounds load correctly.
"""

from decimal import Decimal
from uuid import uuid4
import pytest
from app.models.models import (
    User, Order, DeliveryAgent, Zone, Area, RateCard,
    RoleEnum, OrderStatusEnum, OrderTypeEnum, ZoneRelationEnum, AgentStatusEnum,
)
from app.core.security import create_access_token


def test_public_registration_cannot_create_admin_or_agent(client, db):
    """Attempting to supply role=ADMIN during registration must be ignored or rejected."""
    payload = {
        "email": f"attacker_{uuid4().hex[:6]}@test.com",
        "password": "password123",
        "name": "Attacker Account",
        "role": "ADMIN",  # Attempted privilege escalation
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 200
    data = res.json()
    # The server must strictly create CUSTOMER, never ADMIN
    assert data["user"]["role"] == "CUSTOMER"

    # Verify directly in DB
    user = db.query(User).filter(User.email == payload["email"]).first()
    assert user is not None
    assert user.role == RoleEnum.CUSTOMER


def test_customer_cannot_update_order_status(client, db, customer_token):
    """Customers are strictly forbidden from calling POST /api/orders/{id}/status."""
    cust = User(email=f"owner_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Order Owner", role=RoleEnum.CUSTOMER)
    db.add(cust)
    db.flush()

    order = Order(
        customer_id=cust.id,
        pickup_address="Pickup Address",
        pickup_pincode="110001",
        drop_address="Drop Address",
        drop_pincode="110001",
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
        payment_type="PREPAID",
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.commit()

    # Customer tries to mark order DELIVERED
    res = client.post(
        f"/api/orders/{order.id}/status",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"status": "DELIVERED"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"


def test_customer_cannot_view_another_customers_order_resources(client, db):
    """Customer A cannot view Customer B's order details, timeline, attempts, or assignment decisions."""
    cust_a = User(email=f"cust_a_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Cust A", role=RoleEnum.CUSTOMER)
    cust_b = User(email=f"cust_b_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Cust B", role=RoleEnum.CUSTOMER)
    db.add_all([cust_a, cust_b])
    db.flush()

    token_a = create_access_token(data={"sub": str(cust_a.id), "role": "CUSTOMER"})

    order_b = Order(
        customer_id=cust_b.id,
        pickup_address="Loc A", pickup_pincode="110001",
        drop_address="Loc B", drop_pincode="110001",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type="PREPAID", status=OrderStatusEnum.CREATED,
    )
    db.add(order_b)
    db.commit()

    # Customer A requests Customer B's order
    res1 = client.get(f"/api/orders/{order_b.id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res1.status_code == 403

    # Customer A requests Customer B's timeline
    res2 = client.get(f"/api/orders/{order_b.id}/timeline", headers={"Authorization": f"Bearer {token_a}"})
    assert res2.status_code == 403

    # Customer A requests Customer B's attempts
    res3 = client.get(f"/api/orders/{order_b.id}/attempts", headers={"Authorization": f"Bearer {token_a}"})
    assert res3.status_code == 403

    # Customer A requests Customer B's assignment decisions
    res4 = client.get(f"/api/orders/{order_b.id}/assignments", headers={"Authorization": f"Bearer {token_a}"})
    assert res4.status_code == 403

    # Customer A attempts to reschedule Customer B's order
    res5 = client.post(
        f"/api/orders/{order_b.id}/reschedule",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"new_scheduled_date": "2026-10-10T10:00:00"},
    )
    assert res5.status_code == 403


def test_agent_cannot_update_or_view_unassigned_order_resources(client, db):
    """Agent A cannot view or update status, timeline, or attempts for an order assigned to Agent B."""
    cust = User(email=f"c_ord_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Cust Ord", role=RoleEnum.CUSTOMER)
    user_a = User(email=f"agent_a_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Agent A", role=RoleEnum.AGENT)
    user_b = User(email=f"agent_b_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Agent B", role=RoleEnum.AGENT)
    db.add_all([cust, user_a, user_b])
    db.flush()

    agent_a = DeliveryAgent(user_id=user_a.id, availability_status=AgentStatusEnum.AVAILABLE)
    agent_b = DeliveryAgent(user_id=user_b.id, availability_status=AgentStatusEnum.AVAILABLE)
    db.add_all([agent_a, agent_b])
    db.flush()

    token_a = create_access_token(data={"sub": str(user_a.id), "role": "AGENT"})

    # Order assigned to Agent B
    order = Order(
        customer_id=cust.id,
        agent_id=agent_b.id,
        pickup_address="Loc A", pickup_pincode="110001",
        drop_address="Loc B", drop_pincode="110001",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type="PREPAID", status=OrderStatusEnum.ASSIGNED,
    )
    db.add(order)
    db.commit()

    # Agent A tries to view order
    res1 = client.get(f"/api/orders/{order.id}", headers={"Authorization": f"Bearer {token_a}"})
    assert res1.status_code == 403

    # Agent A tries to view timeline
    res2 = client.get(f"/api/orders/{order.id}/timeline", headers={"Authorization": f"Bearer {token_a}"})
    assert res2.status_code == 403

    # Agent A tries to view delivery attempts
    res3 = client.get(f"/api/orders/{order.id}/attempts", headers={"Authorization": f"Bearer {token_a}"})
    assert res3.status_code == 403

    # Agent A tries to update status to PICKED_UP
    res4 = client.post(
        f"/api/orders/{order.id}/status",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"status": "PICKED_UP"},
    )
    assert res4.status_code == 403


def test_customer_and_agent_cannot_access_admin_endpoints(client, customer_token, db):
    """Customer and Agent calling admin configuration endpoints must receive 403 Forbidden."""
    agent_user = User(email=f"ag_sec_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Sec Agent", role=RoleEnum.AGENT)
    db.add(agent_user)
    db.flush()
    agent_token = create_access_token(data={"sub": str(agent_user.id), "role": "AGENT"})

    # Customer tries dashboard
    assert client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {customer_token}"}).status_code == 403

    # Agent tries dashboard
    assert client.get("/api/admin/dashboard", headers={"Authorization": f"Bearer {agent_token}"}).status_code == 403

    # Customer tries creating rate card
    assert client.post(
        "/api/admin/rate-cards",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"order_type": "B2C", "zone_type": "INTRA", "base_fee": 50, "rate_per_kg": 10},
    ).status_code == 403

    # Agent tries creating delivery agent
    assert client.post(
        "/api/admin/agents",
        headers={"Authorization": f"Bearer {agent_token}"},
        json={"name": "New Agent", "email": "new@agent.com", "phone": "9999999999"},
    ).status_code == 403


def test_multi_capacity_agent_claim_and_release(db):
    """Agent with capacity 3 accepts 3 orders before turning BUSY, and returns to AVAILABLE on release."""
    from app.services.agent_claim import atomic_claim_agent, release_agent

    user = User(email=f"multi_cap_{uuid4().hex[:6]}@test.com", password_hash="hash", name="Cap Agent", role=RoleEnum.AGENT)
    db.add(user)
    db.flush()
    agent = DeliveryAgent(user_id=user.id, max_capacity=3, current_load=0, availability_status=AgentStatusEnum.AVAILABLE)
    db.add(agent)
    db.commit()

    order1_id, order2_id, order3_id, order4_id = uuid4(), uuid4(), uuid4(), uuid4()

    # Claim 1: load becomes 1, status remains AVAILABLE
    assert atomic_claim_agent(db, agent.id, order1_id) is True
    db.refresh(agent)
    assert agent.current_load == 1
    assert agent.availability_status == AgentStatusEnum.AVAILABLE

    # Claim 2: load becomes 2, status remains AVAILABLE
    assert atomic_claim_agent(db, agent.id, order2_id) is True
    db.refresh(agent)
    assert agent.current_load == 2
    assert agent.availability_status == AgentStatusEnum.AVAILABLE

    # Claim 3: load becomes 3 (hit max capacity), status becomes BUSY
    assert atomic_claim_agent(db, agent.id, order3_id) is True
    db.refresh(agent)
    assert agent.current_load == 3
    assert agent.availability_status == AgentStatusEnum.BUSY

    # Claim 4: rejected because agent is at capacity
    assert atomic_claim_agent(db, agent.id, order4_id) is False

    # Release 1 order: load becomes 2, status returns to AVAILABLE
    release_agent(db, agent.id)
    db.refresh(agent)
    assert agent.current_load == 2
    assert agent.availability_status == AgentStatusEnum.AVAILABLE


def test_admin_config_get_routes_require_admin(client, db, customer_fixture, customer_token):
    """Non-admin authenticated users MUST receive 403 on all admin configuration GET routes.

    Verifies the fix for: GET /api/admin/zones, /api/admin/areas,
    /api/admin/rate-cards, /api/admin/cod-surcharges all require admin role.
    Previously these used get_current_user (any authenticated user could access).
    """
    headers = {"Authorization": f"Bearer {customer_token}"}

    # All four admin config GET routes must reject non-admin users
    assert client.get("/api/admin/zones", headers=headers).status_code == 403, \
        "Customer should not be able to list zones"
    assert client.get("/api/admin/areas", headers=headers).status_code == 403, \
        "Customer should not be able to list areas"
    assert client.get("/api/admin/rate-cards", headers=headers).status_code == 403, \
        "Customer should not be able to list rate cards"
    assert client.get("/api/admin/cod-surcharges", headers=headers).status_code == 403, \
        "Customer should not be able to list COD surcharges"

    # Unauthenticated requests also rejected (returns 403 — no credentials provided)
    assert client.get("/api/admin/zones").status_code in [401, 403]
    assert client.get("/api/admin/rate-cards").status_code in [401, 403]


def test_admin_config_get_routes_accessible_to_admin(client, db, admin_fixture, admin_token):
    """Admin users MUST be able to access all admin configuration GET routes."""
    headers = {"Authorization": f"Bearer {admin_token}"}

    # All four admin config GET routes must succeed for admin
    assert client.get("/api/admin/zones", headers=headers).status_code == 200, \
        "Admin should be able to list zones"
    assert client.get("/api/admin/areas", headers=headers).status_code == 200, \
        "Admin should be able to list areas"
    assert client.get("/api/admin/rate-cards", headers=headers).status_code == 200, \
        "Admin should be able to list rate cards"
    assert client.get("/api/admin/cod-surcharges", headers=headers).status_code == 200, \
        "Admin should be able to list COD surcharges"


def _setup_order_prerequisites(db):
    zone = Zone(name="Sec Test Zone")
    db.add(zone)
    db.flush()
    area = Area(pincode="110001", name="Sec Area", zone_id=zone.id, is_active=True)
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
    return zone


def test_admin_create_order_for_nonexistent_customer_fails(client, db, admin_token):
    """Admin creating an order for a nonexistent customer_id must fail with USER_NOT_FOUND (404)."""
    _setup_order_prerequisites(db)
    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "customer_id": "00000000-0000-0000-0000-000000000000",
        "pickup_address": "123 Main St",
        "pickup_pincode": "110001",
        "drop_address": "456 Market St",
        "drop_pincode": "110001",
        "length_cm": 10,
        "breadth_cm": 10,
        "height_cm": 10,
        "actual_weight_kg": 1,
        "order_type": "B2C",
        "payment_type": "PREPAID",
    }
    res = client.post("/api/orders", headers=headers, json=payload)
    assert res.status_code == 404
    assert res.json()["error"]["code"] == "USER_NOT_FOUND"


def test_admin_create_order_for_inactive_customer_fails(client, db, admin_token):
    """Admin creating an order for an inactive customer account must fail with USER_INACTIVE (400)."""
    _setup_order_prerequisites(db)
    inactive_cust = User(
        email=f"inactive_{uuid4().hex[:6]}@test.com",
        password_hash="pass",
        name="Inactive Customer",
        role=RoleEnum.CUSTOMER,
        is_active=False,
    )
    db.add(inactive_cust)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "customer_id": str(inactive_cust.id),
        "pickup_address": "123 Main St",
        "pickup_pincode": "110001",
        "drop_address": "456 Market St",
        "drop_pincode": "110001",
        "length_cm": 10,
        "breadth_cm": 10,
        "height_cm": 10,
        "actual_weight_kg": 1,
        "order_type": "B2C",
        "payment_type": "PREPAID",
    }
    res = client.post("/api/orders", headers=headers, json=payload)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "USER_INACTIVE"


def test_admin_create_order_for_agent_user_fails(client, db, admin_token):
    """Admin creating an order specifying an AGENT user id as customer must fail with INVALID_ROLE (400)."""
    _setup_order_prerequisites(db)
    agent_user = User(
        email=f"agent_user_{uuid4().hex[:6]}@test.com",
        password_hash="pass",
        name="Agent User",
        role=RoleEnum.AGENT,
        is_active=True,
    )
    db.add(agent_user)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    payload = {
        "customer_id": str(agent_user.id),
        "pickup_address": "123 Main St",
        "pickup_pincode": "110001",
        "drop_address": "456 Market St",
        "drop_pincode": "110001",
        "length_cm": 10,
        "breadth_cm": 10,
        "height_cm": 10,
        "actual_weight_kg": 1,
        "order_type": "B2C",
        "payment_type": "PREPAID",
    }
    res = client.post("/api/orders", headers=headers, json=payload)
    assert res.status_code == 400
    assert res.json()["error"]["code"] == "INVALID_ROLE"


def test_admin_update_agent_persists_coordinates_and_all_fields(client, db, admin_token):
    """Admin updating delivery agent coordinates, capacity, load, status, and zone must persist cleanly."""
    from app.models.models import Zone, DeliveryAgent, AgentStatusEnum

    zone = Zone(name="Agent Update Zone")
    db.add(zone)
    db.flush()

    user = User(
        email=f"agent_up_{uuid4().hex[:6]}@test.com",
        password_hash="pass",
        name="Agent Update Target",
        role=RoleEnum.AGENT,
        is_active=True,
    )
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        latitude=28.6000,
        longitude=77.2000,
        max_capacity=5,
        current_load=1,
        availability_status=AgentStatusEnum.AVAILABLE,
        is_active=True,
    )
    db.add(agent)
    db.commit()

    headers = {"Authorization": f"Bearer {admin_token}"}
    update_payload = {
        "latitude": 28.6543,
        "longitude": 77.2345,
        "max_capacity": 8,
        "current_load": 2,
        "availability_status": "BUSY",
        "zone_id": str(zone.id),
        "is_active": True,
    }

    res = client.patch(f"/api/admin/agents/{agent.id}", headers=headers, json=update_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["latitude"] == 28.6543
    assert data["longitude"] == 77.2345
    assert data["max_capacity"] == 8
    assert data["current_load"] == 2
    assert data["availability_status"] == "BUSY"
    assert data["current_zone_id"] == str(zone.id)

    # Verify DB persistence
    db.refresh(agent)
    assert agent.latitude == 28.6543
    assert agent.longitude == 77.2345
    assert agent.max_capacity == 8
    assert agent.current_load == 2
    assert agent.availability_status == AgentStatusEnum.BUSY
    assert agent.current_zone_id == zone.id


def test_status_history_immutability_prevents_update_and_delete(db):
    """OrderStatusHistory rows are strictly append-only; updates and deletions must raise ValueError."""
    import pytest
    from app.models.models import OrderStatusHistory, Order, Zone, OrderTypeEnum, PaymentTypeEnum

    zone = Zone(name="Immutability Zone")
    user = User(email=f"immut_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Immut User", role=RoleEnum.CUSTOMER)
    db.add_all([zone, user])
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110001", drop_zone_id=zone.id,
        length_cm=10, breadth_cm=10, height_cm=10,
        actual_weight_kg=1, volumetric_weight_kg=0.2, chargeable_weight_kg=1,
        base_charge=50, cod_charge=0, total_charge=50,
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
    )
    db.add(order)
    db.flush()

    history = OrderStatusHistory(
        order_id=order.id,
        previous_status=None,
        new_status="CREATED",
        changed_by=user.id,
        reason="Initial order placement",
    )
    db.add(history)
    db.commit()

    # Attempt to delete history record -> must fail
    with pytest.raises(ValueError, match="strictly append-only"):
        db.delete(history)
        db.commit()
    db.rollback()

    # Attempt to modify existing history record -> must fail
    with pytest.raises(ValueError, match="strictly append-only"):
        history.new_status = "TAMPERED"
        db.commit()
    db.rollback()


def test_database_triggers_prevent_raw_sql_audit_log_mutations(db):
    """
    Direct raw SQL UPDATE and DELETE on audit log tables (order_status_history, assignment_decisions, notifications)
    must be strictly blocked by PostgreSQL database-level triggers.
    """
    import pytest
    from sqlalchemy import text
    from sqlalchemy.exc import InternalError, DBAPIError
    from app.models.models import Order, Zone, OrderTypeEnum, PaymentTypeEnum

    zone = Zone(name="Trigger Immutability Zone")
    user = User(email=f"trig_immut_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Trigger Immut User", role=RoleEnum.CUSTOMER)
    db.add_all([zone, user])
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110001", drop_zone_id=zone.id,
        length_cm=10, breadth_cm=10, height_cm=10,
        actual_weight_kg=1, volumetric_weight_kg=0.2, chargeable_weight_kg=1,
        base_charge=50, cod_charge=0, total_charge=50,
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
    )
    db.add(order)
    db.flush()

    # 1. Raw SQL insert into order_status_history
    history_id = uuid4()
    db.execute(text(f"""
        INSERT INTO order_status_history (id, order_id, new_status, reason, created_at)
        VALUES ('{history_id}', '{order.id}', 'CREATED', 'Initial order placement', NOW())
    """))
    db.commit()

    # Raw SQL UPDATE on order_status_history -> Must fail via trigger
    with pytest.raises((InternalError, DBAPIError), match="strictly append-only"):
        db.execute(text(f"UPDATE order_status_history SET new_status = 'HACKED' WHERE id = '{history_id}'"))
        db.commit()
    db.rollback()

    # Raw SQL DELETE on order_status_history -> Must fail via trigger
    with pytest.raises((InternalError, DBAPIError), match="strictly append-only"):
        db.execute(text(f"DELETE FROM order_status_history WHERE id = '{history_id}'"))
        db.commit()
    db.rollback()

    # 2. Raw SQL insert into notifications
    notif_id = uuid4()
    db.execute(text(f"""
        INSERT INTO notifications (id, order_id, notification_type, channel, status, created_at)
        VALUES ('{notif_id}', '{order.id}', 'ORDER_CREATED', 'EMAIL', 'SENT', NOW())
    """))
    db.commit()

    # Raw SQL UPDATE on notifications -> Must fail via trigger
    with pytest.raises((InternalError, DBAPIError), match="strictly append-only"):
        db.execute(text(f"UPDATE notifications SET status = 'FAILED' WHERE id = '{notif_id}'"))
        db.commit()
    db.rollback()

    # 3. Raw SQL insert into delivery_attempts
    attempt_id = uuid4()
    db.execute(text(f"""
        INSERT INTO delivery_attempts (id, order_id, attempt_number, status, created_at)
        VALUES ('{attempt_id}', '{order.id}', 1, 'PENDING', NOW())
    """))
    db.commit()

    # Raw SQL DELETE on delivery_attempts -> Must fail via trigger
    with pytest.raises((InternalError, DBAPIError), match="strictly append-only"):
        db.execute(text(f"DELETE FROM delivery_attempts WHERE id = '{attempt_id}'"))
        db.commit()
    db.rollback()

    # 4. Raw SQL insert into delivery_attempts with terminal FAILED status
    terminal_attempt_id = uuid4()
    db.execute(text(f"""
        INSERT INTO delivery_attempts (id, order_id, attempt_number, status, failure_reason, created_at)
        VALUES ('{terminal_attempt_id}', '{order.id}', 2, 'FAILED', 'Customer unavailable', NOW())
    """))
    db.commit()

    # Raw SQL UPDATE on terminal delivery_attempt -> Must fail via trigger
    with pytest.raises((InternalError, DBAPIError), match="is in terminal status"):
        db.execute(text(f"UPDATE delivery_attempts SET failure_reason = 'HACKED' WHERE id = '{terminal_attempt_id}'"))
        db.commit()
    db.rollback()


def test_delivery_attempt_orm_immutability_prevents_deletion(db):
    """DeliveryAttempt objects cannot be deleted via ORM sessions."""
    import pytest
    from app.models.models import DeliveryAttempt, Order, Zone, OrderTypeEnum, PaymentTypeEnum, DeliveryAttemptStatusEnum

    zone = Zone(name="Attempt Immut Zone")
    user = User(email=f"attempt_immut_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Attempt Immut User", role=RoleEnum.CUSTOMER)
    db.add_all([zone, user])
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110001", drop_zone_id=zone.id,
        length_cm=10, breadth_cm=10, height_cm=10,
        actual_weight_kg=1, volumetric_weight_kg=0.2, chargeable_weight_kg=1,
        base_charge=50, cod_charge=0, total_charge=50,
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
    )
    db.add(order)
    db.flush()

    attempt = DeliveryAttempt(
        order_id=order.id,
        attempt_number=1,
        status=DeliveryAttemptStatusEnum.FAILED,
        failure_reason="Customer unreachable",
    )
    db.add(attempt)
    db.commit()

    with pytest.raises(ValueError, match="immutable audit artifacts and cannot be deleted"):
        db.delete(attempt)
        db.commit()
    db.rollback()


def test_terminal_delivery_attempt_orm_immutability_prevents_update(db):
    """DeliveryAttempt objects in terminal DELIVERED/FAILED status cannot be updated via ORM."""
    import pytest
    from app.models.models import DeliveryAttempt, Order, Zone, OrderTypeEnum, PaymentTypeEnum, DeliveryAttemptStatusEnum

    zone = Zone(name="Terminal Attempt Zone")
    user = User(email=f"term_attempt_{uuid4().hex[:6]}@test.com", password_hash="pass", name="Term Attempt User", role=RoleEnum.CUSTOMER)
    db.add_all([zone, user])
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110001", drop_zone_id=zone.id,
        length_cm=10, breadth_cm=10, height_cm=10,
        actual_weight_kg=1, volumetric_weight_kg=0.2, chargeable_weight_kg=1,
        base_charge=50, cod_charge=0, total_charge=50,
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
    )
    db.add(order)
    db.flush()

    attempt = DeliveryAttempt(
        order_id=order.id,
        attempt_number=1,
        status=DeliveryAttemptStatusEnum.DELIVERED,
    )
    db.add(attempt)
    db.commit()

    with pytest.raises(ValueError, match="is in terminal status 'DELIVERED' and cannot be modified"):
        attempt.failure_reason = "Should not be allowed to change after delivery"
        db.commit()
    db.rollback()






