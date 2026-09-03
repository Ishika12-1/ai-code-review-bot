from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.pull_request import PullRequest
from app.models.review import Review
from app.schemas.pull_request import PullRequestCreate


class PullRequestRepository:
    """CRUD database operations for Pull Requests."""

    @staticmethod
    async def get_by_id(db: AsyncSession, pr_id: int) -> Optional[PullRequest]:
        stmt = (
            select(PullRequest)
            .where(PullRequest.id == pr_id)
            .options(
                selectinload(PullRequest.reviews).selectinload(Review.findings),
                selectinload(PullRequest.repository)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_repo_and_number(db: AsyncSession, repo_id: int, pr_number: int) -> Optional[PullRequest]:
        stmt = (
            select(PullRequest)
            .where(PullRequest.repository_id == repo_id, PullRequest.pr_number == pr_number)
            .options(selectinload(PullRequest.reviews).selectinload(Review.findings))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_by_repo(db: AsyncSession, repo_id: int, skip: int = 0, limit: int = 50) -> List[PullRequest]:
        stmt = (
            select(PullRequest)
            .where(PullRequest.repository_id == repo_id)
            .options(selectinload(PullRequest.reviews).selectinload(Review.findings))
            .order_by(PullRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_all(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[PullRequest]:
        stmt = (
            select(PullRequest)
            .options(
                selectinload(PullRequest.reviews).selectinload(Review.findings),
                selectinload(PullRequest.repository)
            )
            .order_by(PullRequest.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create_or_update(db: AsyncSession, data: PullRequestCreate) -> PullRequest:
        pr = await PullRequestRepository.get_by_repo_and_number(db, data.repository_id, data.pr_number)
        if pr:
            pr.title = data.title
            pr.description = data.description
            pr.author = data.author
            pr.head_branch = data.head_branch
            pr.base_branch = data.base_branch
            pr.status = data.status
            pr.head_commit_sha = data.head_commit_sha
            pr.html_url = data.html_url
        else:
            pr = PullRequest(
                repository_id=data.repository_id,
                pr_number=data.pr_number,
                title=data.title,
                description=data.description,
                author=data.author,
                head_branch=data.head_branch,
                base_branch=data.base_branch,
                status=data.status,
                head_commit_sha=data.head_commit_sha,
                html_url=data.html_url,
            )
            db.add(pr)

        await db.commit()
        await db.refresh(pr)
        return pr
