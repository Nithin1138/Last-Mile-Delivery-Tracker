"""Pydantic schemas for delivery agents."""

from typing import Optional
from pydantic import BaseModel, Field


class AgentCreateRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    zone_id: Optional[str] = Field(None, max_length=128)
    max_capacity: int = Field(5, gt=0, le=100)


class AgentUpdateRequest(BaseModel):
    availability_status: Optional[str] = Field(None, pattern="^(AVAILABLE|BUSY|OFFLINE)$")
    latitude: Optional[float] = Field(None, ge=-90.0, le=90.0)
    longitude: Optional[float] = Field(None, ge=-180.0, le=180.0)
    zone_id: Optional[str] = Field(None, max_length=128)
    max_capacity: Optional[int] = Field(None, gt=0, le=100)
    current_load: Optional[int] = Field(None, ge=0, le=100)
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
