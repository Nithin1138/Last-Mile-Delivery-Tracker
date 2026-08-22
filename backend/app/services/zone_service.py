"""Zone resolution service — deterministic pincode → area → zone mapping."""

from typing import Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import Area, Zone
from app.core.errors import AppError, ErrorCodes


def resolve_pincode_to_zone(
    db: Session, pincode: str
) -> Tuple[Area, Zone]:
    """Resolve a pincode to its area and zone.

    Args:
        db: Database session.
        pincode: The pincode to resolve.

    Returns:
        Tuple of (Area, Zone).

    Raises:
        AppError: If pincode is unknown, area is inactive, or zone is inactive.
    """
    area = db.query(Area).filter(Area.pincode == pincode).first()

    if area is None:
        raise AppError(
            code=ErrorCodes.INVALID_PINCODE,
            message=f"Pincode '{pincode}' is not mapped to any area.",
            status_code=400,
        )

    if not area.is_active:
        raise AppError(
            code=ErrorCodes.INACTIVE_AREA,
            message=f"Area for pincode '{pincode}' is currently inactive.",
            status_code=400,
        )

    zone = db.query(Zone).filter(Zone.id == area.zone_id).first()

    if zone is None or not zone.is_active:
        raise AppError(
            code=ErrorCodes.ZONE_NOT_FOUND,
            message=f"Zone for pincode '{pincode}' is not available or inactive.",
            status_code=400,
        )

    return area, zone


def determine_zone_type(pickup_zone_id: UUID, drop_zone_id: UUID) -> str:
    """Determine whether a delivery is INTRA-zone or INTER-zone.

    Args:
        pickup_zone_id: UUID of the pickup zone.
        drop_zone_id: UUID of the drop zone.

    Returns:
        "INTRA" if same zone, "INTER" if different zones.
    """
    return "INTRA" if pickup_zone_id == drop_zone_id else "INTER"
