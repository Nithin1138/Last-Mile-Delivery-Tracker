"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/delivery_tracker"
    TEST_DATABASE_URL: Optional[str] = "postgresql://postgres:postgres@localhost:5432/delivery_tracker_test"

    # JWT
    JWT_SECRET_KEY: str = "development-evaluation-jwt-secret-key-at-least-32-chars-length"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 480


    # Transactional Email Notifications
    RESEND_API_KEY: Optional[str] = None
    NOTIFICATION_FROM_EMAIL: str = "noreply@lastmile.dev"
    # Set RESEND_TEST_EMAIL to your Resend account email to receive all notifications
    # during testing (Resend free tier only sends to the account owner's email)
    RESEND_TEST_EMAIL: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # App
    APP_ENV: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
