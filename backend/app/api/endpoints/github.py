from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_optional_current_user
from app.models.user import User
from app.services.github_service import github_service
from app.services.ai_review_service import ai_service
from app.repositories.repository_repo import RepositoryRepository
from app.repositories.pr_repo import PullRequestRepository
from app.repositories.review_repo import ReviewRepository
from app.schemas.pull_request import PullRequestCreate
from app.schemas.review import ReviewCreate, FindingCreate, ReviewWithFindingsResponse

router = APIRouter(prefix="/github", tags=["GitHub Integration"])


@router.get("/status")
async def get_github_connection_status(current_user: Optional[User] = Depends(get_optional_current_user)):
    """Check if GitHub is connected for the current user or system."""
    has_user_token = bool(current_user and (current_user.access_token or current_user.github_id))
    return {
        "is_connected": has_user_token,
        "username": current_user.username if has_user_token else None,
        "avatar_url": current_user.avatar_url if has_user_token else None,
        "github_id": current_user.github_id if current_user else None
    }


@router.get("/user-repos")
async def list_user_repositories(
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List accessible GitHub repositories for the authenticated user."""
    access_token = current_user.access_token if current_user else None
    repos = await github_service.list_user_repositories(access_token)
    return repos


@router.get("/repos/{owner}/{repo}/branches")
async def list_repository_branches(
    owner: str,
    repo: str,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """List branches for a selected GitHub repository."""
    access_token = current_user.access_token if current_user else None
    return await github_service.list_repo_branches(owner, repo, access_token)


@router.get("/repos/{owner}/{repo}/contents")
async def list_repository_contents(
    owner: str,
    repo: str,
    path: str = Query(default=""),
    ref: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """List files and folders at a specified directory path in a repository."""
    access_token = current_user.access_token if current_user else None
    return await github_service.list_repo_contents(owner, repo, path, ref, access_token)


@router.get("/repos/{owner}/{repo}/file")
async def get_repository_file(
    owner: str,
    repo: str,
    path: str = Query(...),
    ref: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Fetch raw file content from a repository for review in AI Code Studio."""
    access_token = current_user.access_token if current_user else None
    return await github_service.get_raw_file_content(owner, repo, path, ref, access_token)


@router.get("/repos/{owner}/{repo}/pulls")
async def list_repository_pull_requests(
    owner: str,
    repo: str,
    state: str = Query(default="open"),
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """List pull requests directly from GitHub for a repository."""
    access_token = current_user.access_token if current_user else None
    return await github_service.list_repo_pull_requests(owner, repo, state, access_token)


@router.get("/repos/{owner}/{repo}/pulls/{pull_number}/diff")
async def get_pull_request_diff(
    owner: str,
    repo: str,
    pull_number: int,
    current_user: Optional[User] = Depends(get_optional_current_user)
):
    """Fetch unified git diff patch for a specific pull request."""
    access_token = current_user.access_token if current_user else None
    diff = await github_service.get_pull_request_diff(owner, repo, pull_number, access_token)
    return {"owner": owner, "repo": repo, "pull_number": pull_number, "diff": diff}


@router.post("/repos/{owner}/{repo}/pulls/{pull_number}/review", response_model=ReviewWithFindingsResponse)
async def review_pull_request_on_demand(
    owner: str,
    repo: str,
    pull_number: int,
    current_user: Optional[User] = Depends(get_optional_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Perform on-demand AI review of a GitHub Pull Request and persist results."""
    access_token = current_user.access_token if current_user else None
    full_name = f"{owner}/{repo}"

    # 1. Fetch PR Diff
    diff = await github_service.get_pull_request_diff(owner, repo, pull_number, access_token)
    if not diff:
        diff = f"PR #{pull_number} from {full_name}: Diff analysis"

    # 2. Run AI Review Engine
    ai_result = await ai_service.review_pr_diff(
        repo_name=full_name,
        pr_title=f"PR #{pull_number}",
        pr_number=pull_number,
        diff_content=diff,
    )

    # 3. Look up or register repository
    db_repo = await RepositoryRepository.get_by_full_name(db, full_name)
    repo_id = db_repo.id if db_repo else None

    # 4. Save review session to database
    findings_create = [
        FindingCreate(
            severity=f.severity,
            category=f.category,
            file_path=f.file,
            line_number=f.line,
            title=f.title,
            description=f.description,
            impact=f.impact,
            suggestion=f.suggestion,
            diff_snippet=f.diff_snippet
        ) for f in ai_result.findings
    ]

    review_create = ReviewCreate(
        user_id=current_user.id if current_user else None,
        repository_id=repo_id,
        title=f"{full_name} • PR #{pull_number}",
        status="COMPLETED",
        score=ai_result.score,
        summary=ai_result.summary,
        review_type="PR",
        duration_ms=ai_result.duration_ms,
        model_used=ai_result.model_used,
        findings=findings_create
    )
    saved_review = await ReviewRepository.create(db, review_create)
    return saved_review
