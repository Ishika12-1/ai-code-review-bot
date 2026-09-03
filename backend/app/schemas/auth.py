from typing import Optional
from pydantic import BaseModel, Field
from app.schemas.user import UserResponse


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Optional[UserResponse] = None


class LoginRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="Full or display name")
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password")
    confirm_password: Optional[str] = None


class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None


class OAuthUrlResponse(BaseModel):
    url: str
    provider: str
