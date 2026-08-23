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
    """Sends real emails via Resend API.

    On a free/trial Resend account, emails can only be sent to the account
    owner's email. Set RESEND_TEST_EMAIL in your .env to redirect all
    notifications to that address during testing/development.
    """

    def __init__(self, api_key: str, from_email: str, test_email: Optional[str] = None):
        self.api_key = api_key
        self.from_email = from_email
        self.test_email = test_email  # Override recipient for trial accounts

    def send_email(self, to_email: str, subject: str, body: str) -> bool:
        try:
            import resend
            resend.api_key = self.api_key
            # Use test_email override if configured (Resend free tier restriction)
            recipient = self.test_email if self.test_email else to_email
            resend.Emails.send({
                "from": self.from_email,
                "to": [recipient],
                "subject": subject,
                "html": body,
            })
            log_event("EMAIL_NOTIFICATION_SENT", channel="resend", to=recipient, subject=subject)
            return True
        except Exception as e:
            logger.error(f"Resend email failed to={to_email}: {e}")
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


class TwilioSmsProvider(SmsProvider):
    """Sends real SMS messages via Twilio REST API."""

    def __init__(self, account_sid: str, auth_token: str, from_phone: str, test_phone: Optional[str] = None):
        self.account_sid = account_sid
        self.auth_token = auth_token
        self.from_phone = from_phone
        self.test_phone = test_phone  # Override recipient for trial accounts

    def send_sms(self, to_phone: str, message: str) -> bool:
        recipient = self.test_phone if self.test_phone else to_phone
        try:
            import httpx
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.account_sid}/Messages.json"
            response = httpx.post(
                url,
                auth=(self.account_sid, self.auth_token),
                data={
                    "To": recipient,
                    "From": self.from_phone,
                    "Body": message,
                },
                timeout=5.0,
            )
            if response.status_code in [200, 201]:
                log_event("SMS_NOTIFICATION_SENT", channel="twilio", to=recipient, message=message)
                return True
            else:
                logger.error(f"Twilio SMS failed with status {response.status_code}: {response.text}")
                log_event(
                    "SMS_NOTIFICATION_FAILED",
                    channel="twilio",
                    to=recipient,
                    status_code=response.status_code,
                    error=response.text[:200],
                )
                return False
        except Exception as e:
            logger.error(f"Twilio SMS exception: {e}")
            log_event(
                "SMS_NOTIFICATION_FAILED",
                channel="twilio",
                to=recipient,
                error=str(e),
            )
            return False


def get_notification_provider() -> NotificationProvider:
    """Factory — returns configured email notification provider."""
    if settings.RESEND_API_KEY:
        return ResendNotificationProvider(
            api_key=settings.RESEND_API_KEY,
            from_email=settings.NOTIFICATION_FROM_EMAIL,
            test_email=settings.RESEND_TEST_EMAIL,
        )
    return ConsoleNotificationProvider()


def get_sms_provider() -> SmsProvider:
    """Factory — returns configured SMS notification provider."""
    if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN and settings.TWILIO_FROM_NUMBER:
        return TwilioSmsProvider(
            account_sid=settings.TWILIO_ACCOUNT_SID,
            auth_token=settings.TWILIO_AUTH_TOKEN,
            from_phone=settings.TWILIO_FROM_NUMBER,
            test_phone=settings.TWILIO_TEST_PHONE,
        )
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

    # 2. SMS Notification (use user_phone or TWILIO_TEST_PHONE if available)
    target_phone = user_phone.strip() if (user_phone and user_phone.strip()) else settings.TWILIO_TEST_PHONE

    if target_phone and sms_message:
        sms_provider = get_sms_provider()
        try:
            sms_success = sms_provider.send_sms(target_phone, sms_message)
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
    elif sms_message:
        # Gracefully log that SMS was skipped because no phone was on file
        log_event("SMS_NOTIFICATION_SKIPPED", reason="No customer phone or test phone configured", order_id=str(order_id))



