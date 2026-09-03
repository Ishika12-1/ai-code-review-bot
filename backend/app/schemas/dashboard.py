from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.schemas.review import ReviewResponse


class SeverityBreakdown(BaseModel):
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    info: int = 0


class CategoryBreakdown(BaseModel):
    security: int = 0
    performance: int = 0
    quality: int = 0
    bug: int = 0
    style: int = 0


class ActivityPoint(BaseModel):
    date: str
    reviews: int = 0
    issues: int = 0


class DashboardStatsResponse(BaseModel):
    total_reviews: int = 0
    average_score: float = 0.0
    security_issues_found: int = 0
    connected_repositories: int = 0
    recent_reviews: List[ReviewResponse] = []
    severity_breakdown: SeverityBreakdown = SeverityBreakdown()
    category_breakdown: CategoryBreakdown = CategoryBreakdown()
    activity_timeline: List[ActivityPoint] = []
