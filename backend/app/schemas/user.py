from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class UserBase(BaseModel):
    username: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class UserCreate(UserBase):
    hashed_password: Optional[str] = None
    github_id: Optional[str] = None
    google_id: Optional[str] = None
    access_token: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    github_id: Optional[str] = None
    google_id: Optional[str] = None
    is_github_connected: bool = False
    is_google_connected: bool = False
    created_at: datetime
    updated_at: datetime
