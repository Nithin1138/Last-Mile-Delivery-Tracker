"""Unit tests for Haversine distance calculation."""

import pytest
from app.services.distance import haversine_distance, calculate_distance


def test_haversine_same_point():
    """Distance from a point to itself must be 0."""
    dist = haversine_distance(28.6139, 77.2090, 28.6139, 77.2090)
    assert round(dist, 4) == 0.0


def test_haversine_delhi_to_mumbai():
    """Delhi to Mumbai is approximately 1140-1160 km straight line."""
    # Delhi: 28.6139° N, 77.2090° E
    # Mumbai: 19.0760° N, 72.8777° E
    dist = haversine_distance(28.6139, 77.2090, 19.0760, 72.8777)
    assert 1140 < dist < 1170


def test_haversine_short_distance():
    """Connaught Place to India Gate (~2.5 km)."""
    # CP: 28.6315, 77.2167
    # India Gate: 28.6129, 77.2295
    dist = haversine_distance(28.6315, 77.2167, 28.6129, 77.2295)
    assert 2.0 < dist < 3.0


def test_calculate_distance_with_none():
    """Returns None if any coordinate is missing."""
    assert calculate_distance(None, 77.2090, 19.0760, 72.8777) is None
    assert calculate_distance(28.6139, None, 19.0760, 72.8777) is None
    assert calculate_distance(28.6139, 77.2090, None, 72.8777) is None
    assert calculate_distance(28.6139, 77.2090, 19.0760, None) is None
    assert calculate_distance(28.6139, 77.2090, 19.0760, 72.8777) is not None
