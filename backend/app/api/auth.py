"""Authentication routes — register and login."""

import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import AppError, ErrorCodes
from app.core.deps import get_current_user
from app.models.models import User, RoleEnum, DeliveryAgent, AgentStatusEnum, Zone, PasswordResetOTP
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserResponse,
    UpdateProfileRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    MessageResponse,
)
from app.services.notification_service import get_notification_provider, build_password_reset_email

router = APIRouter(prefix="/api/auth", tags=["auth"])




@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """
    Public registration endpoint.
    Supports CUSTOMER and AGENT registration.
    Privilege escalation to ADMIN is strictly prevented (defaults to CUSTOMER).
    """
    norm_email = req.email.strip().lower()
    # Check for existing email case-insensitively
    existing = db.query(User).filter(func.lower(User.email) == norm_email).first()
    if existing:
        raise AppError(
            code=ErrorCodes.EMAIL_ALREADY_EXISTS,
            message="An account with this email already exists.",
            status_code=409,
        )

    # Determine role: Allow AGENT, default everything else (including attempted ADMIN) to CUSTOMER
    requested_role = (req.role or "").strip().upper()
    if requested_role == "AGENT":
        user_role = RoleEnum.AGENT
    else:
        user_role = RoleEnum.CUSTOMER

    user = User(
        email=norm_email,
        password_hash=hash_password(req.password),
        name=req.name.strip(),
        phone=req.phone.strip() if req.phone else None,
        role=user_role,
    )
    db.add(user)
    db.flush()

    # If registered as an AGENT, automatically create the DeliveryAgent fleet profile
    if user_role == RoleEnum.AGENT:
        first_zone = db.query(Zone).filter(Zone.is_active == True).first()
        agent = DeliveryAgent(
            user_id=user.id,
            latitude=28.6139,
            longitude=77.2090,
            current_zone_id=first_zone.id if first_zone else None,
            max_capacity=5,
            current_load=0,
            availability_status=AgentStatusEnum.AVAILABLE,
        )
        db.add(agent)

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
    norm_email = req.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == norm_email).first()

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


@router.put("/me", response_model=UserResponse)
def update_me(
    req: UpdateProfileRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update current user's profile (name or phone number)."""
    if req.name is not None:
        current_user.name = req.name.strip()
    if req.phone is not None:
        current_user.phone = req.phone.strip() if req.phone.strip() else None

    db.commit()
    db.refresh(current_user)
    return UserResponse.from_user(current_user)


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """
    Initiate password reset by generating and emailing a 6-digit verification passcode.
    """
    norm_email = req.email.strip().lower()
    user = db.query(User).filter(func.lower(User.email) == norm_email).first()

    # Always generate 6-digit numeric OTP
    otp_code = f"{secrets.randbelow(900000) + 100000}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    if user and user.is_active:
        # Invalidate any prior active OTPs for this account
        db.query(PasswordResetOTP).filter(
            func.lower(PasswordResetOTP.email) == norm_email,
            PasswordResetOTP.is_used == False,
        ).update({"is_used": True})

        otp_record = PasswordResetOTP(
            email=norm_email,
            otp_code=otp_code,
            expires_at=expires_at,
            is_used=False,
        )
        db.add(otp_record)
        db.commit()

        # Send 6-digit passcode via email notification provider (clean HTML template)
        provider = get_notification_provider()
        subject = "LastMile Flow — 6-Digit Password Reset Passcode"
        body = build_password_reset_email(user_name=user.name, otp_code=otp_code)
        provider.send_email(to_email=user.email, subject=subject, body=body)

    return MessageResponse(
        message="If an account exists with that email, a 6-digit verification passcode has been sent."
    )


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Verify the 6-digit OTP passcode and update the user's password.
    """
    norm_email = req.email.strip().lower()
    clean_otp = req.otp_code.strip()

    otp_record = (
        db.query(PasswordResetOTP)
        .filter(
            func.lower(PasswordResetOTP.email) == norm_email,
            PasswordResetOTP.otp_code == clean_otp,
            PasswordResetOTP.is_used == False,
        )
        .order_by(PasswordResetOTP.created_at.desc())
        .first()
    )

    now = datetime.now(timezone.utc)
    if not otp_record or otp_record.expires_at < now:
        raise AppError(
            code=ErrorCodes.INVALID_CREDENTIALS,
            message="Invalid or expired 6-digit passcode.",
            status_code=400,
        )

    user = db.query(User).filter(func.lower(User.email) == norm_email).first()
    if not user or not user.is_active:
        raise AppError(
            code=ErrorCodes.NOT_FOUND,
            message="User account not found or deactivated.",
            status_code=404,
        )

    # Hash and update new password
    user.password_hash = hash_password(req.new_password)
    otp_record.is_used = True
    db.commit()

    return MessageResponse(
        message="Password has been reset successfully. You can now sign in with your new password."
    )


