from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ReviewConfigBase(BaseModel):
    auto_review: bool = True
    min_severity: str = Field(default="MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$")
    check_security: bool = True
    check_performance: bool = True
    check_quality: bool = True
    check_style: bool = False
    max_files_per_review: int = Field(default=20, ge=1, le=100)
    model_name: str = "gpt-4o-mini"
    custom_instructions: Optional[str] = None


class ReviewConfigUpdate(BaseModel):
    auto_review: Optional[bool] = None
    min_severity: Optional[str] = Field(default=None, pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$")
    check_security: Optional[bool] = None
    check_performance: Optional[bool] = None
    check_quality: Optional[bool] = None
    check_style: Optional[bool] = None
    max_files_per_review: Optional[int] = Field(default=None, ge=1, le=100)
    model_name: Optional[str] = None
    custom_instructions: Optional[str] = None


class ReviewConfigResponse(ReviewConfigBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int


class RepositoryBase(BaseModel):
    name: str
    full_name: str
    owner: str
    language: Optional[str] = None
    default_branch: str = "main"
    is_active: bool = True


class RepositoryCreate(RepositoryBase):
    github_id: Optional[str] = None
    config: Optional[ReviewConfigBase] = None


class RepositoryUpdate(BaseModel):
    is_active: Optional[bool] = None
    default_branch: Optional[str] = None
    language: Optional[str] = None


class RepositoryResponse(RepositoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    github_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    config: Optional[ReviewConfigResponse] = None
    total_reviews_count: Optional[int] = 0
