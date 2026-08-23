"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    TEST_DATABASE_URL: Optional[str] = None

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Notifications (Email & SMS)
    RESEND_API_KEY: Optional[str] = None
    NOTIFICATION_FROM_EMAIL: str = "noreply@lastmile.dev"
    # Set RESEND_TEST_EMAIL to your Resend account email to receive all notifications
    # during testing (Resend free tier only sends to the account owner's email)
    RESEND_TEST_EMAIL: Optional[str] = None
    TWILIO_ACCOUNT_SID: Optional[str] = None
    TWILIO_AUTH_TOKEN: Optional[str] = None
    TWILIO_FROM_NUMBER: Optional[str] = None
    # Set TWILIO_TEST_PHONE to your verified phone number to receive all SMS
    # during testing/evaluations even if customer profile has no phone
    TWILIO_TEST_PHONE: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # App
    APP_ENV: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
