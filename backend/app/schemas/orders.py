"""Pydantic schemas for orders."""

from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class OrderCreateRequest(BaseModel):
    pickup_address: str = Field(..., min_length=5, max_length=500)
    pickup_pincode: str = Field(..., min_length=4, max_length=10)
    pickup_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    pickup_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    drop_address: str = Field(..., min_length=5, max_length=500)
    drop_pincode: str = Field(..., min_length=4, max_length=10)
    drop_latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    drop_longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    length_cm: float = Field(..., gt=0, le=2000)
    breadth_cm: float = Field(..., gt=0, le=2000)
    height_cm: float = Field(..., gt=0, le=2000)
    actual_weight_kg: float = Field(..., gt=0, le=50000)
    order_type: str = Field(..., pattern="^(B2B|B2C)$")
    payment_type: str = Field(..., pattern="^(PREPAID|COD)$")
    scheduled_date: Optional[str] = Field(None, max_length=50)
    idempotency_key: Optional[str] = Field(None, max_length=128)
    customer_id: Optional[str] = Field(None, max_length=128)  # Admin creating on behalf of customer


class OrderResponse(BaseModel):
    id: str
    customer_id: str
    customer_name: Optional[str] = None
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    pickup_address: str
    pickup_pincode: str
    pickup_zone_name: Optional[str] = None
    drop_address: str
    drop_pincode: str
    drop_zone_name: Optional[str] = None
    length_cm: float
    breadth_cm: float
    height_cm: float
    actual_weight_kg: float
    volumetric_weight_kg: float
    chargeable_weight_kg: float
    base_charge: float
    cod_charge: float
    total_charge: float
    zone_type: Optional[str] = None
    order_type: str
    payment_type: str
    status: str
    scheduled_date: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None

    model_config = {"from_attributes": True}


class StatusUpdateRequest(BaseModel):
    status: str
    reason: Optional[str] = None
    admin_override: bool = False
    failure_reason: Optional[str] = None  # For FAILED status


class AssignRequest(BaseModel):
    agent_id: Optional[str] = None  # None = auto-assign
    mode: str = "auto"  # "auto" or "manual"


class RescheduleRequest(BaseModel):
    new_scheduled_date: str
    reason: Optional[str] = None


class TimelineEntry(BaseModel):
    id: str
    previous_status: Optional[str] = None
    new_status: str
    changed_by: Optional[str] = None
    actor_name: Optional[str] = None
    reason: Optional[str] = None
    created_at: str


class DeliveryAttemptResponse(BaseModel):
    id: str
    order_id: str
    attempt_number: int
    agent_id: Optional[str] = None
    agent_name: Optional[str] = None
    scheduled_date: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    status: str
    failure_reason: Optional[str] = None
    created_at: str


class AssignmentDecisionResponse(BaseModel):
    id: str
    order_id: str
    selected_agent_id: Optional[str] = None
    selected_agent_name: Optional[str] = None
    selection_mode: str
    candidate_count: int
    selected_distance_km: Optional[float] = None
    pickup_zone_name: Optional[str] = None
    selected_agent_zone_name: Optional[str] = None
    reason: Optional[str] = None
    candidates: Optional[list] = None
    created_at: str


class OrderListResponse(BaseModel):
    orders: List[OrderResponse]
    total: int
    page: int
    page_size: int
