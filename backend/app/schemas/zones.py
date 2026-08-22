"""Pydantic schemas for zones, areas, and rate cards."""

from typing import Optional, List
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Zones
# ---------------------------------------------------------------------------
class ZoneCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ZoneResponse(BaseModel):
    id: str
    name: str
    is_active: bool
    area_count: int = 0

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Areas
# ---------------------------------------------------------------------------
class AreaCreateRequest(BaseModel):
    pincode: str = Field(..., min_length=4, max_length=10)
    name: Optional[str] = None
    zone_id: str


class AreaResponse(BaseModel):
    id: str
    pincode: str
    name: Optional[str] = None
    zone_id: str
    zone_name: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Rate Cards
# ---------------------------------------------------------------------------
class RateCardCreateRequest(BaseModel):
    order_type: str = Field(..., pattern="^(B2B|B2C)$")
    zone_type: str = Field(..., pattern="^(INTRA|INTER)$")
    base_fee: float = Field(..., ge=0)
    rate_per_kg: float = Field(..., ge=0)


class RateCardUpdateRequest(BaseModel):
    base_fee: Optional[float] = Field(None, ge=0)
    rate_per_kg: Optional[float] = Field(None, ge=0)


class RateCardResponse(BaseModel):
    id: str
    order_type: str
    zone_type: str
    base_fee: float
    rate_per_kg: float
    is_active: bool
    version: int
    effective_from: Optional[str] = None
    effective_to: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# COD Surcharges
# ---------------------------------------------------------------------------
class CODSurchargeCreateRequest(BaseModel):
    order_type: str = Field(..., pattern="^(B2B|B2C)$")
    flat_amount: float = Field(0, ge=0)
    percent_of_base: float = Field(0, ge=0)


class CODSurchargeResponse(BaseModel):
    id: str
    order_type: str
    flat_amount: float
    percent_of_base: float
    is_active: bool

    model_config = {"from_attributes": True}
