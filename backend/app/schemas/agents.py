"""Pydantic schemas for delivery agents."""

from typing import Optional
from pydantic import BaseModel, Field


class AgentCreateRequest(BaseModel):
    email: str = Field(..., min_length=5)
    password: str = Field(..., min_length=6)
    name: str = Field(..., min_length=1)
    phone: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zone_id: Optional[str] = None
    max_capacity: int = Field(5, gt=0)


class AgentUpdateRequest(BaseModel):
    availability_status: Optional[str] = None  # AVAILABLE, BUSY, OFFLINE
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    zone_id: Optional[str] = None
    max_capacity: Optional[int] = Field(None, gt=0)
    current_load: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None



class AgentResponse(BaseModel):
    id: str
    user_id: str
    name: str
    email: str
    phone: Optional[str] = None
    availability_status: str
    max_capacity: int
    current_load: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    current_zone_id: Optional[str] = None
    current_zone_name: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}
