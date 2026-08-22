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

    # Notifications
    RESEND_API_KEY: Optional[str] = None
    NOTIFICATION_FROM_EMAIL: str = "noreply@lastmile.dev"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    # App
    APP_ENV: str = "development"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
