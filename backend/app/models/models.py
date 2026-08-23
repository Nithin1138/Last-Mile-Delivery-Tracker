"""
Database models for the Last-Mile Delivery Tracker.

All tables defined in one file for clarity and easy reference.
Uses PostgreSQL-specific features (UUID, enums) intentionally.
"""

import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    Index,
    CheckConstraint,
    UniqueConstraint,
    Enum,
    Numeric,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------
class RoleEnum(str, enum.Enum):
    CUSTOMER = "CUSTOMER"
    AGENT = "AGENT"
    ADMIN = "ADMIN"


class OrderTypeEnum(str, enum.Enum):
    B2B = "B2B"
    B2C = "B2C"


class ZoneRelationEnum(str, enum.Enum):
    INTRA = "INTRA"
    INTER = "INTER"


class AgentStatusEnum(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    BUSY = "BUSY"
    OFFLINE = "OFFLINE"


class PaymentTypeEnum(str, enum.Enum):
    PREPAID = "PREPAID"
    COD = "COD"


class OrderStatusEnum(str, enum.Enum):
    CREATED = "CREATED"
    ASSIGNED = "ASSIGNED"
    PICKED_UP = "PICKED_UP"
    IN_TRANSIT = "IN_TRANSIT"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    RESCHEDULED = "RESCHEDULED"
    CANCELLED = "CANCELLED"


class AssignmentModeEnum(str, enum.Enum):
    AUTO = "AUTO"
    MANUAL = "MANUAL"


class NotificationStatusEnum(str, enum.Enum):
    SENT = "SENT"
    FAILED = "FAILED"


class DeliveryAttemptStatusEnum(str, enum.Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------
def utcnow():
    return datetime.now(timezone.utc)


def new_uuid():
    return uuid.uuid4()


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(RoleEnum, name="role_enum"), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    # Relationships
    agent_profile = relationship("DeliveryAgent", back_populates="user", uselist=False)
    orders = relationship("Order", back_populates="customer", foreign_keys="Order.customer_id")


# ---------------------------------------------------------------------------
# Delivery Agents
# ---------------------------------------------------------------------------
class DeliveryAgent(Base):
    __tablename__ = "delivery_agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    availability_status = Column(
        Enum(AgentStatusEnum, name="agent_status_enum"),
        nullable=False,
        default=AgentStatusEnum.OFFLINE,
    )
    max_capacity = Column(Integer, nullable=False, default=5)
    current_load = Column(Integer, nullable=False, default=0)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    current_zone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("current_load >= 0", name="ck_agent_load_non_negative"),
        CheckConstraint("current_load <= max_capacity", name="ck_agent_load_within_capacity"),
        CheckConstraint("max_capacity > 0", name="ck_agent_capacity_positive"),
        Index("ix_agents_availability", "availability_status"),
        Index("ix_agents_zone", "current_zone_id"),
    )

    # Relationships
    user = relationship("User", back_populates="agent_profile")
    current_zone = relationship("Zone", foreign_keys=[current_zone_id])
    assigned_orders = relationship("Order", back_populates="agent", foreign_keys="Order.agent_id")


# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------
class Zone(Base):
    __tablename__ = "zones"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    name = Column(String(100), unique=True, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    areas = relationship("Area", back_populates="zone")


# ---------------------------------------------------------------------------
# Areas (Pincode → Zone mapping)
# ---------------------------------------------------------------------------
class Area(Base):
    __tablename__ = "areas"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    pincode = Column(String(10), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=True)
    zone_id = Column(
        UUID(as_uuid=True),
        ForeignKey("zones.id", ondelete="CASCADE"),
        nullable=False,
    )
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    zone = relationship("Zone", back_populates="areas")


# ---------------------------------------------------------------------------
# Rate Cards (versioned, never mutated)
# ---------------------------------------------------------------------------
class RateCard(Base):
    __tablename__ = "rate_cards"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_type = Column(Enum(OrderTypeEnum, name="order_type_enum"), nullable=False)
    zone_type = Column(Enum(ZoneRelationEnum, name="zone_relation_enum"), nullable=False)
    base_fee = Column(Numeric(10, 2), nullable=False)
    rate_per_kg = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    version = Column(Integer, nullable=False, default=1)
    effective_from = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    effective_to = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("base_fee >= 0", name="ck_rate_base_fee_non_negative"),
        CheckConstraint("rate_per_kg >= 0", name="ck_rate_per_kg_non_negative"),
        Index("ix_rate_cards_lookup", "order_type", "zone_type", "is_active"),
        # Enforce at most one active rate card per (order_type, zone_type)
        # PostgreSQL partial unique index — prevents ambiguous pricing from concurrent admin updates
        Index(
            "uq_rate_cards_one_active_per_type",
            "order_type",
            "zone_type",
            unique=True,
            postgresql_where="is_active = true",
        ),
    )


