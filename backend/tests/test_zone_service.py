"""Tests for zone resolution service."""

import pytest
from app.services.zone_service import resolve_pincode_to_zone, determine_zone_type
from app.models.models import Zone, Area
from app.core.errors import AppError, ErrorCodes


def test_valid_pincode_resolution(db):
    zone = Zone(name="North Zone")
    db.add(zone)
    db.flush()

    area = Area(pincode="110001", name="CP", zone_id=zone.id, is_active=True)
    db.add(area)
    db.flush()

    res_area, res_zone = resolve_pincode_to_zone(db, "110001")
    assert res_area.pincode == "110001"
    assert res_zone.name == "North Zone"


def test_unknown_pincode_raises_error(db):
    with pytest.raises(AppError) as exc_info:
        resolve_pincode_to_zone(db, "999999")
    assert exc_info.value.code == ErrorCodes.INVALID_PINCODE


def test_inactive_area_raises_error(db):
    zone = Zone(name="Active Zone")
    db.add(zone)
    db.flush()

    area = Area(pincode="110002", name="Inactive Area", zone_id=zone.id, is_active=False)
    db.add(area)
    db.flush()

    with pytest.raises(AppError) as exc_info:
        resolve_pincode_to_zone(db, "110002")
    assert exc_info.value.code == ErrorCodes.INACTIVE_AREA


def test_determine_zone_type():
    import uuid
    id1 = uuid.uuid4()
    id2 = uuid.uuid4()
    assert determine_zone_type(id1, id1) == "INTRA"
    assert determine_zone_type(id1, id2) == "INTER"
