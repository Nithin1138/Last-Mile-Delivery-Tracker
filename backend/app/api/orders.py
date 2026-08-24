"""Order API routes — create, list, status, assign, reschedule, timeline, attempts."""

import json
from decimal import Decimal
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from sqlalchemy.exc import IntegrityError
from datetime import datetime, timezone

from app.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.errors import AppError, ErrorCodes
from app.models.models import (
    User, Order, OrderStatusHistory, DeliveryAttempt, DeliveryAgent,
    AssignmentDecision, IdempotencyKey, OrderStatusEnum, RoleEnum, DeliveryAttemptStatusEnum,
    Notification,
)
from app.schemas.orders import (
    OrderCreateRequest, OrderResponse, OrderListResponse,
    StatusUpdateRequest, AssignRequest, RescheduleRequest,
    TimelineEntry, DeliveryAttemptResponse, AssignmentDecisionResponse,
    NotificationResponse,
)
from app.schemas.pricing import PriceQuoteRequest, PriceBreakdownResponse
from app.services.zone_service import resolve_pincode_to_zone
from app.services.pricing_engine import calculate_price
from app.services.order_lifecycle import (
    transition_order, create_initial_history,
    mark_delivery_attempt_failed,
)
from app.services.assignment_engine import auto_assign_order, manual_assign_order
from app.services.agent_claim import release_agent
from app.services.notification_service import (
    notify_order_created, notify_status_change, notify_delivery_failed,
    notify_order_assigned, notify_order_rescheduled,
)

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _parse_uuid(val: str, field_name: str = "ID") -> UUID:
    """Safely parse a UUID string or raise a structured 400 domain error."""
    try:
        return UUID(str(val))
    except (ValueError, AttributeError, TypeError):
        raise AppError(
            code=ErrorCodes.INVALID_ORDER_DATA,
            message=f"Invalid {field_name} format.",
            status_code=400,
        )


def _order_to_response(order: Order) -> OrderResponse:

    """Convert an Order model to an OrderResponse schema."""
    return OrderResponse(
        id=str(order.id),
        customer_id=str(order.customer_id),
        customer_name=order.customer.name if order.customer else None,
        agent_id=str(order.agent_id) if order.agent_id else None,
        agent_name=(
            order.agent.user.name
            if order.agent and order.agent.user
            else None
        ),
        pickup_address=order.pickup_address,
        pickup_pincode=order.pickup_pincode,
        pickup_zone_name=order.pickup_zone.name if order.pickup_zone else None,
        drop_address=order.drop_address,
        drop_pincode=order.drop_pincode,
        drop_zone_name=order.drop_zone.name if order.drop_zone else None,
        length_cm=float(order.length_cm),
        breadth_cm=float(order.breadth_cm),
        height_cm=float(order.height_cm),
        actual_weight_kg=float(order.actual_weight_kg),
        volumetric_weight_kg=float(order.volumetric_weight_kg),
        chargeable_weight_kg=float(order.chargeable_weight_kg),
        base_charge=float(order.base_charge),
        cod_charge=float(order.cod_charge),
        total_charge=float(order.total_charge),
        zone_type=order.zone_type.value if hasattr(order.zone_type, 'value') else order.zone_type,
        order_type=order.order_type.value if hasattr(order.order_type, 'value') else order.order_type,
        payment_type=order.payment_type.value if hasattr(order.payment_type, 'value') else order.payment_type,
        status=order.status.value if hasattr(order.status, 'value') else order.status,
        scheduled_date=order.scheduled_date.isoformat() if order.scheduled_date else None,
        created_at=order.created_at.isoformat() if order.created_at else "",
        updated_at=order.updated_at.isoformat() if order.updated_at else None,
    )


