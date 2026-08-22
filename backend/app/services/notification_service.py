"""
Notification service — provider abstractions for Email and SMS with Console and Production implementations.

Email:
- Local/demo uses ConsoleNotificationProvider (no external dependency).
- Production uses ResendNotificationProvider (configured via RESEND_API_KEY env var).

SMS:
- Local/demo uses ConsoleSmsProvider (logs to stdout/audit tables).
- Extensible interface for production Twilio/AWS SNS/Gupshup integration.

Failures are logged and recorded in the audit log without corrupting the calling transaction.
"""

import logging
from abc import ABC, abstractmethod
from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.models import Notification, NotificationStatusEnum
from app.config import settings
from app.core.events import log_event

logger = logging.getLogger("notifications")


# ---------------------------------------------------------------------------
# Email Provider Abstraction
# ---------------------------------------------------------------------------
class NotificationProvider(ABC):
    """Abstract notification provider interface for email."""

    @abstractmethod
    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send an email notification. Returns True on success."""
        ...


class ConsoleNotificationProvider(NotificationProvider):
    """Logs email notifications to console — no external dependency needed."""

    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        logger.info(
            f"[CONSOLE_EMAIL] to={to_email} subject=\"{subject}\"\n"
            f"  body: {body[:200]}{'...' if len(body) > 200 else ''}"
        )
        log_event("EMAIL_NOTIFICATION_SENT", channel="console", to=to_email, subject=subject)
        return True


class ResendNotificationProvider(NotificationProvider):
    """Sends real emails via Resend API."""

    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email

    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        try:
            import resend
            resend.api_key = self.api_key
            resend.Emails.send({
                "from": self.from_email,
                "to": [to_email],
                "subject": subject,
                "html": body,
            })
            log_event("EMAIL_NOTIFICATION_SENT", channel="resend", to=to_email, subject=subject)
            return True
        except Exception as e:
            logger.error(f"Resend email failed: {e}")
            log_event(
                "EMAIL_NOTIFICATION_FAILED",
                channel="resend",
                to=to_email,
                error=str(e),
            )
            return False


# ---------------------------------------------------------------------------
# SMS Provider Abstraction
# ---------------------------------------------------------------------------
class SmsProvider(ABC):
    """Abstract SMS provider interface."""

    @abstractmethod
    def send_sms(self, to_phone: str, message: str) -> bool:
        """Send an SMS notification. Returns True on success."""
        ...


class ConsoleSmsProvider(SmsProvider):
    """Logs SMS notifications to console for zero-config local evaluation."""

    def send_sms(self, to_phone: str, message: str) -> bool:
        logger.info(f"[CONSOLE_SMS] to={to_phone} message=\"{message}\"")
        log_event("SMS_NOTIFICATION_SENT", channel="console_sms", to=to_phone, message=message)
        return True


def get_notification_provider() -> NotificationProvider:
    """Factory — returns configured email notification provider."""
    if settings.RESEND_API_KEY:
        return ResendNotificationProvider(
            api_key=settings.RESEND_API_KEY,
            from_email=settings.NOTIFICATION_FROM_EMAIL,
        )
    return ConsoleNotificationProvider()


def get_sms_provider() -> SmsProvider:
    """Factory — returns configured SMS notification provider."""
    return ConsoleSmsProvider()


def send_order_notification(
    db: Session,
    order_id: UUID,
    user_id: UUID,
    user_email: str,
    notification_type: str,
    subject: str,
    body: str,
    user_phone: Optional[str] = None,
    sms_message: Optional[str] = None,
):
    """Send order email and SMS notifications and record them in the audit log."""
    # 1. Email Notification
    email_provider = get_notification_provider()
    try:
        email_success = email_provider.send_email(user_email, subject, body)
        email_status = NotificationStatusEnum.SENT if email_success else NotificationStatusEnum.FAILED
        email_err = None if email_success else "Provider returned failure"
    except Exception as e:
        email_status = NotificationStatusEnum.FAILED
        email_err = str(e)
        logger.error(f"Email notification send error: {e}")

    email_record = Notification(
        order_id=order_id,
        user_id=user_id,
        notification_type=notification_type,
        channel="EMAIL",
        subject=subject,
        body=body,
        status=email_status,
        error_message=email_err,
    )
    db.add(email_record)

    # 2. SMS Notification (if phone provided)
    if user_phone and sms_message:
        sms_provider = get_sms_provider()
        try:
            sms_success = sms_provider.send_sms(user_phone, sms_message)
            sms_status = NotificationStatusEnum.SENT if sms_success else NotificationStatusEnum.FAILED
            sms_err = None if sms_success else "SMS provider returned failure"
        except Exception as e:
            sms_status = NotificationStatusEnum.FAILED
            sms_err = str(e)
            logger.error(f"SMS send error: {e}")

        sms_record = Notification(
            order_id=order_id,
            user_id=user_id,
            notification_type=f"{notification_type}_SMS",
            channel="SMS",
            subject=None,
            body=sms_message,
            status=sms_status,
            error_message=sms_err,
        )
        db.add(sms_record)


# ---------------------------------------------------------------------------
# Pre-built notification templates
# ---------------------------------------------------------------------------
def notify_order_created(db: Session, order, customer):
    short_id = str(order.id)[:8]
    send_order_notification(
        db,
        order_id=order.id,
        user_id=customer.id,
        user_email=customer.email,
        user_phone=customer.phone,
        notification_type="ORDER_CREATED",
        subject=f"Order Created - #{short_id}",
        body=f"<p>Your order <strong>#{short_id}</strong> has been created. Total charge: ₹{order.total_charge}</p>",
        sms_message=f"LastMile: Order #{short_id} placed. Total: Rs {order.total_charge}.",
    )


def notify_order_assigned(db: Session, order, customer, agent_name: str):
    short_id = str(order.id)[:8]
    send_order_notification(
        db,
        order_id=order.id,
        user_id=customer.id,
        user_email=customer.email,
        user_phone=customer.phone,
        notification_type="ORDER_ASSIGNED",
        subject=f"Agent Assigned - Order #{short_id}",
        body=f"<p>Your order <strong>#{short_id}</strong> has been assigned to agent <strong>{agent_name}</strong>.</p>",
        sms_message=f"LastMile: Agent {agent_name} assigned to Order #{short_id}.",
    )


def notify_status_change(db: Session, order, customer, new_status: str):
    short_id = str(order.id)[:8]
    send_order_notification(
        db,
        order_id=order.id,
        user_id=customer.id,
        user_email=customer.email,
        user_phone=customer.phone,
        notification_type=f"STATUS_{new_status}",
        subject=f"Order Update - #{short_id} is now {new_status}",
        body=f"<p>Your order <strong>#{short_id}</strong> status has been updated to <strong>{new_status}</strong>.</p>",
        sms_message=f"LastMile: Order #{short_id} status updated to {new_status}.",
    )


def notify_delivery_failed(db: Session, order, customer, reason: str):
    short_id = str(order.id)[:8]
    send_order_notification(
        db,
        order_id=order.id,
        user_id=customer.id,
        user_email=customer.email,
        user_phone=customer.phone,
        notification_type="DELIVERY_FAILED",
        subject=f"Delivery Attempt Failed - Order #{short_id}",
        body=f"<p>Delivery attempt for order <strong>#{short_id}</strong> failed: <strong>{reason}</strong>. Please reschedule via your dashboard.</p>",
        sms_message=f"LastMile: Delivery failed for #{short_id} ({reason}). Reschedule in dashboard.",
    )


def notify_order_rescheduled(db: Session, order, customer, new_date: str):
    short_id = str(order.id)[:8]
    send_order_notification(
        db,
        order_id=order.id,
        user_id=customer.id,
        user_email=customer.email,
        user_phone=customer.phone,
        notification_type="ORDER_RESCHEDULED",
        subject=f"Order Rescheduled - #{short_id}",
        body=f"<p>Your order <strong>#{short_id}</strong> has been successfully rescheduled for <strong>{new_date}</strong>. It will be reassigned for the new delivery window.</p>",
        sms_message=f"LastMile: Order #{short_id} rescheduled for {new_date}.",
    )
