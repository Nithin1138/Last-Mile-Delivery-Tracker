"""
Pricing engine — database-driven rate calculation.

Conceptually separates:
- WeightCalculator
- ZoneResolver (delegated to zone_service.py)
- RateCardResolver
- CODCalculator
- PriceBreakdownBuilder
- PricingEngine (orchestrator)

All calculation functions are pure — no DB access — except the orchestrator.
"""

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import RateCard, CODSurcharge, OrderTypeEnum, ZoneRelationEnum
from app.core.errors import AppError, ErrorCodes
from app.core.events import log_event

# Volumetric divisor per assignment brief
VOLUMETRIC_DIVISOR = Decimal("5000")


@dataclass
class PriceBreakdown:
    """Complete pricing breakdown — transparent and explainable."""

    actual_weight_kg: Decimal
    volumetric_weight_kg: Decimal
    chargeable_weight_kg: Decimal
    pickup_zone_name: str
    drop_zone_name: str
    zone_type: str  # INTRA or INTER
    order_type: str  # B2B or B2C
    rate_card_id: str
    rate_card_version: int
    base_fee: Decimal
    rate_per_kg: Decimal
    weight_charge: Decimal
    base_charge: Decimal  # base_fee + weight_charge
    cod_applicable: bool
    cod_flat: Decimal
    cod_percent: Decimal
    cod_charge: Decimal
    total_charge: Decimal


# ---------------------------------------------------------------------------
# Pure calculation functions
# ---------------------------------------------------------------------------

def calculate_volumetric_weight(
    length_cm: Decimal, breadth_cm: Decimal, height_cm: Decimal
) -> Decimal:
    """Calculate volumetric weight: (L × B × H) / 5000."""
    volume = length_cm * breadth_cm * height_cm
    return (volume / VOLUMETRIC_DIVISOR).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def calculate_chargeable_weight(
    actual_weight_kg: Decimal, volumetric_weight_kg: Decimal
) -> Decimal:
    """Chargeable weight = max(actual, volumetric)."""
    return max(actual_weight_kg, volumetric_weight_kg)


def calculate_base_charge(
    base_fee: Decimal, rate_per_kg: Decimal, chargeable_weight_kg: Decimal
) -> Decimal:
    """Base charge = base_fee + rate_per_kg × chargeable_weight."""
    weight_charge = (rate_per_kg * chargeable_weight_kg).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return base_fee + weight_charge


def calculate_cod_charge(
    base_charge: Decimal, flat_amount: Decimal, percent_of_base: Decimal
) -> Decimal:
    """COD surcharge = flat_amount + (percent_of_base% × base_charge)."""
    percent_charge = (base_charge * percent_of_base / Decimal("100")).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    return flat_amount + percent_charge


# ---------------------------------------------------------------------------
# Rate card resolution (requires DB)
# ---------------------------------------------------------------------------

def resolve_rate_card(
    db: Session, order_type: str, zone_type: str
) -> RateCard:
    """Find the active rate card for the given order type and zone relation.

    Raises AppError if no active rate card is found.
    """
    rate_card = (
        db.query(RateCard)
        .filter(
            RateCard.order_type == order_type,
            RateCard.zone_type == zone_type,
            RateCard.is_active == True,
        )
        .order_by(RateCard.version.desc())
        .first()
    )

    if rate_card is None:
        raise AppError(
            code=ErrorCodes.RATE_CARD_NOT_FOUND,
            message=f"No active rate card found for {order_type}/{zone_type}.",
            status_code=400,
        )

    return rate_card


def resolve_cod_surcharge(
    db: Session, order_type: str
) -> Optional[CODSurcharge]:
    """Find the active COD surcharge config for the order type."""
    return (
        db.query(CODSurcharge)
        .filter(
            CODSurcharge.order_type == order_type,
            CODSurcharge.is_active == True,
        )
        .first()
    )


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def calculate_price(
    db: Session,
    length_cm: Decimal,
    breadth_cm: Decimal,
    height_cm: Decimal,
    actual_weight_kg: Decimal,
    order_type: str,
    payment_type: str,
    pickup_zone_id: UUID,
    pickup_zone_name: str,
    drop_zone_id: UUID,
    drop_zone_name: str,
) -> PriceBreakdown:
    """Calculate complete pricing for an order.

    This is the main entry point. Orchestrates all pricing sub-calculations
    and returns a transparent breakdown.
    """
    # 1. Weight calculations
    volumetric = calculate_volumetric_weight(length_cm, breadth_cm, height_cm)
    chargeable = calculate_chargeable_weight(actual_weight_kg, volumetric)

    # 2. Zone type
    zone_type = "INTRA" if pickup_zone_id == drop_zone_id else "INTER"

    # 3. Rate card lookup
    rate_card = resolve_rate_card(db, order_type, zone_type)

    # 4. Base charge
    weight_charge = (rate_card.rate_per_kg * chargeable).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    base_charge = rate_card.base_fee + weight_charge

    # 5. COD surcharge
    cod_applicable = payment_type == "COD"
    cod_flat = Decimal("0")
    cod_percent = Decimal("0")
    cod_charge = Decimal("0")

    if cod_applicable:
        cod_config = resolve_cod_surcharge(db, order_type)
        if cod_config:
            cod_flat = cod_config.flat_amount
            cod_percent = cod_config.percent_of_base
            cod_charge = calculate_cod_charge(base_charge, cod_flat, cod_percent)

    # 6. Total
    total = base_charge + cod_charge

    # 7. Log the event
    log_event(
        "PRICE_CALCULATED",
        order_type=order_type,
        zone_type=zone_type,
        actual_weight=str(actual_weight_kg),
        volumetric_weight=str(volumetric),
        chargeable_weight=str(chargeable),
        base_charge=str(base_charge),
        cod_charge=str(cod_charge),
        total=str(total),
        rate_card_id=str(rate_card.id),
        rate_card_version=rate_card.version,
    )

    return PriceBreakdown(
        actual_weight_kg=actual_weight_kg,
        volumetric_weight_kg=volumetric,
        chargeable_weight_kg=chargeable,
        pickup_zone_name=pickup_zone_name,
        drop_zone_name=drop_zone_name,
        zone_type=zone_type,
        order_type=order_type,
        rate_card_id=str(rate_card.id),
        rate_card_version=rate_card.version,
        base_fee=rate_card.base_fee,
        rate_per_kg=rate_card.rate_per_kg,
        weight_charge=weight_charge,
        base_charge=base_charge,
        cod_applicable=cod_applicable,
        cod_flat=cod_flat,
        cod_percent=cod_percent,
        cod_charge=cod_charge,
        total_charge=total,
    )
