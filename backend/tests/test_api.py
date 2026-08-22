"""API end-to-end integration tests covering auth, RBAC, orders, idempotency, rate card versioning."""

from decimal import Decimal
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest
from app.models.models import Zone, Area, RateCard, CODSurcharge, OrderTypeEnum, ZoneRelationEnum, Order


def test_auth_and_rbac(client, admin_token, customer_token):
    # Customer trying to access admin zones endpoint should get 403
    res = client.post(
        "/api/admin/zones",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"name": "Forbidden Zone"},
    )
    assert res.status_code == 403
    assert res.json()["error"]["code"] == "FORBIDDEN"

    # Admin should succeed
    res = client.post(
        "/api/admin/zones",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"name": "Allowed Zone"},
    )
    assert res.status_code == 200
    assert res.json()["name"] == "Allowed Zone"


def test_idempotent_order_creation(client, db, customer_token):
    # Setup zone & area
    zone = Zone(name="Idemp Zone")
    db.add(zone)
    db.flush()
    area = Area(pincode="110099", name="Area 99", zone_id=zone.id, is_active=True)
    rate_card = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTRA,
        base_fee=Decimal("40.00"),
        rate_per_kg=Decimal("15.00"),
        version=1,
        is_active=True,
    )
    db.add_all([area, rate_card])
    db.flush()

    order_payload = {
        "pickup_address": "Origin 123",
        "pickup_pincode": "110099",
        "drop_address": "Destination 456",
        "drop_pincode": "110099",
        "length_cm": 20,
        "breadth_cm": 20,
        "height_cm": 20,
        "actual_weight_kg": 2,
        "order_type": "B2C",
        "payment_type": "PREPAID",
        "idempotency_key": "unique-idem-key-12345",
    }

    # First submission
    res1 = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=order_payload,
    )
    assert res1.status_code == 200
    order_id_1 = res1.json()["id"]

    # Second submission with same idempotency key
    res2 = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json=order_payload,
    )
    assert res2.status_code == 200
    order_id_2 = res2.json()["id"]

    # Must return the same order ID, not create a second order
    assert order_id_1 == order_id_2

    # Check database count
    total_orders = db.query(Order).filter(Order.idempotency_key == "unique-idem-key-12345").count()
    assert total_orders == 1


def test_rate_card_versioning_preserves_historical_order_price(client, db, admin_token, customer_token):
    """
    When a rate card is updated (versioned), past orders must retain their original total_charge.
    """
    zone = Zone(name="Rate Test Zone")
    db.add(zone)
    db.flush()
    area = Area(pincode="110055", name="Area 55", zone_id=zone.id, is_active=True)
    rate_card_v1 = RateCard(
        order_type=OrderTypeEnum.B2C,
        zone_type=ZoneRelationEnum.INTRA,
        base_fee=Decimal("50.00"),
        rate_per_kg=Decimal("10.00"),
        version=1,
        is_active=True,
    )
    db.add_all([area, rate_card_v1])
    db.flush()

    # Create order at version 1 rates: 50 + (10 * 1) = 60
    res = client.post(
        "/api/orders",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={
            "pickup_address": "Loc A",
            "pickup_pincode": "110055",
            "drop_address": "Loc B",
            "drop_pincode": "110055",
            "length_cm": 10,
            "breadth_cm": 10,
            "height_cm": 10,
            "actual_weight_kg": 1,
            "order_type": "B2C",
            "payment_type": "PREPAID",
        },
    )
    assert res.status_code == 200
    order_id = res.json()["id"]
    original_total = res.json()["total_charge"]
    assert original_total == 60.0

    # Admin updates rate card to version 2 (doubles base fee to 100)
    update_res = client.put(
        f"/api/admin/rate-cards/{rate_card_v1.id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"base_fee": 100.0, "rate_per_kg": 20.0},
    )
    assert update_res.status_code == 200
    assert update_res.json()["version"] == 2
    assert update_res.json()["base_fee"] == 100.0

    # Fetch previous order - price must remain 60.0 (frozen snapshot)
    order_res = client.get(
        f"/api/orders/{order_id}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert order_res.status_code == 200
    assert order_res.json()["total_charge"] == 60.0
