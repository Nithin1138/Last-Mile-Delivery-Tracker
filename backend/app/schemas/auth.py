"""Pydantic schemas for authentication."""

from typing import Optional
from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=20)


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    role: str
    is_active: bool

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user):
        return cls(
            id=str(user.id),
            email=user.email,
            name=user.name,
            phone=user.phone,
            role=user.role.value if hasattr(user.role, 'value') else user.role,
            is_active=user.is_active,
        )
