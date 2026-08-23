"""Admin API routes — zones, areas, rate cards, COD surcharges, agents, dashboard."""

from datetime import datetime, timezone, timedelta
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc

from app.database import get_db
from app.core.deps import require_admin, get_current_user
from app.core.errors import AppError, ErrorCodes
from app.core.events import log_event
from app.models.models import (
    User, Zone, Area, RateCard, CODSurcharge, Order, DeliveryAgent,
    DeliveryAttempt, OrderStatusHistory, OrderStatusEnum, RoleEnum,
    AgentStatusEnum, DeliveryAttemptStatusEnum,
)
from app.schemas.zones import (
    ZoneCreateRequest, ZoneResponse, AreaCreateRequest, AreaResponse,
    RateCardCreateRequest, RateCardUpdateRequest, RateCardResponse,
    CODSurchargeCreateRequest, CODSurchargeResponse,
)
from app.schemas.agents import AgentCreateRequest, AgentUpdateRequest, AgentResponse
from app.core.security import hash_password

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------
@router.get("/zones", response_model=list[ZoneResponse])
def list_zones(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    zones = db.query(Zone).all()
    return [
        ZoneResponse(
            id=str(z.id),
            name=z.name,
            is_active=z.is_active,
            area_count=len(z.areas) if z.areas else 0,
        )
        for z in zones
    ]


@router.post("/zones", response_model=ZoneResponse)
def create_zone(
    req: ZoneCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Zone).filter(Zone.name == req.name).first()
    if existing:
        raise AppError(code=ErrorCodes.VALIDATION_ERROR, message="Zone name already exists.", status_code=409)

    zone = Zone(name=req.name)
    db.add(zone)
    db.commit()
    db.refresh(zone)
    return ZoneResponse(id=str(zone.id), name=zone.name, is_active=zone.is_active, area_count=0)


# ---------------------------------------------------------------------------
# Areas
# ---------------------------------------------------------------------------
@router.get("/areas", response_model=list[AreaResponse])
def list_areas(
    zone_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(Area).options(joinedload(Area.zone))
    if zone_id:
        query = query.filter(Area.zone_id == UUID(zone_id))
    areas = query.all()
    return [
        AreaResponse(
            id=str(a.id),
            pincode=a.pincode,
            name=a.name,
            zone_id=str(a.zone_id),
            zone_name=a.zone.name if a.zone else None,
            is_active=a.is_active,
        )
        for a in areas
    ]


@router.post("/areas", response_model=AreaResponse)
def create_area(
    req: AreaCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    existing = db.query(Area).filter(Area.pincode == req.pincode).first()
    if existing:
        raise AppError(code=ErrorCodes.VALIDATION_ERROR, message=f"Pincode {req.pincode} already mapped.", status_code=409)

    zone = db.query(Zone).filter(Zone.id == UUID(req.zone_id)).first()
    if not zone:
        raise AppError(code=ErrorCodes.ZONE_NOT_FOUND, message="Zone not found.", status_code=404)

    area = Area(pincode=req.pincode, name=req.name, zone_id=zone.id)
    db.add(area)
    db.commit()
    db.refresh(area)
    return AreaResponse(
        id=str(area.id), pincode=area.pincode, name=area.name,
        zone_id=str(area.zone_id), zone_name=zone.name, is_active=area.is_active,
    )


# ---------------------------------------------------------------------------
# Rate Cards (versioned — supersede, never mutate)
# ---------------------------------------------------------------------------
@router.get("/rate-cards", response_model=list[RateCardResponse])
def list_rate_cards(
    active_only: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    query = db.query(RateCard)
    if active_only:
        query = query.filter(RateCard.is_active == True)
    cards = query.order_by(RateCard.order_type, RateCard.zone_type, desc(RateCard.version)).all()
    return [
        RateCardResponse(
            id=str(c.id), order_type=c.order_type.value, zone_type=c.zone_type.value,
            base_fee=float(c.base_fee), rate_per_kg=float(c.rate_per_kg),
            is_active=c.is_active, version=c.version,
            effective_from=c.effective_from.isoformat() if c.effective_from else None,
            effective_to=c.effective_to.isoformat() if c.effective_to else None,
        )
        for c in cards
    ]


@router.post("/rate-cards", response_model=RateCardResponse)
def create_rate_card(
    req: RateCardCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Deactivate existing active card for this combo
    existing = (
        db.query(RateCard)
        .filter(RateCard.order_type == req.order_type, RateCard.zone_type == req.zone_type, RateCard.is_active == True)
        .first()
    )
    version = 1
    if existing:
        existing.is_active = False
        existing.effective_to = datetime.now(timezone.utc)
        version = existing.version + 1
        log_event(
            "RATE_CARD_SUPERSEDED",
            old_version=existing.version,
            new_version=version,
            order_type=req.order_type,
            zone_type=req.zone_type,
        )

    card = RateCard(
        order_type=req.order_type,
        zone_type=req.zone_type,
        base_fee=req.base_fee,
        rate_per_kg=req.rate_per_kg,
        version=version,
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return RateCardResponse(
        id=str(card.id), order_type=card.order_type.value, zone_type=card.zone_type.value,
        base_fee=float(card.base_fee), rate_per_kg=float(card.rate_per_kg),
        is_active=card.is_active, version=card.version,
        effective_from=card.effective_from.isoformat() if card.effective_from else None,
        effective_to=card.effective_to.isoformat() if card.effective_to else None,
    )


@router.put("/rate-cards/{card_id}", response_model=RateCardResponse)
def update_rate_card(
    card_id: str,
    req: RateCardUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Update a rate card by creating a new version (supersede, never mutate)."""
    old_card = db.query(RateCard).filter(RateCard.id == UUID(card_id)).first()
    if not old_card:
        raise AppError(code=ErrorCodes.RATE_CARD_NOT_FOUND, message="Rate card not found.", status_code=404)

    old_card.is_active = False
    old_card.effective_to = datetime.now(timezone.utc)

    new_card = RateCard(
        order_type=old_card.order_type,
        zone_type=old_card.zone_type,
        base_fee=req.base_fee if req.base_fee is not None else old_card.base_fee,
        rate_per_kg=req.rate_per_kg if req.rate_per_kg is not None else old_card.rate_per_kg,
        version=old_card.version + 1,
    )
    db.add(new_card)

    log_event(
        "RATE_CARD_SUPERSEDED",
        old_version=old_card.version,
        new_version=new_card.version,
        order_type=old_card.order_type.value,
        zone_type=old_card.zone_type.value,
    )

    db.commit()
    db.refresh(new_card)
    return RateCardResponse(
        id=str(new_card.id), order_type=new_card.order_type.value, zone_type=new_card.zone_type.value,
        base_fee=float(new_card.base_fee), rate_per_kg=float(new_card.rate_per_kg),
        is_active=new_card.is_active, version=new_card.version,
        effective_from=new_card.effective_from.isoformat() if new_card.effective_from else None,
        effective_to=new_card.effective_to.isoformat() if new_card.effective_to else None,
    )


# ---------------------------------------------------------------------------
# COD Surcharges
# ---------------------------------------------------------------------------
@router.get("/cod-surcharges", response_model=list[CODSurchargeResponse])
def list_cod_surcharges(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    surcharges = db.query(CODSurcharge).filter(CODSurcharge.is_active == True).all()
    return [
        CODSurchargeResponse(
            id=str(s.id), order_type=s.order_type.value,
            flat_amount=float(s.flat_amount), percent_of_base=float(s.percent_of_base),
            is_active=s.is_active,
        )
        for s in surcharges
    ]


@router.post("/cod-surcharges", response_model=CODSurchargeResponse)
def create_cod_surcharge(
    req: CODSurchargeCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Deactivate existing
    existing = db.query(CODSurcharge).filter(
        CODSurcharge.order_type == req.order_type, CODSurcharge.is_active == True
    ).first()
    if existing:
        existing.is_active = False

    surcharge = CODSurcharge(
        order_type=req.order_type,
        flat_amount=req.flat_amount,
        percent_of_base=req.percent_of_base,
    )
    db.add(surcharge)
    db.commit()
    db.refresh(surcharge)
    return CODSurchargeResponse(
        id=str(surcharge.id), order_type=surcharge.order_type.value,
        flat_amount=float(surcharge.flat_amount), percent_of_base=float(surcharge.percent_of_base),
        is_active=surcharge.is_active,
    )


# ---------------------------------------------------------------------------
# Agent Management
# ---------------------------------------------------------------------------
@router.get("/agents", response_model=list[AgentResponse])
def list_agents(db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    agents = (
        db.query(DeliveryAgent)
        .options(joinedload(DeliveryAgent.user), joinedload(DeliveryAgent.current_zone))
        .all()
    )
    return [
        AgentResponse(
            id=str(a.id), user_id=str(a.user_id),
            name=a.user.name if a.user else "", email=a.user.email if a.user else "",
            phone=a.user.phone if a.user else None,
            availability_status=a.availability_status.value,
            max_capacity=a.max_capacity, current_load=a.current_load,
            latitude=a.latitude, longitude=a.longitude,
            current_zone_id=str(a.current_zone_id) if a.current_zone_id else None,
            current_zone_name=a.current_zone.name if a.current_zone else None,
            is_active=a.is_active,
        )
        for a in agents
    ]


@router.post("/agents", response_model=AgentResponse)
def create_agent(
    req: AgentCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    # Check email
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise AppError(code=ErrorCodes.EMAIL_ALREADY_EXISTS, message="Email already in use.", status_code=409)

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        phone=req.phone,
        role=RoleEnum.AGENT,
    )
    db.add(user)
    db.flush()

    agent = DeliveryAgent(
        user_id=user.id,
        latitude=req.latitude,
        longitude=req.longitude,
        current_zone_id=UUID(req.zone_id) if req.zone_id else None,
        max_capacity=req.max_capacity,
        availability_status=AgentStatusEnum.AVAILABLE,
    )
    db.add(agent)
    db.commit()
    db.refresh(agent)
    db.refresh(user)

    zone = db.query(Zone).filter(Zone.id == agent.current_zone_id).first() if agent.current_zone_id else None

    return AgentResponse(
        id=str(agent.id), user_id=str(user.id),
        name=user.name, email=user.email, phone=user.phone,
        availability_status=agent.availability_status.value,
        max_capacity=agent.max_capacity, current_load=agent.current_load,
        latitude=agent.latitude, longitude=agent.longitude,
        current_zone_id=str(agent.current_zone_id) if agent.current_zone_id else None,
        current_zone_name=zone.name if zone else None,
        is_active=agent.is_active,
    )


@router.patch("/agents/{agent_id}", response_model=AgentResponse)
def update_agent(
    agent_id: str,
    req: AgentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    agent = db.query(DeliveryAgent).options(
        joinedload(DeliveryAgent.user), joinedload(DeliveryAgent.current_zone)
    ).filter(DeliveryAgent.id == UUID(agent_id)).first()

    if not agent:
        raise AppError(code=ErrorCodes.AGENT_NOT_FOUND, message="Agent not found.", status_code=404)

    if req.availability_status is not None:
        agent.availability_status = req.availability_status
    if req.latitude is not None:
        agent.latitude = req.latitude
    if req.longitude is not None:
        agent.longitude = req.longitude
    if req.zone_id is not None:
        agent.current_zone_id = UUID(req.zone_id)
    if req.max_capacity is not None:
        agent.max_capacity = req.max_capacity
    if req.is_active is not None:
        agent.is_active = req.is_active

    db.commit()
    db.refresh(agent)

    return AgentResponse(
        id=str(agent.id), user_id=str(agent.user_id),
        name=agent.user.name if agent.user else "", email=agent.user.email if agent.user else "",
        phone=agent.user.phone if agent.user else None,
        availability_status=agent.availability_status.value if hasattr(agent.availability_status, 'value') else agent.availability_status,
        max_capacity=agent.max_capacity, current_load=agent.current_load,
        latitude=agent.latitude, longitude=agent.longitude,
        current_zone_id=str(agent.current_zone_id) if agent.current_zone_id else None,
        current_zone_name=agent.current_zone.name if agent.current_zone else None,
        is_active=agent.is_active,
    )


# ---------------------------------------------------------------------------
# Agent self-service
# ---------------------------------------------------------------------------
agents_self_router = APIRouter(prefix="/api/agents", tags=["agents"])


@agents_self_router.get("/me")
def get_agent_self(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the current agent's profile, zone, and duty status."""
    if current_user.role != RoleEnum.AGENT:
        raise AppError(code=ErrorCodes.FORBIDDEN, message="Only agents can access this endpoint.", status_code=403)

    agent = db.query(DeliveryAgent).filter(DeliveryAgent.user_id == current_user.id).first()
    if not agent:
        # Auto-create delivery agent record if missing
        agent = DeliveryAgent(user_id=current_user.id, availability_status=AgentStatusEnum.AVAILABLE)
        db.add(agent)
        db.commit()
        db.refresh(agent)

    zone = db.query(Zone).filter(Zone.id == agent.current_zone_id).first() if agent.current_zone_id else None

    return {
        "id": str(agent.id),
        "user_id": str(current_user.id),
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "availability_status": agent.availability_status.value if hasattr(agent.availability_status, 'value') else agent.availability_status,
        "max_capacity": agent.max_capacity,
        "current_load": agent.current_load,
        "latitude": agent.latitude,
        "longitude": agent.longitude,
        "current_zone_id": str(agent.current_zone_id) if agent.current_zone_id else None,
        "current_zone_name": zone.name if zone else None,
    }


@agents_self_router.put("/me")
def update_agent_self(
    req: AgentUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Agent updates their own availability, location, operational zone, etc."""
    if current_user.role != RoleEnum.AGENT:
        raise AppError(code=ErrorCodes.FORBIDDEN, message="Only agents can update their own profile.", status_code=403)

    agent = db.query(DeliveryAgent).filter(DeliveryAgent.user_id == current_user.id).first()
    if not agent:
        agent = DeliveryAgent(user_id=current_user.id, availability_status=AgentStatusEnum.AVAILABLE)
        db.add(agent)
        db.commit()
        db.refresh(agent)

    if req.availability_status is not None:
        agent.availability_status = req.availability_status
    if req.latitude is not None:
        agent.latitude = req.latitude
    if req.longitude is not None:
        agent.longitude = req.longitude
    if req.zone_id is not None:
        agent.current_zone_id = UUID(req.zone_id) if req.zone_id else None

    db.commit()
    db.refresh(agent)

    zone = db.query(Zone).filter(Zone.id == agent.current_zone_id).first() if agent.current_zone_id else None

    return {
        "id": str(agent.id),
        "availability_status": agent.availability_status.value if hasattr(agent.availability_status, 'value') else agent.availability_status,
        "current_zone_id": str(agent.current_zone_id) if agent.current_zone_id else None,
        "current_zone_name": zone.name if zone else None,
        "message": "Agent profile updated",
    }


# ---------------------------------------------------------------------------
# Dashboard Metrics
# ---------------------------------------------------------------------------
@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Dashboard metrics — real data only, no fake numbers."""
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Order counts by status
    status_counts = dict(
        db.query(Order.status, func.count(Order.id))
        .group_by(Order.status)
        .all()
    )

    # Normalize enum keys
    normalized_counts = {}
    for k, v in status_counts.items():
        key = k.value if hasattr(k, 'value') else k
        normalized_counts[key] = v

    # Delivered today
    delivered_today = (
        db.query(func.count(OrderStatusHistory.id))
        .filter(
            OrderStatusHistory.new_status == OrderStatusEnum.DELIVERED.value,
            OrderStatusHistory.created_at >= today_start,
        )
        .scalar()
    )

    # Failed attempts today
    failed_today = (
        db.query(func.count(DeliveryAttempt.id))
        .filter(
            DeliveryAttempt.status == DeliveryAttemptStatusEnum.FAILED,
            DeliveryAttempt.completed_at >= today_start,
        )
        .scalar()
    )

    # Agent availability
    agent_stats = dict(
        db.query(DeliveryAgent.availability_status, func.count(DeliveryAgent.id))
        .filter(DeliveryAgent.is_active == True)
        .group_by(DeliveryAgent.availability_status)
        .all()
    )
    normalized_agent_stats = {}
    for k, v in agent_stats.items():
        key = k.value if hasattr(k, 'value') else k
        normalized_agent_stats[key] = v

    # Total orders
    total_orders = db.query(func.count(Order.id)).scalar()

    # Average delivery time (for delivered orders)
    avg_delivery_time = None
    delivered_orders = (
        db.query(Order)
        .filter(Order.status == OrderStatusEnum.DELIVERED)
        .limit(100)
        .all()
    )
    if delivered_orders:
        times = []
        for o in delivered_orders:
            # Find CREATED and DELIVERED timestamps
            created_h = (
                db.query(OrderStatusHistory)
                .filter(OrderStatusHistory.order_id == o.id, OrderStatusHistory.new_status == "CREATED")
                .first()
            )
            delivered_h = (
                db.query(OrderStatusHistory)
                .filter(OrderStatusHistory.order_id == o.id, OrderStatusHistory.new_status == "DELIVERED")
                .first()
            )
            if created_h and delivered_h:
                delta = (delivered_h.created_at - created_h.created_at).total_seconds() / 3600
                times.append(round(delta, 1))
        if times:
            avg_delivery_time = round(sum(times) / len(times), 1)

    # Recent activity
    recent = (
        db.query(OrderStatusHistory)
        .options(joinedload(OrderStatusHistory.actor))
        .order_by(desc(OrderStatusHistory.created_at))
        .limit(10)
        .all()
    )

    return {
        "total_orders": total_orders,
        "orders_by_status": normalized_counts,
        "delivered_today": delivered_today or 0,
        "failed_today": failed_today or 0,
        "agents": normalized_agent_stats,
        "total_agents": sum(normalized_agent_stats.values()) if normalized_agent_stats else 0,
        "avg_delivery_time_hours": avg_delivery_time,
        "recent_activity": [
            {
                "id": str(h.id),
                "order_id": str(h.order_id),
                "previous_status": h.previous_status,
                "new_status": h.new_status,
                "actor_name": h.actor.name if h.actor else None,
                "reason": h.reason,
                "created_at": h.created_at.isoformat(),
            }
            for h in recent
        ],
    }
