"""
Order lifecycle state machine — validates transitions and manages history.

States: CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → OUT_FOR_DELIVERY
        → DELIVERED | FAILED → RESCHEDULED → ASSIGNED (loops back)
        CANCELLED (only before pickup)
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import (
    Order,
    OrderStatusHistory,
    OrderStatusEnum,
    DeliveryAttempt,
    DeliveryAttemptStatusEnum,
)
from app.core.errors import AppError, ErrorCodes
from app.core.events import log_event

# ---------------------------------------------------------------------------
# Valid transitions map
# ---------------------------------------------------------------------------
VALID_TRANSITIONS: dict[str, list[str]] = {
    OrderStatusEnum.CREATED.value: [
        OrderStatusEnum.ASSIGNED.value,
        OrderStatusEnum.CANCELLED.value,
    ],
    OrderStatusEnum.ASSIGNED.value: [
        OrderStatusEnum.PICKED_UP.value,
        OrderStatusEnum.FAILED.value,
        OrderStatusEnum.CANCELLED.value,
    ],
    OrderStatusEnum.PICKED_UP.value: [
        OrderStatusEnum.IN_TRANSIT.value,
        OrderStatusEnum.FAILED.value,
    ],
    OrderStatusEnum.IN_TRANSIT.value: [
        OrderStatusEnum.OUT_FOR_DELIVERY.value,
        OrderStatusEnum.FAILED.value,
    ],
    OrderStatusEnum.OUT_FOR_DELIVERY.value: [
        OrderStatusEnum.DELIVERED.value,
        OrderStatusEnum.FAILED.value,
    ],
    OrderStatusEnum.FAILED.value: [
        OrderStatusEnum.RESCHEDULED.value,
    ],
    OrderStatusEnum.RESCHEDULED.value: [
        OrderStatusEnum.ASSIGNED.value,
    ],
    # Terminal states — no further transitions
    OrderStatusEnum.DELIVERED.value: [],
    OrderStatusEnum.CANCELLED.value: [],
}


def validate_transition(current_status: str, new_status: str) -> bool:
    """Check if a status transition is valid."""
    allowed = VALID_TRANSITIONS.get(current_status, [])
    return new_status in allowed


def transition_order(
    db: Session,
    order: Order,
    new_status: str,
    changed_by: Optional[UUID] = None,
    reason: Optional[str] = None,
    admin_override: bool = False,
) -> OrderStatusHistory:
    """Execute a validated status transition on an order.

    Creates an append-only history record. Optionally allows admin override
    (bypasses validation but is still logged).

    Args:
        db: Database session.
        order: The order to transition.
        new_status: Target status.
        changed_by: UUID of the user performing the transition.
        reason: Optional reason for the transition.
        admin_override: If True, bypass transition validation (admin only).

    Returns:
        The created OrderStatusHistory record.

    Raises:
        AppError: If the transition is invalid and not an admin override.
    """
    current = order.status.value if hasattr(order.status, 'value') else order.status

    if not admin_override and not validate_transition(current, new_status):
        raise AppError(
            code=ErrorCodes.INVALID_STATUS_TRANSITION,
            message=f"Cannot transition from {current} to {new_status}.",
            status_code=400,
        )

    # Create append-only history record
    history = OrderStatusHistory(
        order_id=order.id,
        previous_status=current,
        new_status=new_status,
        changed_by=changed_by,
        reason=f"{'[ADMIN_OVERRIDE] ' if admin_override else ''}{reason or ''}".strip() or None,
    )
    db.add(history)
    db.flush()

    # Update denormalized status on order
    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    db.flush()

    log_event(
        "STATUS_TRANSITION",
        order=str(order.id),
        previous=current,
        new=new_status,
        actor=str(changed_by) if changed_by else "system",
        admin_override=str(admin_override),
        reason=reason or "",
    )

    return history


def create_initial_history(
    db: Session,
    order: Order,
    created_by: Optional[UUID] = None,
) -> OrderStatusHistory:
    """Create the initial CREATED history entry for a new order."""
    history = OrderStatusHistory(
        order_id=order.id,
        previous_status=None,
        new_status=OrderStatusEnum.CREATED.value,
        changed_by=created_by,
        reason="Order created",
    )
    db.add(history)
    db.flush()
    return history


def mark_delivery_attempt_failed(
    db: Session,
    order: Order,
    failure_reason: str,
    changed_by: Optional[UUID] = None,
) -> DeliveryAttempt:
    """Mark the current delivery attempt as failed.

    Finds the latest in-progress attempt and marks it FAILED.
    """
    attempt = (
        db.query(DeliveryAttempt)
        .filter(
            DeliveryAttempt.order_id == order.id,
            DeliveryAttempt.status == DeliveryAttemptStatusEnum.IN_PROGRESS,
        )
        .order_by(DeliveryAttempt.attempt_number.desc())
        .first()
    )

    if attempt:
        attempt.status = DeliveryAttemptStatusEnum.FAILED
        attempt.failure_reason = failure_reason
        attempt.completed_at = datetime.now(timezone.utc)
        db.flush()
    else:
        max_attempt = (
            db.query(DeliveryAttempt.attempt_number)
            .filter(DeliveryAttempt.order_id == order.id)
            .order_by(DeliveryAttempt.attempt_number.desc())
            .first()
        )
        attempt_num = (max_attempt[0] + 1) if max_attempt else 1
        attempt = DeliveryAttempt(
            order_id=order.id,
            attempt_number=attempt_num,
            agent_id=order.agent_id,
            scheduled_date=order.scheduled_date,
            status=DeliveryAttemptStatusEnum.FAILED,
            failure_reason=failure_reason,
            started_at=datetime.now(timezone.utc),
            completed_at=datetime.now(timezone.utc),
        )
        db.add(attempt)
        db.flush()

    log_event(
        "DELIVERY_ATTEMPT_FAILED",
        order=str(order.id),
        attempt=attempt.attempt_number,
        agent=str(attempt.agent_id),
        reason=failure_reason,
    )

    return attempt


def create_delivery_attempt(
    db: Session,
    order_id: UUID,
    agent_id: Optional[UUID] = None,
    scheduled_date=None,
) -> DeliveryAttempt:
    """Create a new delivery attempt for an order.

    Auto-calculates the attempt number.
    """
    # Get the current max attempt number
    max_attempt = (
        db.query(DeliveryAttempt.attempt_number)
        .filter(DeliveryAttempt.order_id == order_id)
        .order_by(DeliveryAttempt.attempt_number.desc())
        .first()
    )

    attempt_number = (max_attempt[0] + 1) if max_attempt else 1

    attempt = DeliveryAttempt(
        order_id=order_id,
        attempt_number=attempt_number,
        agent_id=agent_id,
        scheduled_date=scheduled_date,
        status=DeliveryAttemptStatusEnum.IN_PROGRESS,
        started_at=datetime.now(timezone.utc),
    )
    db.add(attempt)
    db.flush()

    log_event(
        "DELIVERY_ATTEMPT_CREATED",
        order=str(order_id),
        attempt=attempt_number,
        agent=str(agent_id) if agent_id else "unassigned",
    )

    return attempt