# ---------------------------------------------------------------------------
# HTML email builder helpers
# ---------------------------------------------------------------------------
def _html_email(title: str, body_html: str) -> str:
    """Generate a professional, beautifully styled HTML email — works in all mail clients."""
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f172a;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;box-shadow:0 25px 50px rgba(0,0,0,0.5);">

        <!-- Brand Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%);padding:32px 40px;text-align:center;">
            <p style="margin:0 0 8px;display:inline-block;background:rgba(99,102,241,0.2);border:1px solid rgba(99,102,241,0.4);border-radius:8px;padding:6px 16px;color:#a5b4fc;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">&#128666; Last-Mile Delivery</p>
            <h1 style="margin:16px 0 0;color:#ffffff;font-size:24px;font-weight:700;line-height:1.3;">{title}</h1>
          </td>
        </tr>

        <!-- Body Content -->
        <tr><td style="background-color:#1e293b;padding:36px 40px;">{body_html}</td></tr>

        <!-- Divider + Footer -->
        <tr><td style="background-color:#1e293b;padding:0 40px 24px;">
          <hr style="border:none;border-top:1px solid #334155;margin:0 0 20px;" />
          <p style="margin:0;color:#475569;font-size:12px;line-height:1.8;text-align:center;">
            Automated notification from the Last-Mile Delivery Management Platform.<br/>
            Please do not reply to this email.<br/>
            <span style="color:#334155;">&#169; 2025 Last-Mile Delivery Tracker. All rights reserved.</span>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _info_row(icon: str, label: str, value: str) -> str:
    return f"""<tr>
      <td style="padding:9px 0;border-bottom:1px solid #334155;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td style="width:26px;color:#64748b;font-size:15px;">{icon}</td>
          <td style="color:#94a3b8;font-size:13px;font-weight:500;width:130px;">{label}</td>
          <td style="color:#e2e8f0;font-size:13px;font-weight:600;">{value}</td>
        </tr></table>
      </td>
    </tr>"""


