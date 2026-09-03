from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class FindingBase(BaseModel):
    severity: str = Field(pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$")
    category: str = Field(pattern="^(SECURITY|PERFORMANCE|QUALITY|BUG|STYLE)$")
    file_path: str
    line_number: Optional[int] = None
    title: str
    description: str
    impact: Optional[str] = None
    suggestion: str
    diff_snippet: Optional[str] = None
    github_comment_id: Optional[str] = None


class FindingCreate(FindingBase):
    pass


class FindingResponse(FindingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    review_id: int
    created_at: datetime


class ReviewBase(BaseModel):
    status: str = "COMPLETED"
    score: Optional[float] = None
    summary: Optional[str] = None
    review_type: str = "MANUAL"
    title: Optional[str] = None
    language: Optional[str] = None
    duration_ms: Optional[float] = None
    commit_sha: Optional[str] = None
    model_used: Optional[str] = "gpt-4o-mini"
    error_message: Optional[str] = None


class ReviewCreate(ReviewBase):
    user_id: Optional[int] = None
    repository_id: Optional[int] = None
    pull_request_id: Optional[int] = None
    findings: Optional[List[FindingCreate]] = None


class ReviewResponse(ReviewBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: Optional[int] = None
    repository_id: Optional[int] = None
    pull_request_id: Optional[int] = None
    created_at: datetime
    findings_count: Optional[int] = 0
    repository_name: Optional[str] = None
    pr_number: Optional[int] = None


class ReviewWithFindingsResponse(ReviewResponse):
    findings: List[FindingResponse] = []
