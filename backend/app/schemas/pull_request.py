from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class PullRequestBase(BaseModel):
    pr_number: int
    title: str
    description: Optional[str] = None
    author: str
    head_branch: str
    base_branch: str = "main"
    status: str = "open"
    head_commit_sha: Optional[str] = None
    html_url: Optional[str] = None


class PullRequestCreate(PullRequestBase):
    repository_id: int


class PullRequestResponse(PullRequestBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    repository_id: int
    created_at: datetime
    updated_at: datetime
    latest_review_score: Optional[float] = None
    latest_review_status: Optional[str] = None
    findings_count: Optional[int] = 0
