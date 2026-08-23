"""Unit tests for notification provider abstractions (Resend, Twilio, Console, and error handling)."""

from unittest.mock import patch, MagicMock
from app.services.notification_service import (
    ConsoleNotificationProvider,
    ConsoleSmsProvider,
    ResendNotificationProvider,
    TwilioSmsProvider,
    get_notification_provider,
    get_sms_provider,
)
from app.config import settings


def test_console_providers():
    """Console email and SMS providers log cleanly and return True."""
    email_prov = ConsoleNotificationProvider()
    assert email_prov.send_email("test@example.com", "Test Subject", "<p>Hello</p>") is True

    sms_prov = ConsoleSmsProvider()
    assert sms_prov.send_sms("+919876543210", "Hello SMS") is True


def test_resend_email_provider_success():
    """Resend email provider invokes resend SDK and returns True on success."""
    provider = ResendNotificationProvider(api_key="re_test_key_123", from_email="noreply@test.dev")
    with patch("resend.Emails.send") as mock_send:
        mock_send.return_value = {"id": "email_123"}
        result = provider.send_email("user@test.dev", "Welcome", "<p>Welcome!</p>")
        assert result is True
        mock_send.assert_called_once_with({
            "from": "noreply@test.dev",
            "to": ["user@test.dev"],
            "subject": "Welcome",
            "html": "<p>Welcome!</p>",
        })


def test_resend_email_provider_failure_handled_gracefully():
    """Resend email provider catches exceptions and returns False without crashing."""
    provider = ResendNotificationProvider(api_key="re_invalid_key", from_email="noreply@test.dev")
    with patch("resend.Emails.send", side_effect=Exception("API Key Invalid")):
        result = provider.send_email("user@test.dev", "Welcome", "<p>Welcome!</p>")
        assert result is False


def test_twilio_sms_provider_success():
    """Twilio SMS provider dispatches HTTP POST request with correct payload."""
    provider = TwilioSmsProvider(
        account_sid="AC_test_account_sid",
        auth_token="auth_token_secret",
        from_phone="+1234567890",
    )
    with patch("httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 201
        mock_post.return_value = mock_resp

        result = provider.send_sms("+919876543210", "Your order is out for delivery.")
        assert result is True
        mock_post.assert_called_once()
        call_kwargs = mock_post.call_args
        assert call_kwargs[1]["auth"] == ("AC_test_account_sid", "auth_token_secret")
        assert call_kwargs[1]["data"]["To"] == "+919876543210"
        assert call_kwargs[1]["data"]["From"] == "+1234567890"


def test_twilio_sms_provider_failure_handled_gracefully():
    """Twilio SMS provider handles HTTP 400/500 and network exceptions gracefully."""
    provider = TwilioSmsProvider(
        account_sid="AC_test_account_sid",
        auth_token="auth_token_secret",
        from_phone="+1234567890",
    )
    # HTTP error response
    with patch("httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 400
        mock_resp.text = "Invalid phone number"
        mock_post.return_value = mock_resp

        result = provider.send_sms("invalid_phone", "Test message")
        assert result is False

    # Network exception
    with patch("httpx.post", side_effect=Exception("Connection refused")):
        result = provider.send_sms("+919876543210", "Test message")
        assert result is False


def test_lifecycle_status_transitions_persist_notification_records(db, monkeypatch):
    """Verifies that dispatching notifications records structured audit rows into the notifications table."""
    from app.models.models import User, RoleEnum, Order, Zone, OrderTypeEnum, PaymentTypeEnum, Notification, NotificationStatusEnum
    from app.core.security import hash_password
    from app.services.notification_service import notify_order_created, notify_status_change, notify_delivery_failed

    # Mock provider send methods to isolate audit persistence from external API rate limits
    monkeypatch.setattr("app.services.notification_service.get_notification_provider", lambda: MagicMock(send_email=lambda *args, **kwargs: True))
    monkeypatch.setattr("app.services.notification_service.get_sms_provider", lambda: MagicMock(send_sms=lambda *args, **kwargs: True))

    user = User(
        email="notify_audit@lastmile.dev",
        phone="+919999988888",
        password_hash=hash_password("pass"),
        name="Notify Audit User",
        role=RoleEnum.CUSTOMER,
    )
    zone = Zone(name="Notify Zone")
    db.add_all([user, zone])
    db.flush()

    order = Order(
        customer_id=user.id,
        pickup_address="A", pickup_pincode="110001", pickup_zone_id=zone.id,
        drop_address="B", drop_pincode="110001", drop_zone_id=zone.id,
        length_cm=10, breadth_cm=10, height_cm=10,
        actual_weight_kg=1, volumetric_weight_kg=0.2, chargeable_weight_kg=1,
        base_charge=50, cod_charge=0, total_charge=50,
        order_type=OrderTypeEnum.B2C, payment_type=PaymentTypeEnum.PREPAID,
    )
    db.add(order)
    db.flush()

    # 1. Notify order created
    notify_order_created(db, order, user)
    db.commit()

    created_notifs = db.query(Notification).filter(
        Notification.order_id == order.id,
        Notification.notification_type == "ORDER_CREATED",
    ).all()
    assert len(created_notifs) >= 1
    assert created_notifs[0].status == NotificationStatusEnum.SENT
    assert "order confirmed" in created_notifs[0].subject.lower()

    # 2. Notify status transition
    notify_status_change(db, order, user, "OUT_FOR_DELIVERY")
    db.commit()

    status_notifs = db.query(Notification).filter(
        Notification.order_id == order.id,
        Notification.notification_type == "STATUS_OUT_FOR_DELIVERY",
    ).all()
    assert len(status_notifs) >= 1
    assert status_notifs[0].status == NotificationStatusEnum.SENT

    # 3. Notify failed delivery (dispatches both Email and SMS audit logs)
    notify_delivery_failed(db, order, user, "Customer unreachable")
    db.commit()

    failed_notifs = db.query(Notification).filter(
        Notification.order_id == order.id,
        Notification.notification_type.startswith("DELIVERY_FAILED"),
    ).all()
    channels = {n.channel for n in failed_notifs}
    assert "EMAIL" in channels
    assert "SMS" in channels


