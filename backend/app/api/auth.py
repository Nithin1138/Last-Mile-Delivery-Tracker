"""Authentication routes — register and login."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import AppError, ErrorCodes
from app.core.deps import get_current_user
from app.models.models import User, RoleEnum
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Public registration endpoint.
    Strictly creates CUSTOMER accounts only.
    Agents are created by Admins via /api/admin/agents.
    Admins are bootstrapped via seed script.
    """
    # Check for existing email
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise AppError(
            code=ErrorCodes.EMAIL_ALREADY_EXISTS,
            message="An account with this email already exists.",
            status_code=409,
        )

    # Public registration is strictly RoleEnum.CUSTOMER
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        name=req.name,
        phone=req.phone,
        role=RoleEnum.CUSTOMER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Generate JWT token
    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse.from_user(user),
    )


@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate a user and return a JWT token."""
    user = db.query(User).filter(User.email == req.email).first()

    if not user or not verify_password(req.password, user.password_hash):
        raise AppError(
            code=ErrorCodes.INVALID_CREDENTIALS,
            message="Invalid email or password.",
            status_code=401,
        )

    if not user.is_active:
        raise AppError(
            code=ErrorCodes.UNAUTHORIZED,
            message="Account is deactivated.",
            status_code=401,
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role.value})

    return TokenResponse(
        access_token=token,
        user=UserResponse.from_user(user),
    )


@router.get("/me", response_model=UserResponse)
def get_me(
    current_user: User = Depends(get_current_user),
):
    """Get the current authenticated user's profile."""
    return UserResponse.from_user(current_user)
