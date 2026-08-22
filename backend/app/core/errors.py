"""Structured application errors with machine-readable error codes."""

from fastapi import Request
from fastapi.responses import JSONResponse


class ErrorCodes:
    """Registry of all application error codes."""

    # Auth
    UNAUTHORIZED = "UNAUTHORIZED"
    FORBIDDEN = "FORBIDDEN"
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS"

    # Orders
    ORDER_NOT_FOUND = "ORDER_NOT_FOUND"
    INVALID_ORDER_DATA = "INVALID_ORDER_DATA"
    INVALID_STATUS_TRANSITION = "INVALID_STATUS_TRANSITION"
    DUPLICATE_REQUEST = "DUPLICATE_REQUEST"
    CANCELLATION_NOT_ALLOWED = "CANCELLATION_NOT_ALLOWED"

    # Agents
    AGENT_NOT_FOUND = "AGENT_NOT_FOUND"
    NO_AVAILABLE_AGENT = "NO_AVAILABLE_AGENT"
    AGENT_ALREADY_ASSIGNED = "AGENT_ALREADY_ASSIGNED"
    CAPACITY_EXCEEDED = "CAPACITY_EXCEEDED"
    AGENT_UNAVAILABLE = "AGENT_UNAVAILABLE"

    # Pricing / Zones
    INVALID_PINCODE = "INVALID_PINCODE"
    ZONE_NOT_FOUND = "ZONE_NOT_FOUND"
    RATE_CARD_NOT_FOUND = "RATE_CARD_NOT_FOUND"
    INACTIVE_AREA = "INACTIVE_AREA"

    # General
    INTERNAL_ERROR = "INTERNAL_ERROR"
    VALIDATION_ERROR = "VALIDATION_ERROR"
    NOT_FOUND = "NOT_FOUND"


class AppError(Exception):
    """Structured application error.

    Attributes:
        code: Machine-readable error code from ErrorCodes.
        message: Human-readable error description.
        status_code: HTTP status code to return.
    """

    def __init__(self, code: str, message: str, status_code: int = 400):
        self.code = code
        self.message = message
        self.status_code = status_code
        super().__init__(message)


async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
    """FastAPI exception handler for AppError."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        },
    )
