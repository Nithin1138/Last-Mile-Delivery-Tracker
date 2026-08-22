"""Pydantic schemas for pricing."""

from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field


class PriceQuoteRequest(BaseModel):
    pickup_pincode: str = Field(..., min_length=4, max_length=10)
    drop_pincode: str = Field(..., min_length=4, max_length=10)
    length_cm: float = Field(..., gt=0)
    breadth_cm: float = Field(..., gt=0)
    height_cm: float = Field(..., gt=0)
    actual_weight_kg: float = Field(..., gt=0)
    order_type: str = Field(..., pattern="^(B2B|B2C)$")
    payment_type: str = Field(..., pattern="^(PREPAID|COD)$")


class PriceBreakdownResponse(BaseModel):
    actual_weight_kg: float
    volumetric_weight_kg: float
    chargeable_weight_kg: float
    pickup_zone_name: str
    drop_zone_name: str
    zone_type: str
    order_type: str
    rate_card_id: str
    rate_card_version: int
    base_fee: float
    rate_per_kg: float
    weight_charge: float
    base_charge: float
    cod_applicable: bool
    cod_flat: float
    cod_percent: float
    cod_charge: float
    total_charge: float
