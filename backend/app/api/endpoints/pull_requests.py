from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.pr_repo import PullRequestRepository
from app.repositories.review_repo import ReviewRepository
from app.schemas.pull_request import PullRequestCreate, PullRequestResponse
from app.schemas.review import ReviewResponse

router = APIRouter(tags=["Pull Requests"])


@router.get("/pull-requests", response_model=List[PullRequestResponse])
async def list_all_pull_requests(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List all Pull Requests across all connected repositories."""
    prs = await PullRequestRepository.list_all(db, skip=skip, limit=limit)
    response_list = []
    for pr in prs:
        resp = PullRequestResponse.model_validate(pr)
        if pr.reviews:
            latest = pr.reviews[0]
            resp.latest_review_score = latest.score
            resp.latest_review_status = latest.status
            resp.findings_count = len(latest.findings) if latest.findings else 0
        response_list.append(resp)
    return response_list


@router.get("/repositories/{repo_id}/pull-requests", response_model=List[PullRequestResponse])
async def list_repo_pull_requests(repo_id: int, skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List all Pull Requests for a specific repository."""
    prs = await PullRequestRepository.list_by_repo(db, repo_id, skip=skip, limit=limit)
    response_list = []
    for pr in prs:
        resp = PullRequestResponse.model_validate(pr)
        if pr.reviews:
            latest = pr.reviews[0]
            resp.latest_review_score = latest.score
            resp.latest_review_status = latest.status
            resp.findings_count = len(latest.findings) if latest.findings else 0
        response_list.append(resp)
    return response_list


@router.post("/repositories/{repo_id}/pull-requests", response_model=PullRequestResponse, status_code=status.HTTP_201_CREATED)
async def create_or_register_pull_request(repo_id: int, data: PullRequestCreate, db: AsyncSession = Depends(get_db)):
    """Create or register a Pull Request for a repository."""
    data.repository_id = repo_id
    pr = await PullRequestRepository.create_or_update(db, data)
    return PullRequestResponse.model_validate(pr)


@router.get("/pull-requests/{pr_id}", response_model=PullRequestResponse)
async def get_pull_request(pr_id: int, db: AsyncSession = Depends(get_db)):
    """Get single Pull Request details."""
    pr = await PullRequestRepository.get_by_id(db, pr_id)
    if not pr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pull Request with ID {pr_id} not found."
        )
    resp = PullRequestResponse.model_validate(pr)
    if pr.reviews:
        latest = pr.reviews[0]
        resp.latest_review_score = latest.score
        resp.latest_review_status = latest.status
        resp.findings_count = len(latest.findings) if latest.findings else 0
    return resp


@router.get("/pull-requests/{pr_id}/reviews", response_model=List[ReviewResponse])
async def get_pull_request_reviews(pr_id: int, db: AsyncSession = Depends(get_db)):
    """Get all review analyses for a Pull Request."""
    reviews = await ReviewRepository.list_by_pr(db, pr_id)
    response_list = []
    for rev in reviews:
        resp = ReviewResponse.model_validate(rev)
        resp.findings_count = len(rev.findings) if rev.findings else 0
        response_list.append(resp)
    return response_list
