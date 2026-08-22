"""Haversine distance calculation between two geographic coordinates."""

import math
from typing import Optional, Tuple

# Earth's mean radius in kilometers
EARTH_RADIUS_KM = 6371.0


def haversine_distance(
    lat1: float, lon1: float, lat2: float, lon2: float
) -> float:
    """Calculate the great-circle distance between two points on Earth.

    Args:
        lat1, lon1: Latitude and longitude of point 1 (in degrees).
        lat2, lon2: Latitude and longitude of point 2 (in degrees).

    Returns:
        Distance in kilometers.
    """
    # Convert to radians
    lat1_r = math.radians(lat1)
    lat2_r = math.radians(lat2)
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    # Haversine formula
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(lat1_r) * math.cos(lat2_r) * math.sin(dlon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    return EARTH_RADIUS_KM * c


def calculate_distance(
    pickup_lat: Optional[float],
    pickup_lon: Optional[float],
    agent_lat: Optional[float],
    agent_lon: Optional[float],
) -> Optional[float]:
    """Calculate distance between pickup location and agent location.

    Returns None if either coordinate pair is missing.
    """
    if any(v is None for v in [pickup_lat, pickup_lon, agent_lat, agent_lon]):
        return None

    return haversine_distance(pickup_lat, pickup_lon, agent_lat, agent_lon)
