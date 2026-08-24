"""Tests for the order lifecycle state machine, transitions, and immutable history."""

from decimal import Decimal
import pytest
from app.services.order_lifecycle import (
    validate_transition,
    transition_order,
    create_initial_history,
    create_delivery_attempt,
    mark_delivery_attempt_failed,
    VALID_TRANSITIONS,
)
from app.models.models import (
    User, RoleEnum, Order, OrderStatusEnum, OrderTypeEnum, PaymentTypeEnum,
    DeliveryAttemptStatusEnum, OrderStatusHistory, DeliveryAttempt
)
from app.core.errors import AppError, ErrorCodes


def test_transition_validation_matrix():
    # Valid forward transitions
    assert validate_transition("CREATED", "ASSIGNED")
    assert validate_transition("CREATED", "CANCELLED")
    assert validate_transition("ASSIGNED", "PICKED_UP")
    assert validate_transition("ASSIGNED", "FAILED")
    assert validate_transition("ASSIGNED", "CANCELLED")
    assert validate_transition("PICKED_UP", "IN_TRANSIT")
    assert validate_transition("PICKED_UP", "FAILED")
    assert validate_transition("IN_TRANSIT", "OUT_FOR_DELIVERY")
    assert validate_transition("IN_TRANSIT", "FAILED")
    assert validate_transition("OUT_FOR_DELIVERY", "DELIVERED")
    assert validate_transition("OUT_FOR_DELIVERY", "FAILED")
    assert validate_transition("FAILED", "RESCHEDULED")
    assert validate_transition("RESCHEDULED", "ASSIGNED")

    # Invalid transitions
    assert not validate_transition("DELIVERED", "IN_TRANSIT")
    assert not validate_transition("DELIVERED", "FAILED")
    assert not validate_transition("PICKED_UP", "CANCELLED")
    assert not validate_transition("IN_TRANSIT", "CANCELLED")
    assert not validate_transition("CANCELLED", "ASSIGNED")


def test_order_transition_and_history_creation(db):
    user = User(email="test@user.com", password_hash="pass", name="Test User", role=RoleEnum.CUSTOMER)
    db.add(user)
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001",
        drop_address="B", drop_pincode="110002",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.flush()

    create_initial_history(db, order, user.id)

    # Transition to ASSIGNED
    h1 = transition_order(db, order, "ASSIGNED", changed_by=user.id, reason="Assigned agent")
    assert order.status == OrderStatusEnum.ASSIGNED.value
    assert h1.previous_status == "CREATED"
    assert h1.new_status == "ASSIGNED"

    # Transition to PICKED_UP
    h2 = transition_order(db, order, "PICKED_UP", changed_by=user.id)
    assert order.status == OrderStatusEnum.PICKED_UP.value
    assert h2.previous_status == "ASSIGNED"
    assert h2.new_status == "PICKED_UP"

    # Check append-only history count
    histories = db.query(OrderStatusHistory).filter(OrderStatusHistory.order_id == order.id).all()
    assert len(histories) == 3  # CREATED, ASSIGNED, PICKED_UP


def test_invalid_transition_raises_app_error(db):
    user = User(email="t2@user.com", password_hash="pass", name="Test User", role=RoleEnum.CUSTOMER)
    db.add(user)
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001",
        drop_address="B", drop_pincode="110002",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.DELIVERED,
    )
    db.add(order)
    db.flush()

    with pytest.raises(AppError) as exc_info:
        transition_order(db, order, "IN_TRANSIT", changed_by=user.id)
    assert exc_info.value.code == ErrorCodes.INVALID_STATUS_TRANSITION


def test_admin_override_bypasses_validation(db):
    admin = User(email="admin@user.com", password_hash="pass", name="Admin", role=RoleEnum.ADMIN)
    db.add(admin)
    db.flush()

    order = Order(
        customer_id=admin.id,
        pickup_address="A", pickup_pincode="110001",
        drop_address="B", drop_pincode="110002",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.DELIVERED,
    )
    db.add(order)
    db.flush()

    # Admin override should succeed even from DELIVERED -> CREATED
    h = transition_order(db, order, "CREATED", changed_by=admin.id, reason="Correction", admin_override=True)
    assert order.status == OrderStatusEnum.CREATED.value
    assert "[ADMIN_OVERRIDE]" in h.reason


def test_delivery_attempts_tracking(db):
    user = User(email="u@user.com", password_hash="pass", name="User", role=RoleEnum.CUSTOMER)
    db.add(user)
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001",
        drop_address="B", drop_pincode="110002",
        length_cm=Decimal("10"), breadth_cm=Decimal("10"), height_cm=Decimal("10"),
        actual_weight_kg=Decimal("1"), volumetric_weight_kg=Decimal("0.2"), chargeable_weight_kg=Decimal("1"),
        base_charge=Decimal("50"), cod_charge=Decimal("0"), total_charge=Decimal("50"),
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
        status=OrderStatusEnum.CREATED,
    )
    db.add(order)
    db.flush()

    # Create attempt #1
    att1 = create_delivery_attempt(db, order.id)
    assert att1.attempt_number == 1
    assert att1.status == DeliveryAttemptStatusEnum.IN_PROGRESS

    # Mark failed
    mark_delivery_attempt_failed(db, order, "Customer not available", user.id)
    assert att1.status == DeliveryAttemptStatusEnum.FAILED
    assert att1.failure_reason == "Customer not available"

    # Create attempt #2 on reschedule
    att2 = create_delivery_attempt(db, order.id)
    assert att2.attempt_number == 2
    assert att2.status == DeliveryAttemptStatusEnum.IN_PROGRESS

    attempts = db.query(DeliveryAttempt).filter(DeliveryAttempt.order_id == order.id).all()
    assert len(attempts) == 2
    assert attempts[0].status == DeliveryAttemptStatusEnum.FAILED
    assert attempts[1].status == DeliveryAttemptStatusEnum.IN_PROGRESS