# ---------------------------------------------------------------------------
# COD Surcharges
# ---------------------------------------------------------------------------
class CODSurcharge(Base):
    __tablename__ = "cod_surcharges"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_type = Column(Enum(OrderTypeEnum, name="order_type_enum"), nullable=False)
    flat_amount = Column(Numeric(10, 2), nullable=False, default=0)
    percent_of_base = Column(Numeric(5, 2), nullable=False, default=0)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("flat_amount >= 0", name="ck_cod_flat_non_negative"),
        CheckConstraint("percent_of_base >= 0", name="ck_cod_percent_non_negative"),
    )


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------
class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)

    # Customer
    customer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Agent (assigned later)
    agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_agents.id", ondelete="SET NULL"),
        nullable=True,
    )

    # Pickup
    pickup_address = Column(Text, nullable=False)
    pickup_pincode = Column(String(10), nullable=False)
    pickup_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    pickup_latitude = Column(Float, nullable=True)
    pickup_longitude = Column(Float, nullable=True)

    # Drop
    drop_address = Column(Text, nullable=False)
    drop_pincode = Column(String(10), nullable=False)
    drop_zone_id = Column(UUID(as_uuid=True), ForeignKey("zones.id"), nullable=True)
    drop_latitude = Column(Float, nullable=True)
    drop_longitude = Column(Float, nullable=True)

    # Package dimensions
    length_cm = Column(Numeric(10, 2), nullable=False)
    breadth_cm = Column(Numeric(10, 2), nullable=False)
    height_cm = Column(Numeric(10, 2), nullable=False)
    actual_weight_kg = Column(Numeric(10, 2), nullable=False)

    # Calculated weights (pricing snapshot)
    volumetric_weight_kg = Column(Numeric(10, 2), nullable=False)
    chargeable_weight_kg = Column(Numeric(10, 2), nullable=False)

    # Pricing snapshot (frozen at order creation — never re-read from rate card)
    base_charge = Column(Numeric(10, 2), nullable=False)
    cod_charge = Column(Numeric(10, 2), nullable=False, default=0)
    total_charge = Column(Numeric(10, 2), nullable=False)
    rate_card_id = Column(UUID(as_uuid=True), ForeignKey("rate_cards.id"), nullable=True)
    zone_type = Column(Enum(ZoneRelationEnum, name="zone_relation_enum"), nullable=True)

    # Order metadata
    order_type = Column(Enum(OrderTypeEnum, name="order_type_enum"), nullable=False)
    payment_type = Column(Enum(PaymentTypeEnum, name="payment_type_enum"), nullable=False)
    status = Column(
        Enum(OrderStatusEnum, name="order_status_enum"),
        nullable=False,
        default=OrderStatusEnum.CREATED,
    )
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    idempotency_key = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    __table_args__ = (
        CheckConstraint("length_cm > 0", name="ck_order_length_positive"),
        CheckConstraint("breadth_cm > 0", name="ck_order_breadth_positive"),
        CheckConstraint("height_cm > 0", name="ck_order_height_positive"),
        CheckConstraint("actual_weight_kg > 0", name="ck_order_weight_positive"),
        CheckConstraint("total_charge >= 0", name="ck_order_charge_non_negative"),
        UniqueConstraint("customer_id", "idempotency_key", name="uq_orders_customer_idempotency_key"),
        Index("ix_orders_status", "status"),
        Index("ix_orders_customer", "customer_id"),
        Index("ix_orders_agent", "agent_id"),
        Index("ix_orders_pickup_zone", "pickup_zone_id"),
        Index("ix_orders_drop_zone", "drop_zone_id"),
        Index("ix_orders_created", "created_at"),
    )

    # Relationships
    customer = relationship("User", back_populates="orders", foreign_keys=[customer_id])
    agent = relationship("DeliveryAgent", back_populates="assigned_orders", foreign_keys=[agent_id])
    pickup_zone = relationship("Zone", foreign_keys=[pickup_zone_id])
    drop_zone = relationship("Zone", foreign_keys=[drop_zone_id])
    rate_card = relationship("RateCard", foreign_keys=[rate_card_id])
    status_history = relationship(
        "OrderStatusHistory",
        back_populates="order",
        order_by="OrderStatusHistory.created_at",
    )
    delivery_attempts = relationship(
        "DeliveryAttempt",
        back_populates="order",
        order_by="DeliveryAttempt.attempt_number",
    )
    assignment_decisions = relationship("AssignmentDecision", back_populates="order")


