#!/usr/bin/env python3
"""
Test Email Dispatch Script

Runs a live diagnostic check on the transactional email system:
- Checks if RESEND_API_KEY and NOTIFICATION_FROM_EMAIL are configured.
- Dispatches a test transactional email.
- Reports exact provider status, recipient, and API response.

Usage:
  python3 scripts/test_email_dispatch.py [recipient_email]
"""

import sys
import os

# Ensure backend app is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))

from app.config import settings
from app.services.notification_service import get_notification_provider, _build_minimal_email

def main():
    recipient = sys.argv[1] if len(sys.argv) > 1 else (settings.RESEND_TEST_EMAIL or "test@example.com")
    
    print("=" * 60)
    print("📧 LAST-MILE DELIVERY TRACKER — EMAIL DIAGNOSTIC TEST")
    print("=" * 60)
    
    print(f"• APP_ENV:                  {settings.APP_ENV}")
    print(f"• RESEND_API_KEY Configured: {'YES (' + settings.RESEND_API_KEY[:6] + '...)' if settings.RESEND_API_KEY else 'NO (using Console Fallback)'}")
    print(f"• NOTIFICATION_FROM_EMAIL:  {settings.NOTIFICATION_FROM_EMAIL}")
    print(f"• RESEND_TEST_EMAIL:        {settings.RESEND_TEST_EMAIL or 'None (using direct recipient)'}")
    print(f"• Target Recipient:         {recipient}")
    print("-" * 60)

    provider = get_notification_provider()
    provider_name = provider.__class__.__name__
    print(f"• Active Provider Adapter:  {provider_name}")

    subject = "🧪 LastMile Flow - Live Email Dispatch Test"
    html_body = _build_minimal_email(
        short_id="TEST-001",
        title="Email Verification Test",
        intro="This is an automated test email to confirm that your production transactional email provider is properly configured and delivering messages.",
        rows=[
            ("Status", "SUCCESSFUL DISPATCH"),
            ("Provider", provider_name),
            ("Sender", settings.NOTIFICATION_FROM_EMAIL),
            ("Target", recipient),
        ],
    )

    print("\nAttempting email dispatch...")
    success = provider.send_email(recipient, subject, html_body)

    print("-" * 60)
    if success:
        print(f"✅ EMAIL DISPATCH SUCCEEDED via {provider_name}!")
        if provider_name == "ResendNotificationProvider":
            print(f"📬 Message delivered to: {settings.RESEND_TEST_EMAIL or recipient}")
        else:
            print("ℹ️ Note: Console provider was used. Set RESEND_API_KEY in your environment to send live emails to actual inboxes.")
    else:
        print("❌ EMAIL DISPATCH FAILED.")
        print("Common reasons for failure:")
        print("  1. Invalid or expired RESEND_API_KEY.")
        print("  2. Resend Free Tier restriction: Free accounts can only send to the account owner's email. Set RESEND_TEST_EMAIL=your_email@gmail.com.")
        print("  3. Domain not verified: Set NOTIFICATION_FROM_EMAIL=onboarding@resend.dev unless your custom domain is verified in Resend.")
    print("=" * 60)

if __name__ == "__main__":
    main()