def _card(header: str, rows_html: str, accent: str = "#6366f1") -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(30,41,59,0.9);border:1px solid #334155;border-radius:12px;margin-bottom:20px;overflow:hidden;">
      <tr><td style="background:rgba({accent.lstrip('#')},0.08);padding:10px 20px;border-bottom:1px solid #334155;">
        <p style="margin:0;color:#94a3b8;font-size:11px;font-weight:700;letter-spacing:1.2px;text-transform:uppercase;">{header}</p>
      </td></tr>
      <tr><td style="padding:4px 20px 12px;">
        <table width="100%" cellpadding="0" cellspacing="0">{rows_html}</table>
      </td></tr>
    </table>"""


# ---------------------------------------------------------------------------
# Pre-built notification templates — rich HTML emails
# ---------------------------------------------------------------------------
def notify_order_created(db: Session, order, customer):
    short_id = str(order.id)[:8].upper()
    subject = f"✅ Order Confirmed — #{short_id}"

    order_type = order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type)
    payment_type = order.payment_type.value if hasattr(order.payment_type, 'value') else str(order.payment_type)

    rows = (
        _info_row("🆔", "Order ID", f"#{short_id}") +
        _info_row("📍", "Pickup", order.pickup_pincode) +
        _info_row("🏁", "Drop-off", order.drop_pincode) +
        _info_row("📦", "Order Type", order_type) +
        _info_row("💳", "Payment", payment_type) +
        _info_row("💰", "Total Charge", f"\u20b9{order.total_charge}")
    )

    body_html = f"""
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.7;">
      Hi <strong style="color:#e2e8f0;">{customer.name}</strong>,<br/>
      Your order has been placed successfully and is being processed. An agent will be assigned shortly.
    </p>
    {_card("📦 Order Details", rows)}
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(21,128,61,0.1);border:1px solid rgba(21,128,61,0.3);border-radius:10px;padding:14px 20px;margin-bottom:24px;">
      <tr><td style="color:#4ade80;font-size:13px;font-weight:600;">
        🎉 Your order is confirmed. We'll notify you as soon as a delivery agent is assigned.
      </td></tr>
    </table>"""

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        user_phone=customer.phone, notification_type="ORDER_CREATED",
        subject=subject, body=_html_email(f"Order Confirmed — #{short_id}", body_html),
        sms_message=f"LastMile: Order #{short_id} confirmed. Total Rs {order.total_charge}. Track in dashboard.",
    )


def notify_order_assigned(db: Session, order, customer, agent_name: str):
    short_id = str(order.id)[:8].upper()
    subject = f"🚚 Agent Assigned — #{short_id}"

    rows = (
        _info_row("🆔", "Order ID", f"#{short_id}") +
        _info_row("📍", "Pickup", order.pickup_pincode) +
        _info_row("🏁", "Drop-off", order.drop_pincode) +
        _info_row("📊", "Status", "Agent Assigned")
    )

    body_html = f"""
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.7;">
      Hi <strong style="color:#e2e8f0;">{customer.name}</strong>,<br/>
      Great news! A delivery agent has been assigned and is heading your way.
    </p>

    <!-- Agent Spotlight Card -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.12));border:1px solid rgba(99,102,241,0.35);border-radius:12px;padding:28px;margin-bottom:20px;text-align:center;">
      <tr><td>
        <p style="margin:0 0 4px;font-size:48px;">🧑&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</p>
        <p style="margin:0 0 6px;color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Your Delivery Agent</p>
        <p style="margin:0 0 12px;color:#ffffff;font-size:26px;font-weight:800;">{agent_name}</p>
        <span style="display:inline-block;background:rgba(99,102,241,0.25);border:1px solid rgba(99,102,241,0.5);border-radius:20px;padding:5px 18px;color:#a5b4fc;font-size:12px;font-weight:700;">&#128994; On the Way</span>
      </td></tr>
    </table>

    {_card("📦 Order Info", rows)}
    <p style="margin:0 0 8px;color:#64748b;font-size:13px;line-height:1.7;">
      Your package will be picked up shortly. Expect real-time status updates as the delivery progresses.
    </p>"""

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        user_phone=customer.phone, notification_type="ORDER_ASSIGNED",
        subject=subject, body=_html_email(f"Agent Assigned — #{short_id}", body_html),
        sms_message=f"LastMile: {agent_name} assigned to Order #{short_id}. Pickup starting soon.",
    )


def notify_status_change(db: Session, order, customer, new_status: str):
    short_id = str(order.id)[:8].upper()

    _map = {
        "PICKED_UP":        ("📦", "Package Picked Up",       "Package safely collected by agent and in transit."),
        "IN_TRANSIT":       ("🚌", "In Transit",              "Your package is on the move through our network."),
        "OUT_FOR_DELIVERY": ("🛵", "Out for Delivery",        "Your package is just around the corner! Stay available."),
        "DELIVERED":        ("✅", "Successfully Delivered",   "Your package has been delivered. Thank you for choosing Last-Mile!"),
        "CANCELLED":        ("❌", "Order Cancelled",         "Your order has been cancelled. Contact support if unexpected."),
    }
    icon, headline, msg = _map.get(new_status, ("🔄", new_status.replace("_", " ").title(), "Your order status has been updated."))
    subject = f"{icon} {headline} — #{short_id}"

    rows = (
        _info_row("🆔", "Order ID", f"#{short_id}") +
        _info_row("📍", "Route", f"{order.pickup_pincode} \u2192 {order.drop_pincode}")
    )

    body_html = f"""
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.7;">
      Hi <strong style="color:#e2e8f0;">{customer.name}</strong>,<br/>
      {msg}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(30,41,59,0.9);border:1px solid #334155;border-radius:12px;padding:28px;margin-bottom:20px;text-align:center;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:48px;">{icon}</p>
        <p style="margin:0;color:#e2e8f0;font-size:22px;font-weight:700;">{headline}</p>
      </td></tr>
    </table>
    {_card("📦 Order Details", rows)}"""

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        user_phone=customer.phone, notification_type=f"STATUS_{new_status}",
        subject=subject, body=_html_email(headline, body_html),
        sms_message=f"LastMile: Order #{short_id} is now {new_status.replace('_',' ').title()}.",
    )


def notify_delivery_failed(db: Session, order, customer, reason: str):
    short_id = str(order.id)[:8].upper()
    subject = f"⚠️ Delivery Failed — #{short_id}"

    rows = (
        _info_row("🆔", "Order ID", f"#{short_id}") +
        _info_row("📍", "Route", f"{order.pickup_pincode} \u2192 {order.drop_pincode}") +
        _info_row("⚠️", "Failure Reason", reason) +
        _info_row("📊", "Status", "Failed — Please Reschedule")
    )

    body_html = f"""
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.7;">
      Hi <strong style="color:#e2e8f0;">{customer.name}</strong>,<br/>
      We're sorry — your delivery attempt was unsuccessful. You can reschedule at any time from your dashboard.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(185,28,28,0.1);border:1px solid rgba(185,28,28,0.35);border-radius:12px;padding:20px;margin-bottom:20px;">
      <tr><td>
        <p style="margin:0 0 6px;color:#fca5a5;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">⚠️ Delivery Attempt Failed</p>
        <p style="margin:0;color:#e2e8f0;font-size:14px;">Reason: <em style="color:#fca5a5;">{reason}</em></p>
      </td></tr>
    </table>
    {_card("📦 Order Details", rows)}
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.25);border-radius:10px;padding:14px 20px;">
      <tr><td style="color:#fbbf24;font-size:13px;line-height:1.7;">
        👉 <strong>Next:</strong> Log in to your dashboard and reschedule. A new agent will be automatically assigned.
      </td></tr>
    </table>"""

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        user_phone=customer.phone, notification_type="DELIVERY_FAILED",
        subject=subject, body=_html_email("Delivery Attempt Failed", body_html),
        sms_message=f"LastMile: Delivery failed for #{short_id}. Reason: {reason}. Reschedule in dashboard.",
    )


def notify_order_rescheduled(db: Session, order, customer, new_date: str):
    short_id = str(order.id)[:8].upper()
    subject = f"📅 Order Rescheduled — #{short_id}"

    rows = (
        _info_row("🆔", "Order ID", f"#{short_id}") +
        _info_row("📍", "Route", f"{order.pickup_pincode} \u2192 {order.drop_pincode}") +
        _info_row("📅", "New Date", new_date) +
        _info_row("📊", "Status", "Rescheduled — Assigning Agent")
    )

    body_html = f"""
    <p style="margin:0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.7;">
      Hi <strong style="color:#e2e8f0;">{customer.name}</strong>,<br/>
      Your delivery has been rescheduled successfully. A new agent is being assigned and you'll receive another confirmation shortly.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="background:linear-gradient(135deg,rgba(99,102,241,0.15),rgba(139,92,246,0.1));border:1px solid rgba(99,102,241,0.3);border-radius:12px;padding:28px;margin-bottom:20px;text-align:center;">
      <tr><td>
        <p style="margin:0 0 6px;font-size:48px;">📅</p>
        <p style="margin:0 0 6px;color:#a5b4fc;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">New Delivery Date</p>
        <p style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">{new_date}</p>
      </td></tr>
    </table>
    {_card("📦 Order Details", rows)}"""

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        user_phone=customer.phone, notification_type="ORDER_RESCHEDULED",
        subject=subject, body=_html_email(f"Order Rescheduled — #{short_id}", body_html),
        sms_message=f"LastMile: Order #{short_id} rescheduled to {new_date}. New agent being assigned.",
    )