# ---------------------------------------------------------------------------
# Order Status History (APPEND-ONLY — never update, never delete)
# ---------------------------------------------------------------------------
class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_id = Column(
        UUID(as_uuid=True),
        # RESTRICT: prevents order deletion while history exists — enforces immutable audit trail
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
    )
    previous_status = Column(String(30), nullable=True)
    new_status = Column(String(30), nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    reason = Column(Text, nullable=True)
    metadata_json = Column(Text, nullable=True)  # JSON string for extra context
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        Index("ix_status_history_order", "order_id"),
        Index("ix_status_history_created", "created_at"),
    )

    # Relationships
    order = relationship("Order", back_populates="status_history")
    actor = relationship("User", foreign_keys=[changed_by])


# ---------------------------------------------------------------------------
# Delivery Attempts
# ---------------------------------------------------------------------------
class DeliveryAttempt(Base):
    __tablename__ = "delivery_attempts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="RESTRICT"),
        nullable=False,
    )

    attempt_number = Column(Integer, nullable=False)
    agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    scheduled_date = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(
        Enum(DeliveryAttemptStatusEnum, name="delivery_attempt_status_enum"),
        nullable=False,
        default=DeliveryAttemptStatusEnum.PENDING,
    )
    failure_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("order_id", "attempt_number", name="uq_attempt_per_order"),
        Index("ix_attempts_order", "order_id"),
        Index("ix_attempts_agent", "agent_id"),
    )

    # Relationships
    order = relationship("Order", back_populates="delivery_attempts")
    agent = relationship("DeliveryAgent", foreign_keys=[agent_id])


# ---------------------------------------------------------------------------
# Assignment Decisions (audit trail)
# ---------------------------------------------------------------------------
class AssignmentDecision(Base):
    __tablename__ = "assignment_decisions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )
    selected_agent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("delivery_agents.id", ondelete="SET NULL"),
        nullable=True,
    )
    selection_mode = Column(
        Enum(AssignmentModeEnum, name="assignment_mode_enum"),
        nullable=False,
    )
    candidate_count = Column(Integer, nullable=False, default=0)
    selected_distance_km = Column(Float, nullable=True)
    pickup_zone_id = Column(UUID(as_uuid=True), nullable=True)
    selected_agent_zone_id = Column(UUID(as_uuid=True), nullable=True)
    reason = Column(Text, nullable=True)
    candidates_json = Column(Text, nullable=True)  # JSON string of all candidates considered
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="assignment_decisions")
    selected_agent = relationship("DeliveryAgent", foreign_keys=[selected_agent_id])


# ---------------------------------------------------------------------------
# Notifications (audit log)
# ---------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    order_id = Column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,
    )
    notification_type = Column(String(50), nullable=False)
    channel = Column(String(20), nullable=False, default="EMAIL")
    subject = Column(String(255), nullable=True)
    body = Column(Text, nullable=True)
    status = Column(
        Enum(NotificationStatusEnum, name="notification_status_enum"),
        nullable=False,
    )
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ---------------------------------------------------------------------------
# Idempotency Keys (Scoped to Actor / User ID)
# ---------------------------------------------------------------------------
class IdempotencyKey(Base):
    __tablename__ = "idempotency_keys"

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    key = Column(String(255), primary_key=True)
    response_status = Column(Integer, nullable=False)
    response_body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
