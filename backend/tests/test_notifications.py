"""Unit tests for transactional email notification provider abstractions (Resend, Console, and database auditing)."""

from unittest.mock import patch, MagicMock
from app.services.notification_service import (
    ConsoleNotificationProvider,
    ResendNotificationProvider,
    get_notification_provider,
    notify_order_created,
    notify_status_change,
    notify_delivery_failed,
    send_password_reset_email,
)
from app.config import settings


def test_console_notification_provider():
    """Console email provider logs cleanly to stdout and returns True."""
    email_prov = ConsoleNotificationProvider()
    assert email_prov.send_email("test@example.com", "Test Subject", "<p>Hello</p>") is True


def test_resend_email_provider_success():
    """Resend email provider invokes resend SDK with correct parameters and returns True."""
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
    """Resend email provider catches exceptions and returns False without crashing the caller."""
    provider = ResendNotificationProvider(api_key="re_invalid_key", from_email="noreply@test.dev")
    with patch("resend.Emails.send", side_effect=Exception("API Key Invalid")):
        result = provider.send_email("user@test.dev", "Welcome", "<p>Welcome!</p>")
        assert result is False


def test_notification_provider_factory(monkeypatch):
    """Factory returns ResendNotificationProvider when API key is set, and ConsoleNotificationProvider otherwise."""
    # When RESEND_API_KEY is not set
    monkeypatch.setattr(settings, "RESEND_API_KEY", None)
    provider = get_notification_provider()
    assert isinstance(provider, ConsoleNotificationProvider)

    # When RESEND_API_KEY is configured
    monkeypatch.setattr(settings, "RESEND_API_KEY", "re_test_key_abc")
    provider = get_notification_provider()
    assert isinstance(provider, ResendNotificationProvider)


def test_lifecycle_status_transitions_persist_notification_records(db, monkeypatch):
    """Verifies that dispatching notifications records structured audit rows into the notifications table."""
    from app.models.models import User, RoleEnum, Order, Zone, OrderTypeEnum, PaymentTypeEnum, Notification, NotificationStatusEnum
    from app.core.security import hash_password

    # Mock provider send methods to isolate audit persistence from external API rate limits
    monkeypatch.setattr("app.services.notification_service.get_notification_provider", lambda: MagicMock(send_email=lambda *args, **kwargs: True))

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

    # 3. Notify failed delivery
    notify_delivery_failed(db, order, user, "Customer unreachable")
    db.commit()

    failed_notifs = db.query(Notification).filter(
        Notification.order_id == order.id,
        Notification.notification_type.startswith("DELIVERY_FAILED"),
    ).all()
    assert len(failed_notifs) >= 1
    assert any(n.channel == "EMAIL" for n in failed_notifs)


def test_password_reset_email_template_and_dispatch(monkeypatch):
    """Verifies that password reset passcode email generates structured HTML and calls provider."""
    mock_provider = MagicMock()
    mock_provider.send_email.return_value = True
    monkeypatch.setattr("app.services.notification_service.get_notification_provider", lambda: mock_provider)

    sent = send_password_reset_email(to_email="user@example.com", user_name="User Name", otp_code="849201")
    assert sent is True
    mock_provider.send_email.assert_called_once()
    args = mock_provider.send_email.call_args[0] or mock_provider.send_email.call_args[1]
    assert "user@example.com" in str(args)
    assert "849201" in str(args)
