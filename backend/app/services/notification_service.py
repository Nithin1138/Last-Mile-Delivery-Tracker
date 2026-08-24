"""
Transactional Notification Service — provider abstractions for Lifecycle Email Notifications.

Email:
- Local/demo uses ConsoleNotificationProvider (no external dependency, logs to stdout).
- Production uses ResendNotificationProvider (configured via RESEND_API_KEY env var).

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


def get_notification_provider() -> NotificationProvider:
    """Factory — returns configured email notification provider."""
    if settings.RESEND_API_KEY:
        return ResendNotificationProvider(
            api_key=settings.RESEND_API_KEY,
            from_email=settings.NOTIFICATION_FROM_EMAIL,
            test_email=settings.RESEND_TEST_EMAIL,
        )
    return ConsoleNotificationProvider()


def send_order_notification(
    db: Session,
    order_id: UUID,
    user_id: UUID,
    user_email: str,
    notification_type: str,
    subject: str,
    body: str,
):
    """Send transactional email notification and record structured audit row in PostgreSQL."""
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




# ---------------------------------------------------------------------------
# Clean, Structured, Minimal HTML Email Builder
# ---------------------------------------------------------------------------
def _build_minimal_email(
    short_id: str,
    title: str,
    intro: str,
    rows: list[tuple[str, str]],
    highlight_html: Optional[str] = None,
) -> str:
    """Build a professional, clean, minimal, structured HTML email.

    Design specs:
    - 540px container max-width with zero overflow
    - Clean neutral aesthetic (crisp white card on slate-50 canvas)
    - Perfectly aligned 2-column key-value summary table
    - Fully responsive table layout with word-wrap
    - Compatible with all major email clients (Gmail, Apple Mail, Outlook)
    """
    rows_html = ""
    for idx, (label, val) in enumerate(rows):
        border_bottom = "border-bottom: 1px solid #f1f5f9;" if idx < len(rows) - 1 else ""
        rows_html += f"""
        <tr>
          <td style="padding: 10px 14px; font-size: 13px; color: #64748b; font-weight: 500; {border_bottom} width: 42%;">{label}</td>
          <td style="padding: 10px 14px; font-size: 13px; color: #0f172a; font-weight: 600; text-align: right; {border_bottom} width: 58%;">{val}</td>
        </tr>"""

    highlight_block = f'<div style="margin: 16px 0 20px;">{highlight_html}</div>' if highlight_html else ""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; -webkit-font-smoothing: antialiased;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; table-layout: fixed;">
    <!-- Brand Header -->
    <tr>
      <td style="padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td style="vertical-align: middle;">
              <span style="font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: #4f46e5;">Last-Mile Delivery</span>
            </td>
            <td align="right" style="vertical-align: middle;">
              <span style="font-size: 12px; font-weight: 600; color: #64748b; background-color: #f1f5f9; padding: 3px 8px; border-radius: 4px; font-family: monospace;">#{short_id}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Body Content -->
    <tr>
      <td style="padding: 24px;">
        <h1 style="margin: 0 0 10px; font-size: 19px; font-weight: 700; color: #0f172a; line-height: 1.3;">{title}</h1>
        <p style="margin: 0 0 16px; font-size: 14px; color: #475569; line-height: 1.6;">{intro}</p>

        {highlight_block}

        <!-- Key-Value Table -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden; background-color: #ffffff; table-layout: fixed; word-break: break-word;">
          {rows_html}
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding: 16px 24px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
          Automated notification from Last-Mile Delivery Tracker.<br>
          © 2025 Last-Mile Delivery Tracker. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""


# ---------------------------------------------------------------------------
# Pre-built notification templates
# ---------------------------------------------------------------------------
def notify_order_created(db: Session, order, customer):
    short_id = str(order.id)[:8].upper()
    subject = f"Order Confirmed — #{short_id}"

    order_type = order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type)
    payment_type = order.payment_type.value if hasattr(order.payment_type, 'value') else str(order.payment_type)

    rows = [
        ("Order ID", f"#{short_id}"),
        ("Pickup Pincode", str(order.pickup_pincode)),
        ("Delivery Pincode", str(order.drop_pincode)),
        ("Order Type", order_type),
        ("Payment Mode", payment_type),
        ("Total Amount", f"₹{order.total_charge}"),
    ]

    intro = f"Hello <strong>{customer.name}</strong>, your order has been received and confirmed. We are assigning the nearest delivery agent to pick up your package."

    body = _build_minimal_email(
        short_id=short_id,
        title="Order Placed Successfully",
        intro=intro,
        rows=rows,
    )

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        notification_type="ORDER_CREATED", subject=subject, body=body,
    )


def notify_order_assigned(db: Session, order, customer, agent_name: str):
    short_id = str(order.id)[:8].upper()
    subject = f"Agent Assigned — #{short_id}"

    rows = [
        ("Order ID", f"#{short_id}"),
        ("Delivery Agent", agent_name),
        ("Pickup Pincode", str(order.pickup_pincode)),
        ("Drop-off Pincode", str(order.drop_pincode)),
        ("Status", "Assigned & Dispatched"),
    ]

    intro = f"Hello <strong>{customer.name}</strong>, a delivery agent has been assigned to your order and is preparing for pickup."

    highlight = f"""
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid #4f46e5; border-radius: 0 6px 6px 0; padding: 14px 16px;">
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #4f46e5; margin-bottom: 3px;">Assigned Delivery Agent</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a;">{agent_name}</div>
          <div style="font-size: 12px; color: #16a34a; font-weight: 500; margin-top: 2px;">● On duty & dispatched</div>
        </td>
      </tr>
    </table>"""

    body = _build_minimal_email(
        short_id=short_id,
        title="Delivery Agent Assigned",
        intro=intro,
        rows=rows,
        highlight_html=highlight,
    )

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        notification_type="ORDER_ASSIGNED", subject=subject, body=body,
    )


def notify_status_change(db: Session, order, customer, new_status: str):
    short_id = str(order.id)[:8].upper()

    status_labels = {
        "PICKED_UP": ("Package Picked Up", "Your package has been picked up by the delivery agent and is on its way."),
        "IN_TRANSIT": ("Package in Transit", "Your shipment is moving through the delivery route."),
        "OUT_FOR_DELIVERY": ("Out for Delivery", "Your delivery is out for final delivery. Please ensure someone is available at the address."),
        "DELIVERED": ("Delivered Successfully", "Your shipment has been delivered. Thank you for using Last-Mile Delivery!"),
        "CANCELLED": ("Order Cancelled", "Your delivery order has been cancelled."),
    }

    title, intro_msg = status_labels.get(
        new_status,
        (f"Status Update: {new_status.replace('_', ' ').title()}", "Your order status has been updated."),
    )

    subject = f"{title} — #{short_id}"
    intro = f"Hello <strong>{customer.name}</strong>, {intro_msg}"

    rows = [
        ("Order ID", f"#{short_id}"),
        ("Route", f"{order.pickup_pincode} → {order.drop_pincode}"),
        ("Current Status", new_status.replace("_", " ").title()),
    ]

    status_color = "#16a34a" if new_status == "DELIVERED" else "#4f46e5"
    highlight = f"""
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; border-left: 4px solid {status_color}; border-radius: 0 6px 6px 0; padding: 12px 16px;">
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 2px;">Shipment Status</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">{new_status.replace('_', ' ').title()}</div>
        </td>
      </tr>
    </table>"""

    body = _build_minimal_email(
        short_id=short_id,
        title=title,
        intro=intro,
        rows=rows,
        highlight_html=highlight,
    )

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        notification_type=f"STATUS_{new_status}", subject=subject, body=body,
    )


def notify_delivery_failed(db: Session, order, customer, reason: str):
    short_id = str(order.id)[:8].upper()
    subject = f"Delivery Attempt Failed — #{short_id}"

    rows = [
        ("Order ID", f"#{short_id}"),
        ("Route", f"{order.pickup_pincode} → {order.drop_pincode}"),
        ("Failure Reason", reason),
        ("Next Step", "Reschedule in dashboard"),
    ]

    intro = f"Hello <strong>{customer.name}</strong>, our delivery attempt for order #{short_id} could not be completed."

    highlight = f"""
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 0 6px 6px 0; padding: 14px 16px;">
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #dc2626; margin-bottom: 3px;">Attempt Unsuccessful</div>
          <div style="font-size: 14px; font-weight: 600; color: #991b1b;">Reason: {reason}</div>
          <div style="font-size: 12px; color: #b91c1c; margin-top: 4px;">Please log in to your dashboard to choose a new delivery date.</div>
        </td>
      </tr>
    </table>"""

    body = _build_minimal_email(
        short_id=short_id,
        title="Delivery Attempt Unsuccessful",
        intro=intro,
        rows=rows,
        highlight_html=highlight,
    )

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        notification_type="DELIVERY_FAILED", subject=subject, body=body,
    )


def notify_order_rescheduled(db: Session, order, customer, new_date: str):
    short_id = str(order.id)[:8].upper()
    subject = f"Order Rescheduled — #{short_id}"

    rows = [
        ("Order ID", f"#{short_id}"),
        ("New Delivery Date", new_date),
        ("Route", f"{order.pickup_pincode} → {order.drop_pincode}"),
        ("Status", "Rescheduled (Reassigning Agent)"),
    ]

    intro = f"Hello <strong>{customer.name}</strong>, your order has been rescheduled. A delivery agent is being assigned for your new delivery window."

    highlight = f"""
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f9ff; border-left: 4px solid #0284c7; border-radius: 0 6px 6px 0; padding: 14px 16px;">
      <tr>
        <td>
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #0284c7; margin-bottom: 3px;">New Scheduled Date</div>
          <div style="font-size: 15px; font-weight: 700; color: #0f172a;">{new_date}</div>
          <div style="font-size: 12px; color: #0369a1; margin-top: 2px;">● An agent will be assigned for this slot</div>
        </td>
      </tr>
    </table>"""

    body = _build_minimal_email(
        short_id=short_id,
        title="Delivery Rescheduled",
        intro=intro,
        rows=rows,
        highlight_html=highlight,
    )

    send_order_notification(
        db, order_id=order.id, user_id=customer.id, user_email=customer.email,
        notification_type="ORDER_RESCHEDULED", subject=subject, body=body,
    )


def build_password_reset_email(user_name: str, otp_code: str) -> str:
    """Build a professional, clean, structured HTML email for password reset passcode."""
    highlight_html = f"""
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f0f4fc; border: 1.5px dashed #3157A6; border-radius: 8px; margin: 16px 0;">
      <tr>
        <td style="padding: 18px 20px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #3157A6; margin-bottom: 6px;">Your 6-Digit Passcode</div>
          <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: 'JetBrains Mono', Consolas, Monaco, monospace; color: #171A1F; margin: 4px 0;">{otp_code}</div>
          <div style="font-size: 12px; color: #5F6672; margin-top: 4px;">● Valid for 15 minutes</div>
        </td>
      </tr>
    </table>"""

    rows = [
        ("Action", "Password Reset Request"),
        ("Validity Window", "15 Minutes"),
        ("Security Notice", "Never share this passcode with anyone"),
    ]

    return _build_minimal_email(
        short_id="SECURITY",
        title="Password Reset Verification",
        intro=f"Hello <strong>{user_name}</strong>,<br>You requested to reset your password for your <strong>LastMile Flow</strong> account. Enter the 6-digit passcode below to set your new password.",
        rows=rows,
        highlight_html=highlight_html,
    )


def send_password_reset_email(to_email: str, user_name: str, otp_code: str) -> bool:
    """Send 6-digit password reset verification email using configured provider."""
    provider = get_notification_provider()
    subject = "LastMile Flow — 6-Digit Password Reset Passcode"
    body = build_password_reset_email(user_name=user_name, otp_code=otp_code)
    return provider.send_email(to_email=to_email, subject=subject, body=body)
