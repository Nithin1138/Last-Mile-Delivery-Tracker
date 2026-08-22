"""Tests for the pricing engine and formula correctness."""

from decimal import Decimal
import pytest
from app.services.pricing_engine import (
    calculate_volumetric_weight,
    calculate_chargeable_weight,
    calculate_base_charge,
    calculate_cod_charge,
    calculate_price,
    VOLUMETRIC_DIVISOR
)
from app.models.models import Zone, RateCard, CODSurcharge, OrderTypeEnum, ZoneRelationEnum
from app.core.errors import AppError, ErrorCodes


def test_volumetric_weight_formula():
    """Formula: (L * B * H) / 5000."""
    # 50 * 40 * 30 / 5000 = 60000 / 5000 = 12.00 kg
    vw = calculate_volumetric_weight(Decimal("50"), Decimal("40"), Decimal("30"))
    assert vw == Decimal("12.00")


def test_chargeable_weight_volumetric_wins():
    """Actual: 8kg, Volumetric: 12kg -> Chargeable: 12kg."""
    cw = calculate_chargeable_weight(Decimal("8.0"), Decimal("12.00"))
    assert cw == Decimal("12.00")


def test_chargeable_weight_actual_wins():
    """Actual: 15kg, Volumetric: 12kg -> Chargeable: 15kg."""
    cw = calculate_chargeable_weight(Decimal("15.0"), Decimal("12.00"))
    assert cw == Decimal("15.0")


def test_base_charge_calculation():
    """base_fee + rate_per_kg * chargeable_weight."""
    base_fee = Decimal("50.00")
    rate_per_kg = Decimal("20.00")
    cw = Decimal("12.00")
    # 50 + (20 * 12) = 290.00
    base_charge = calculate_base_charge(base_fee, rate_per_kg, cw)
    assert base_charge == Decimal("290.00")


def test_cod_charge_calculation():
    """flat + (percent * base_charge / 100)."""
    base_charge = Decimal("290.00")
    flat = Decimal("25.00")
    percent = Decimal("2.5")
    # 25 + (2.5% of 290) = 25 + 7.25 = 32.25
    cod_charge = calculate_cod_charge(base_charge, flat, percent)
    assert cod_charge == Decimal("32.25")


def test_exact_assignment_worked_example(db):
    """
    Worked example from assignment brief:
    L=50, B=40, H=30, actual=8kg, B2C, INTER, COD
    Expect:
    volumetric = 12 kg
    chargeable = 12 kg
    base_fee = 50, rate_per_kg = 20 -> base = 290
    cod = 25 + 2.5% of 290 = 32.25
    total = 322.25
    """
    zone_a = Zone(name="Test Zone A")
    zone_b = Zone(name="Test Zone B")
    db.add_all([zone_a, zone_b])
    db.flush()

    rate_card = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTER,
        base_fee=Decimal("50.00"),
        rate_per_kg=Decimal("20.00"),
        version=1,
        is_active=True,
    )
    cod_surcharge = CODSurcharge(
        order_type=OrderTypeEnum.B2C,
        flat_amount=Decimal("25.00"),
        percent_of_base=Decimal("2.5"),
        is_active=True,
    )
    db.add_all([rate_card, cod_surcharge])
    db.flush()

    breakdown = calculate_price(
        db=db,
        length_cm=Decimal("50"),
        breadth_cm=Decimal("40"),
        height_cm=Decimal("30"),
        actual_weight_kg=Decimal("8"),
        order_type="B2C",
        payment_type="COD",
        pickup_zone_id=zone_a.id,
        pickup_zone_name=zone_a.name,
        drop_zone_id=zone_b.id,
        drop_zone_name=zone_b.name,
    )

    assert breakdown.volumetric_weight_kg == Decimal("12.00")
    assert breakdown.chargeable_weight_kg == Decimal("12.00")
    assert breakdown.zone_type == "INTER"
    assert breakdown.base_charge == Decimal("290.00")
    assert breakdown.cod_charge == Decimal("32.25")
    assert breakdown.total_charge == Decimal("322.25")


def test_intra_zone_pricing(db):
    """Same pickup and drop zone should resolve to INTRA zone type."""
    zone_a = Zone(name="Single Zone")
    db.add(zone_a)
    db.flush()

    rate_card = RateCard(
        order_type=OrderTypeEnum.B2B,
        zone_type=ZoneRelationEnum.INTRA,
        base_fee=Decimal("30.00"),
        rate_per_kg=Decimal("10.00"),
        version=1,
        is_active=True,
    )
    db.add(rate_card)
    db.flush()

    breakdown = calculate_price(
        db=db,
        length_cm=Decimal("10"),
        breadth_cm=Decimal("10"),
        height_cm=Decimal("10"),
        actual_weight_kg=Decimal("2"),
        order_type="B2B",
        payment_type="PREPAID",
        pickup_zone_id=zone_a.id,
        pickup_zone_name=zone_a.name,
        drop_zone_id=zone_a.id,
        drop_zone_name=zone_a.name,
    )

    assert breakdown.zone_type == "INTRA"
    # volumetric: 1000/5000 = 0.2 kg. Chargeable: 2kg
    assert breakdown.chargeable_weight_kg == Decimal("2.0")
    # Base: 30 + 10*2 = 50. COD: 0
    assert breakdown.total_charge == Decimal("50.00")
    assert breakdown.cod_charge == Decimal("0")


def test_missing_rate_card_raises_error(db):
    """If no active rate card exists, AppError is raised."""
    zone_a = Zone(name="Zone X")
    db.add(zone_a)
    db.flush()

    with pytest.raises(AppError) as exc_info:
        calculate_price(
            db=db,
            length_cm=Decimal("10"),
            breadth_cm=Decimal("10"),
            height_cm=Decimal("10"),
            actual_weight_kg=Decimal("2"),
            order_type="B2B",
            payment_type="PREPAID",
            pickup_zone_id=zone_a.id,
            pickup_zone_name=zone_a.name,
            drop_zone_id=zone_a.id,
            drop_zone_name=zone_a.name,
        )
    assert exc_info.value.code == ErrorCodes.RATE_CARD_NOT_FOUND
