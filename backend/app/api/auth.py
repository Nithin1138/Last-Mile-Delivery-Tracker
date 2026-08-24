"""Authentication routes — register and login."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.core.errors import AppError, ErrorCodes
from app.core.deps import get_current_user
from sqlalchemy import func
from app.models.models import User, RoleEnum, DeliveryAgent, AgentStatusEnum, Zone
from app.schemas.auth import RegisterRequest, LoginRequest, TokenResponse, UserResponse, UpdateProfileRequest

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