def verify_order_access(
    user: User,
    order: Order,
    db: Session,
    allow_customer: bool = True,
    allow_agent: bool = True,
):
    """
    Centralized authorization policy for order-scoped resources:
    - ADMIN: Can access any order.
    - CUSTOMER: Can only access their own order (if allow_customer=True).
    - AGENT: Can only access orders assigned to them (if allow_agent=True).
    """
    if user.role == RoleEnum.ADMIN:
        return

    if user.role == RoleEnum.CUSTOMER:
        if not allow_customer or order.customer_id != user.id:
            raise AppError(code=ErrorCodes.FORBIDDEN, message="Access denied to this order resource.", status_code=403)
        return

    if user.role == RoleEnum.AGENT:
        if not allow_agent:
            raise AppError(code=ErrorCodes.FORBIDDEN, message="Access denied to this order resource.", status_code=403)
        agent = db.query(DeliveryAgent).filter(DeliveryAgent.user_id == user.id).first()
        if not agent or order.agent_id != agent.id:
            raise AppError(code=ErrorCodes.FORBIDDEN, message="Access denied: order is not assigned to you.", status_code=403)
        return

    raise AppError(code=ErrorCodes.FORBIDDEN, message="Access denied.", status_code=403)


# ---------------------------------------------------------------------------
# Price Quote (no order created)
# ---------------------------------------------------------------------------
@router.post("/quote", response_model=PriceBreakdownResponse)
def get_price_quote(
    req: PriceQuoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Calculate a price quote without creating an order."""
    pickup_area, pickup_zone = resolve_pincode_to_zone(db, req.pickup_pincode)
    drop_area, drop_zone = resolve_pincode_to_zone(db, req.drop_pincode)

    breakdown = calculate_price(
        db=db,
        length_cm=Decimal(str(req.length_cm)),
        breadth_cm=Decimal(str(req.breadth_cm)),
        height_cm=Decimal(str(req.height_cm)),
        actual_weight_kg=Decimal(str(req.actual_weight_kg)),
        order_type=req.order_type,
        payment_type=req.payment_type,
        pickup_zone_id=pickup_zone.id,
        pickup_zone_name=pickup_zone.name,
        drop_zone_id=drop_zone.id,
        drop_zone_name=drop_zone.name,
    )

    return PriceBreakdownResponse(
        actual_weight_kg=float(breakdown.actual_weight_kg),
        volumetric_weight_kg=float(breakdown.volumetric_weight_kg),
        chargeable_weight_kg=float(breakdown.chargeable_weight_kg),
        pickup_zone_name=breakdown.pickup_zone_name,
        drop_zone_name=breakdown.drop_zone_name,
        zone_type=breakdown.zone_type,
        order_type=breakdown.order_type,
        rate_card_id=breakdown.rate_card_id,
        rate_card_version=breakdown.rate_card_version,
        base_fee=float(breakdown.base_fee),
        rate_per_kg=float(breakdown.rate_per_kg),
        weight_charge=float(breakdown.weight_charge),
        base_charge=float(breakdown.base_charge),
        cod_applicable=breakdown.cod_applicable,
        cod_flat=float(breakdown.cod_flat),
        cod_percent=float(breakdown.cod_percent),
        cod_charge=float(breakdown.cod_charge),
        total_charge=float(breakdown.total_charge),
    )


# ---------------------------------------------------------------------------
# Create Order
# ---------------------------------------------------------------------------
@router.post("", response_model=OrderResponse)
def create_order(
    req: OrderCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new order with server-side pricing calculation and atomic idempotency."""
    # Fast path: Idempotency check in DB cache (scoped to current authenticated actor)
    if req.idempotency_key:
        cached_idem = (
            db.query(IdempotencyKey)
            .filter(
                IdempotencyKey.user_id == current_user.id,
                IdempotencyKey.key == req.idempotency_key,
            )
            .first()
        )
        if cached_idem:
            return OrderResponse.model_validate_json(cached_idem.response_body)

    # Determine customer (Admin can create on behalf of customer)
    customer_id = current_user.id
    if req.customer_id and current_user.role == RoleEnum.ADMIN:
        try:
            target_uuid = UUID(req.customer_id)
        except (ValueError, AttributeError):
            raise AppError(
                code=ErrorCodes.INVALID_ORDER_DATA,
                message="Invalid customer_id format.",
                status_code=400,
            )
        target_user = db.query(User).filter(User.id == target_uuid).first()
        if not target_user:
            raise AppError(
                code=ErrorCodes.USER_NOT_FOUND,
                message="Specified customer does not exist.",
                status_code=404,
            )
        if not target_user.is_active:
            raise AppError(
                code=ErrorCodes.USER_INACTIVE,
                message="Specified customer account is inactive.",
                status_code=400,
            )
        target_role = target_user.role.value if hasattr(target_user.role, 'value') else target_user.role
        if target_role != RoleEnum.CUSTOMER.value:
            raise AppError(
                code=ErrorCodes.INVALID_ROLE,
                message="Specified user is not a customer.",
                status_code=400,
            )
        customer_id = target_user.id


    # Zone resolution
    pickup_area, pickup_zone = resolve_pincode_to_zone(db, req.pickup_pincode)
    drop_area, drop_zone = resolve_pincode_to_zone(db, req.drop_pincode)

    # Server-side pricing (never trust client-computed prices)
    breakdown = calculate_price(
        db=db,
        length_cm=Decimal(str(req.length_cm)),
        breadth_cm=Decimal(str(req.breadth_cm)),
        height_cm=Decimal(str(req.height_cm)),
        actual_weight_kg=Decimal(str(req.actual_weight_kg)),
        order_type=req.order_type,
        payment_type=req.payment_type,
        pickup_zone_id=pickup_zone.id,
        pickup_zone_name=pickup_zone.name,
        drop_zone_id=drop_zone.id,
        drop_zone_name=drop_zone.name,
    )

    # Create order with frozen pricing snapshot
    order = Order(
        customer_id=customer_id,
        pickup_address=req.pickup_address,
        pickup_pincode=req.pickup_pincode,
        pickup_zone_id=pickup_zone.id,
        pickup_latitude=req.pickup_latitude,
        pickup_longitude=req.pickup_longitude,
        drop_address=req.drop_address,
        drop_pincode=req.drop_pincode,
        drop_zone_id=drop_zone.id,
        drop_latitude=req.drop_latitude,
        drop_longitude=req.drop_longitude,
        length_cm=Decimal(str(req.length_cm)),
        breadth_cm=Decimal(str(req.breadth_cm)),
        height_cm=Decimal(str(req.height_cm)),
        actual_weight_kg=Decimal(str(req.actual_weight_kg)),
        volumetric_weight_kg=breakdown.volumetric_weight_kg,
        chargeable_weight_kg=breakdown.chargeable_weight_kg,
        base_charge=breakdown.base_charge,
        cod_charge=breakdown.cod_charge,
        total_charge=breakdown.total_charge,
        rate_card_id=UUID(breakdown.rate_card_id),
        zone_type=breakdown.zone_type,
        order_type=req.order_type,
        payment_type=req.payment_type,
        idempotency_key=req.idempotency_key,
        scheduled_date=(
            datetime.fromisoformat(req.scheduled_date)
            if req.scheduled_date
            else None
        ),
    )
    db.add(order)
    db.flush()

    # Create initial status history
    create_initial_history(db, order, current_user.id)

    # Convert to response payload for caching
    response_payload = _order_to_response(order)

    # Atomic DB-backed Idempotency key registration scoped to current user
    if req.idempotency_key:
        idem_record = IdempotencyKey(
            user_id=current_user.id,
            key=req.idempotency_key,
            response_status=200,
            response_body=response_payload.model_dump_json(),
        )
        db.add(idem_record)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Concurrent duplicate request with identical idempotency key for this user — return the stored response cleanly!
        if req.idempotency_key:
            existing = (
                db.query(IdempotencyKey)
                .filter(
                    IdempotencyKey.user_id == current_user.id,
                    IdempotencyKey.key == req.idempotency_key,
                )
                .first()
            )
            if existing:
                return OrderResponse.model_validate_json(existing.response_body)
            existing_order = (
                db.query(Order)
                .filter(
                    Order.customer_id == current_user.id,
                    Order.idempotency_key == req.idempotency_key,
                )
                .first()
            )
            if existing_order:
                return _order_to_response(existing_order)
        raise AppError(code=ErrorCodes.CONFLICT, message="Concurrent duplicate request.", status_code=409)

    # Post-commit: Attempt automatic agent assignment.
    # The order is already safely committed above — assignment failure NEVER destroys it.
    # Mirrors the exact same two-transaction pattern used in reschedule_order().
    try:
        auto_assign_order(db, order, current_user.id)
        db.commit()  # ASSIGNED status + Delivery Attempt #1 written atomically
    except AppError:
        pass  # NO_AVAILABLE_AGENT or other error — order stays CREATED; Admin can retry

    # Notify customer after successful order commit (always runs regardless of assignment)
    db.refresh(order)
    customer = db.query(User).filter(User.id == customer_id).first()
    if customer:
        notify_order_created(db, order, customer)
        # If auto-assignment succeeded, also send an assignment notification
        if order.agent_id:
            agent_obj = db.query(DeliveryAgent).options(
                joinedload(DeliveryAgent.user)
            ).filter(DeliveryAgent.id == order.agent_id).first()
            agent_name = agent_obj.user.name if agent_obj and agent_obj.user else "Agent"
            notify_order_assigned(db, order, customer, agent_name)
        db.commit()

    db.refresh(order)
    return _order_to_response(order)


# ---------------------------------------------------------------------------
# List Orders (role-scoped)
# ---------------------------------------------------------------------------
@router.get("", response_model=OrderListResponse)
def list_orders(
    status: Optional[str] = Query(None),
    zone_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None),
    customer_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List orders with filtering, role-scoped."""
    query = db.query(Order).options(
        joinedload(Order.customer),
        joinedload(Order.agent).joinedload(DeliveryAgent.user),
        joinedload(Order.pickup_zone),
        joinedload(Order.drop_zone),
    )

    # Strict role scoping
    if current_user.role == RoleEnum.CUSTOMER:
        query = query.filter(Order.customer_id == current_user.id)
    elif current_user.role == RoleEnum.AGENT:
        agent = db.query(DeliveryAgent).filter(DeliveryAgent.user_id == current_user.id).first()
        if agent:
            query = query.filter(Order.agent_id == agent.id)
        else:
            query = query.filter(Order.id == None)  # No agent profile = no orders

    # Filters
    if status:
        query = query.filter(Order.status == status)
    if zone_id:
        parsed_zone = _parse_uuid(zone_id, "zone ID")
        query = query.filter(
            (Order.pickup_zone_id == parsed_zone) | (Order.drop_zone_id == parsed_zone)
        )
    if agent_id and current_user.role == RoleEnum.ADMIN:
        parsed_agent_id = _parse_uuid(agent_id, "agent ID")
        # Support filtering by either DeliveryAgent.id or DeliveryAgent.user_id
        agent_record = db.query(DeliveryAgent).filter(
            (DeliveryAgent.id == parsed_agent_id) | (DeliveryAgent.user_id == parsed_agent_id)
        ).first()
        if agent_record:
            query = query.filter(Order.agent_id == agent_record.id)
        else:
            query = query.filter(Order.agent_id == parsed_agent_id)
    if customer_id and current_user.role == RoleEnum.ADMIN:
        query = query.filter(Order.customer_id == _parse_uuid(customer_id, "customer ID"))
    if search:
        query = query.filter(
            Order.pickup_address.ilike(f"%{search}%")
            | Order.drop_address.ilike(f"%{search}%")
            | Order.pickup_pincode.ilike(f"%{search}%")
            | Order.drop_pincode.ilike(f"%{search}%")
        )

    total = query.count()
    orders = (
        query.order_by(desc(Order.created_at))
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return OrderListResponse(
        orders=[_order_to_response(o) for o in orders],
        total=total,
        page=page,
        page_size=page_size,
    )


# ---------------------------------------------------------------------------
# Get Single Order
# ---------------------------------------------------------------------------
@router.get("/{order_id}", response_model=OrderResponse)
def get_order(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get a single order by ID with centralized authorization."""
    order = (
        db.query(Order)
        .options(
            joinedload(Order.customer),
            joinedload(Order.agent).joinedload(DeliveryAgent.user),
            joinedload(Order.pickup_zone),
            joinedload(Order.drop_zone),
        )
        .filter(Order.id == _parse_uuid(order_id, "order ID"))
        .first()
    )

    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Centralized authorization enforcement
    verify_order_access(current_user, order, db)

    return _order_to_response(order)


# ---------------------------------------------------------------------------
# Update Status (Protected RBAC)
# ---------------------------------------------------------------------------
@router.post("/{order_id}/status")
@router.patch("/{order_id}/status")
def update_order_status(

    order_id: str,
    req: StatusUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update order status.
    - CUSTOMER: Strictly forbidden (403).
    - AGENT: Only allowed for orders assigned to this agent.
    - ADMIN: Allowed for all orders (can supply admin_override).
    """
    order = db.query(Order).filter(Order.id == _parse_uuid(order_id, "order ID")).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # 1. Customers are NEVER allowed to update delivery status
    if current_user.role == RoleEnum.CUSTOMER:
        raise AppError(
            code=ErrorCodes.FORBIDDEN,
            message="Customers are not authorized to update order delivery status.",
            status_code=403,
        )

    # 2. Agents can ONLY update orders assigned to them
    if current_user.role == RoleEnum.AGENT:
        agent = db.query(DeliveryAgent).filter(DeliveryAgent.user_id == current_user.id).first()
        if not agent or order.agent_id != agent.id:
            raise AppError(
                code=ErrorCodes.FORBIDDEN,
                message="Agents can only update status on orders assigned to them.",
                status_code=403,
            )

    admin_override = req.admin_override and current_user.role == RoleEnum.ADMIN

    # Handle FAILED status specially
    if req.status == OrderStatusEnum.FAILED.value:
        if not req.failure_reason:
            raise AppError(
                code=ErrorCodes.INVALID_ORDER_DATA,
                message="failure_reason is required when marking order as FAILED.",
                status_code=400,
            )
        transition_order(
            db, order, req.status,
            changed_by=current_user.id,
            reason=req.failure_reason,
            admin_override=admin_override,
        )
        mark_delivery_attempt_failed(db, order, req.failure_reason, current_user.id)

        # Notify customer
        customer = db.query(User).filter(User.id == order.customer_id).first()
        if customer:
            notify_delivery_failed(db, order, customer, req.failure_reason)
    else:
        transition_order(
            db, order, req.status,
            changed_by=current_user.id,
            reason=req.reason,
            admin_override=admin_override,
        )

        # Release agent capacity on terminal states (DELIVERED or CANCELLED)
        if req.status in [OrderStatusEnum.DELIVERED.value, OrderStatusEnum.CANCELLED.value]:
            if order.agent_id:
                release_agent(db, order.agent_id)

        # Mark delivery attempt as delivered
        if req.status == OrderStatusEnum.DELIVERED.value:
            attempt = (
                db.query(DeliveryAttempt)
                .filter(
                    DeliveryAttempt.order_id == order.id,
                    DeliveryAttempt.status == DeliveryAttemptStatusEnum.IN_PROGRESS,
                )
                .order_by(desc(DeliveryAttempt.attempt_number))
                .first()
            )
            if attempt:
                attempt.status = DeliveryAttemptStatusEnum.DELIVERED
                attempt.completed_at = datetime.now(timezone.utc)

        # Notify customer
        customer = db.query(User).filter(User.id == order.customer_id).first()
        if customer:
            notify_status_change(db, order, customer, req.status)

    db.commit()
    return {"message": f"Order status updated to {req.status}"}


# ---------------------------------------------------------------------------
# Assign Agent (Admin Only)
# ---------------------------------------------------------------------------
@router.post("/{order_id}/assign")
def assign_order(
    order_id: str,
    req: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Acquire pessimistic row-level lock on the target order to prevent duplicate concurrent assignment
    order = (
        db.query(Order)
        .filter(Order.id == _parse_uuid(order_id, "order ID"))
        .with_for_update()
        .first()
    )
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    current_status = order.status.value if hasattr(order.status, 'value') else order.status
    if current_status not in [OrderStatusEnum.CREATED.value, OrderStatusEnum.RESCHEDULED.value]:
        raise AppError(
            code=ErrorCodes.INVALID_STATUS_TRANSITION,
            message=f"Cannot assign agent to order in {current_status} status.",
            status_code=400,
        )

    if req.mode == "manual" and req.agent_id:
        decision = manual_assign_order(db, order, _parse_uuid(req.agent_id, "agent ID"), current_user.id)
    else:
        decision = auto_assign_order(db, order, current_user.id)

    # Resolve assigned agent name for notification + response
    agent = db.query(DeliveryAgent).options(
        joinedload(DeliveryAgent.user)
    ).filter(DeliveryAgent.id == order.agent_id).first()
    agent_name = agent.user.name if agent and agent.user else "Agent"

    # Notify customer
    if order.customer:
        notify_order_assigned(db, order, order.customer, agent_name)

    db.commit()

    return {
        "message": "Agent assigned successfully",
        "decision": {
            "agent_id": str(decision.selected_agent_id),
            "selected_agent_name": agent_name,
            "selection_mode": decision.selection_mode.value,
            "candidate_count": decision.candidate_count,
            "selected_distance_km": decision.selected_distance_km,
            "reason": decision.reason,
        },
    }


# ---------------------------------------------------------------------------
# Reschedule Failed Delivery
# ---------------------------------------------------------------------------
@router.post("/{order_id}/reschedule")
def reschedule_order(
    order_id: str,
    req: RescheduleRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reschedule a failed delivery — allowed for Customer (own order) or Admin.

    Complete failed-delivery flow:
    1. Transition order FAILED → RESCHEDULED
    2. Release previous agent (freed for new orders)
    3. Auto-assign nearest available agent (creates Attempt #2)
    4. Notify customer (rescheduled + new assignment)

    If no agent is currently available, the order stays RESCHEDULED and can be
    manually assigned via POST /api/orders/{id}/assign.
    """
    order = db.query(Order).filter(Order.id == _parse_uuid(order_id, "order ID")).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Authorization: Customer must own order; agents cannot reschedule
    verify_order_access(current_user, order, db, allow_agent=False)

    current_status = order.status.value if hasattr(order.status, 'value') else order.status
    if current_status != OrderStatusEnum.FAILED.value:
        raise AppError(
            code=ErrorCodes.INVALID_STATUS_TRANSITION,
            message="Only failed orders can be rescheduled.",
            status_code=400,
        )

    # Parse new date
    try:
        new_date = datetime.fromisoformat(req.new_scheduled_date)
    except ValueError:
        raise AppError(
            code=ErrorCodes.INVALID_ORDER_DATA,
            message="Invalid date format. Use ISO format (YYYY-MM-DDTHH:MM:SS).",
            status_code=400,
        )

    # Step 1: Transition to RESCHEDULED
    transition_order(
        db, order, OrderStatusEnum.RESCHEDULED.value,
        changed_by=current_user.id,
        reason=req.reason or f"Rescheduled to {req.new_scheduled_date}",
    )

    order.scheduled_date = new_date

    # Step 2: Release previous agent
    if order.agent_id:
        release_agent(db, order.agent_id)
        order.agent_id = None

    # Notify customer of successful reschedule
    customer = db.query(User).filter(User.id == order.customer_id).first()
    if customer:
        notify_order_rescheduled(db, order, customer, req.new_scheduled_date)

    db.flush()  # Flush reschedule state before attempting assignment

    # Step 3: Auto-assign nearest available agent (creates Attempt #2)
    # Determine the actor for assignment — admin if admin triggered, otherwise system
    assigning_user_id = current_user.id
    assignment_result = None
    try:
        decision = auto_assign_order(db, order, assigning_user_id)
        assignment_result = {
            "agent_id": str(decision.selected_agent_id),
            "mode": decision.selection_mode.value,
            "distance_km": decision.selected_distance_km,
            "reason": decision.reason,
        }
        # Step 4: Notify customer of new agent assignment
        if customer and order.agent_id:
            agent = db.query(DeliveryAgent).options(
                joinedload(DeliveryAgent.user)
            ).filter(DeliveryAgent.id == order.agent_id).first()
            agent_name = agent.user.name if agent and agent.user else "Agent"
            notify_order_assigned(db, order, customer, agent_name)
    except AppError as e:
        if e.code == ErrorCodes.NO_AVAILABLE_AGENT:
            # Expected no-agent condition: order remains RESCHEDULED for manual assignment
            assignment_result = None
        else:
            # Unexpected assignment errors must propagate to caller
            raise


    db.commit()

    if assignment_result:
        return {
            "message": "Order rescheduled and reassigned successfully.",
            "new_scheduled_date": req.new_scheduled_date,
            "assignment": assignment_result,
        }
    return {
        "message": "Order rescheduled. No available agent at this time — use /assign to manually assign.",
        "new_scheduled_date": req.new_scheduled_date,
        "assignment": None,
    }



# ---------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------
@router.get("/{order_id}/timeline", response_model=list[TimelineEntry])
def get_order_timeline(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the complete status timeline for an order with RBAC."""
    parsed_id = _parse_uuid(order_id, "order ID")
    order = db.query(Order).filter(Order.id == parsed_id).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Centralized authorization enforcement
    verify_order_access(current_user, order, db)

    history = (
        db.query(OrderStatusHistory)
        .options(joinedload(OrderStatusHistory.actor))
        .filter(OrderStatusHistory.order_id == parsed_id)
        .order_by(OrderStatusHistory.created_at)
        .all()
    )

    return [
        TimelineEntry(
            id=str(h.id),
            previous_status=h.previous_status,
            new_status=h.new_status,
            changed_by=str(h.changed_by) if h.changed_by else None,
            actor_name=h.actor.name if h.actor else None,
            reason=h.reason,
            created_at=h.created_at.isoformat(),
        )
        for h in history
    ]


# ---------------------------------------------------------------------------
# Delivery Attempts
# ---------------------------------------------------------------------------
@router.get("/{order_id}/attempts", response_model=list[DeliveryAttemptResponse])
def get_delivery_attempts(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all delivery attempts for an order with RBAC."""
    parsed_id = _parse_uuid(order_id, "order ID")
    order = db.query(Order).filter(Order.id == parsed_id).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Centralized authorization enforcement
    verify_order_access(current_user, order, db)

    attempts = (
        db.query(DeliveryAttempt)
        .options(joinedload(DeliveryAttempt.agent).joinedload(DeliveryAgent.user))
        .filter(DeliveryAttempt.order_id == parsed_id)
        .order_by(DeliveryAttempt.attempt_number)
        .all()
    )

    return [
        DeliveryAttemptResponse(
            id=str(a.id),
            order_id=str(a.order_id),
            attempt_number=a.attempt_number,
            agent_id=str(a.agent_id) if a.agent_id else None,
            agent_name=a.agent.user.name if a.agent and a.agent.user else None,
            scheduled_date=a.scheduled_date.isoformat() if a.scheduled_date else None,
            started_at=a.started_at.isoformat() if a.started_at else None,
            completed_at=a.completed_at.isoformat() if a.completed_at else None,
            status=a.status.value if hasattr(a.status, 'value') else a.status,
            failure_reason=a.failure_reason,
            created_at=a.created_at.isoformat(),
        )
        for a in attempts
    ]


# ---------------------------------------------------------------------------
# Assignment Decisions
# ---------------------------------------------------------------------------
@router.get("/{order_id}/assignments", response_model=list[AssignmentDecisionResponse])
@router.get("/{order_id}/assignment-decision", response_model=list[AssignmentDecisionResponse])
def get_assignment_decisions(

    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get assignment decisions for an order with RBAC."""
    parsed_id = _parse_uuid(order_id, "order ID")
    order = db.query(Order).filter(Order.id == parsed_id).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Centralized authorization enforcement
    verify_order_access(current_user, order, db)

    decisions = (
        db.query(AssignmentDecision)
        .filter(AssignmentDecision.order_id == parsed_id)
        .order_by(AssignmentDecision.created_at)
        .all()
    )

    result = []
    for d in decisions:
        agent = db.query(DeliveryAgent).options(
            joinedload(DeliveryAgent.user)
        ).filter(DeliveryAgent.id == d.selected_agent_id).first() if d.selected_agent_id else None

        from app.models.models import Zone
        pickup_zone = db.query(Zone).filter(Zone.id == d.pickup_zone_id).first() if d.pickup_zone_id else None
        agent_zone = db.query(Zone).filter(Zone.id == d.selected_agent_zone_id).first() if d.selected_agent_zone_id else None

        candidates = json.loads(d.candidates_json) if d.candidates_json else None

        result.append(AssignmentDecisionResponse(
            id=str(d.id),
            order_id=str(d.order_id),
            selected_agent_id=str(d.selected_agent_id) if d.selected_agent_id else None,
            selected_agent_name=agent.user.name if agent and agent.user else None,
            selection_mode=d.selection_mode.value if hasattr(d.selection_mode, 'value') else d.selection_mode,
            candidate_count=d.candidate_count,
            selected_distance_km=d.selected_distance_km,
            pickup_zone_name=pickup_zone.name if pickup_zone else None,
            selected_agent_zone_name=agent_zone.name if agent_zone else None,
            reason=d.reason,
            candidates=candidates,
            created_at=d.created_at.isoformat(),
        ))

    return result


# ---------------------------------------------------------------------------
# Order Notifications Audit Trail (Transactional Email)
# ---------------------------------------------------------------------------
@router.get("/{order_id}/notifications", response_model=list[NotificationResponse])
def get_order_notifications(
    order_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all dispatched transactional email notifications for an order with RBAC."""
    parsed_id = _parse_uuid(order_id, "order ID")
    order = db.query(Order).filter(Order.id == parsed_id).first()
    if not order:
        raise AppError(code=ErrorCodes.ORDER_NOT_FOUND, message="Order not found.", status_code=404)

    # Centralized authorization enforcement
    verify_order_access(current_user, order, db)

    notifications = (
        db.query(Notification)
        .filter(Notification.order_id == parsed_id)
        .order_by(desc(Notification.created_at))
        .all()
    )

    return [
        NotificationResponse(
            id=str(n.id),
            order_id=str(n.order_id) if n.order_id else None,
            notification_type=n.notification_type,
            channel=n.channel,
            subject=n.subject,
            body=n.body,
            status=n.status.value if hasattr(n.status, 'value') else n.status,
            error_message=n.error_message,
            created_at=n.created_at.isoformat(),
        )
        for n in notifications
    ]

