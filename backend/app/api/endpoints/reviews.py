from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_optional_current_user
from app.models.user import User
from app.repositories.review_repo import ReviewRepository
from app.repositories.pr_repo import PullRequestRepository
from app.schemas.review import (
    ReviewCreate,
    ReviewResponse,
    ReviewWithFindingsResponse,
    FindingResponse,
)

router = APIRouter(tags=["Reviews & Findings"])


@router.get("/reviews", response_model=List[ReviewResponse])
async def list_reviews(
    limit: int = Query(default=20, ge=1, le=100),
    user_id: Optional[int] = Query(default=None),
    repository_id: Optional[int] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List code reviews with optional user or repository filters."""
    effective_user_id = user_id or (current_user.id if current_user else None)
    reviews = await ReviewRepository.list_recent(
        db, limit=limit, user_id=effective_user_id, repository_id=repository_id
    )
    response_list = []
    for rev in reviews:
        resp = ReviewResponse.model_validate(rev)
        resp.findings_count = len(rev.findings) if rev.findings else 0
        if rev.repository:
            resp.repository_name = rev.repository.name
        if rev.pull_request:
            resp.pr_number = rev.pull_request.pr_number
        response_list.append(resp)
    return response_list


@router.get("/reviews/recent", response_model=List[ReviewResponse])
async def list_recent_reviews(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List recent code reviews across all repositories."""
    reviews = await ReviewRepository.list_recent(db, limit=limit)
    response_list = []
    for rev in reviews:
        resp = ReviewResponse.model_validate(rev)
        resp.findings_count = len(rev.findings) if rev.findings else 0
        if rev.repository:
            resp.repository_name = rev.repository.name
        if rev.pull_request:
            resp.pr_number = rev.pull_request.pr_number
        response_list.append(resp)
    return response_list


@router.post("/reviews", response_model=ReviewWithFindingsResponse, status_code=status.HTTP_201_CREATED)
async def create_review_session(
    data: ReviewCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Store or save an AI code review session (from Code Studio or manual inspection)."""
    if current_user and not data.user_id:
        data.user_id = current_user.id
    review = await ReviewRepository.create(db, data)
    return review


@router.post("/pull-requests/{pr_id}/review", response_model=ReviewWithFindingsResponse, status_code=status.HTTP_201_CREATED)
async def create_review_for_pull_request(
    pr_id: int,
    data: ReviewCreate,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Manually record or store a review session for a Pull Request."""
    pr = await PullRequestRepository.get_by_id(db, pr_id)
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pull Request with ID {pr_id} not found."
        )
    data.pull_request_id = pr_id
    if current_user and not data.user_id:
        data.user_id = current_user.id
    review = await ReviewRepository.create(db, data)
    return review


@router.get("/reviews/{review_id}", response_model=ReviewWithFindingsResponse)
async def get_review_details(review_id: int, db: AsyncSession = Depends(get_db)):
    """Get complete review details with all associated findings and diffs."""
    review = await ReviewRepository.get_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with ID {review_id} not found."
        )
    resp = ReviewWithFindingsResponse.model_validate(review)
    if review.repository:
        resp.repository_name = review.repository.name
    if review.pull_request:
        resp.pr_number = review.pull_request.pr_number
    return resp


@router.get("/reviews/{review_id}/findings", response_model=List[FindingResponse])
async def get_review_findings(
    review_id: int,
    severity: Optional[str] = Query(default=None, description="Filter by severity: CRITICAL, HIGH, MEDIUM, LOW, INFO"),
    category: Optional[str] = Query(default=None, description="Filter by category: SECURITY, PERFORMANCE, QUALITY, BUG, STYLE"),
    db: AsyncSession = Depends(get_db),
):
    """Get structured findings for a review with optional severity or category filters."""
    review = await ReviewRepository.get_by_id(db, review_id)
    if not review:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Review with ID {review_id} not found."
        )
    findings = await ReviewRepository.get_findings_by_review(
        db, review_id, severity=severity, category=category
    )
    return findings
