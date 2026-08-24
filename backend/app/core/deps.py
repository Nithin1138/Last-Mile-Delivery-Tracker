"""FastAPI dependencies for authentication and role-based access control."""

from typing import List
from uuid import UUID

from fastapi import Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import decode_access_token
from app.core.errors import AppError, ErrorCodes
from app.models.models import User, RoleEnum

security_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: Session = Depends(get_db),
) -> User:
    """Extract and validate the current user from the JWT token."""
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise AppError(
            code=ErrorCodes.UNAUTHORIZED,
            message="Invalid or expired authentication token.",
            status_code=401,
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise AppError(
            code=ErrorCodes.UNAUTHORIZED,
            message="Invalid token payload.",
            status_code=401,
        )

    try:
        user_uuid = UUID(str(user_id))
    except (ValueError, TypeError, AttributeError):
        raise AppError(
            code=ErrorCodes.UNAUTHORIZED,
            message="Malformed token subject identifier.",
            status_code=401,
        )

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None or not user.is_active:
        raise AppError(
            code=ErrorCodes.UNAUTHORIZED,
            message="User not found or inactive.",
            status_code=401,
        )

    return user


def require_role(*roles: RoleEnum):
    """Create a dependency that requires one of the specified roles."""

    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise AppError(
                code=ErrorCodes.FORBIDDEN,
                message=f"Access denied. Required role(s): {', '.join(r.value for r in roles)}",
                status_code=403,
            )
        return current_user

    return role_checker


# Convenience dependencies
require_admin = require_role(RoleEnum.ADMIN)
require_agent = require_role(RoleEnum.AGENT)
require_customer = require_role(RoleEnum.CUSTOMER)
require_admin_or_customer = require_role(RoleEnum.ADMIN, RoleEnum.CUSTOMER)
require_any_authenticated = require_role(RoleEnum.ADMIN, RoleEnum.AGENT, RoleEnum.CUSTOMER)
