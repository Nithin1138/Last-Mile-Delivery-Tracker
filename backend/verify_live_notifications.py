"""
Live verification script for Resend Email and Twilio SMS providers.
Executes real external API calls against Resend and Twilio using configured credentials.
"""

import os
import sys
from dotenv import load_dotenv

# Load .env
load_dotenv()

from app.config import settings
from app.services.notification_service import (
    ResendNotificationProvider,
    TwilioSmsProvider,
    get_notification_provider,
    get_sms_provider,
)

def verify_live_email():
    print("📧 Testing Live Resend Email Dispatch...")
    print(f"   API Key: {settings.RESEND_API_KEY[:6]}... (configured)")
    print(f"   From: {settings.NOTIFICATION_FROM_EMAIL}")
    print(f"   Recipient / Test Email: {settings.RESEND_TEST_EMAIL}")
    
    provider = get_notification_provider()
    print(f"   Active Provider: {provider.__class__.__name__}")
    
    if not isinstance(provider, ResendNotificationProvider):
        print("❌ Error: Active provider is not ResendNotificationProvider. Check RESEND_API_KEY.")
        return False
        
    subject = "📦 LastMile Flow - Live Verification Test"
    body = """
    <div style="font-family: sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px;">
        <h2 style="color: #4f46e5;">LastMile Flow Verification</h2>
        <p>This is a real live verification email sent from LastMile Delivery Platform.</p>
        <p><strong>Status:</strong> Live Transactional Delivery Confirmed ✅</p>
        <p><strong>Recipient Phone:</strong> +919618484381</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #64748b;">Automated verification test completed.</p>
    </div>
    """
    success = provider.send_email(settings.RESEND_TEST_EMAIL or "test@example.com", subject, body)
    if success:
        print("✅ Live Resend Email sent successfully!")
        return True
    else:
        print("⚠️ Live Resend Email dispatch attempted against real Resend API (Quota/Daily limit reached or credentials active).")
        return False

def verify_live_sms():
    print("\n📱 Testing Live Twilio SMS Dispatch...")
    print(f"   Account SID: {settings.TWILIO_ACCOUNT_SID[:6]}... (configured)")
    print(f"   From Number: {settings.TWILIO_FROM_NUMBER}")
    print(f"   To / Test Phone: {settings.TWILIO_TEST_PHONE}")
    
    provider = get_sms_provider()
    print(f"   Active Provider: {provider.__class__.__name__}")
    
    if not isinstance(provider, TwilioSmsProvider):
        print("❌ Error: Active provider is not TwilioSmsProvider. Check TWILIO credentials.")
        return False
        
    message = "LastMile Flow: Order tracking alert for +919618484381. Status: VERIFIED"
    success = provider.send_sms(settings.TWILIO_TEST_PHONE or "+919618484381", message)
    if success:
        print("✅ Live Twilio SMS sent successfully to +919618484381!")
        return True
    else:
        print("⚠️ Live Twilio SMS dispatch attempted against real Twilio REST API.")
        return False


if __name__ == "__main__":
    email_ok = verify_live_email()
    sms_ok = verify_live_sms()
    
    print("\n" + "="*50)
    print(f"Live Email Result: {'PASS ✅' if email_ok else 'FAIL ❌'}")
    print(f"Live SMS Result:   {'PASS ✅' if sms_ok else 'FAIL ❌'}")
    print("="*50)
    
    if email_ok and sms_ok:
        print("\n🎉 Both Live Resend Email and Live Twilio SMS are 100% VERIFIED!")
        sys.exit(0)
    else:
        sys.exit(1)
