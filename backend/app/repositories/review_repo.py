from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.models.review import Review, Finding
from app.models.repository import Repository
from app.models.pull_request import PullRequest
from app.schemas.review import ReviewCreate, FindingCreate


class ReviewRepository:
    """CRUD database operations for Reviews and Findings."""

    @staticmethod
    async def get_by_id(db: AsyncSession, review_id: int) -> Optional[Review]:
        stmt = (
            select(Review)
            .where(Review.id == review_id)
            .options(
                selectinload(Review.findings),
                selectinload(Review.pull_request),
                selectinload(Review.repository),
                selectinload(Review.user)
            )
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_by_pr(db: AsyncSession, pr_id: int) -> List[Review]:
        stmt = (
            select(Review)
            .where(Review.pull_request_id == pr_id)
            .options(selectinload(Review.findings))
            .order_by(Review.created_at.desc())
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_by_user(db: AsyncSession, user_id: int, limit: int = 20) -> List[Review]:
        stmt = (
            select(Review)
            .where(Review.user_id == user_id)
            .options(
                selectinload(Review.findings),
                selectinload(Review.pull_request),
                selectinload(Review.repository)
            )
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def list_recent(
        db: AsyncSession,
        limit: int = 20,
        user_id: Optional[int] = None,
        repository_id: Optional[int] = None
    ) -> List[Review]:
        stmt = (
            select(Review)
            .options(
                selectinload(Review.findings),
                selectinload(Review.pull_request),
                selectinload(Review.repository)
            )
        )
        if user_id:
            stmt = stmt.where(Review.user_id == user_id)
        if repository_id:
            stmt = stmt.where(Review.repository_id == repository_id)

        stmt = stmt.order_by(Review.created_at.desc()).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create(db: AsyncSession, data: ReviewCreate) -> Review:
        review = Review(
            user_id=data.user_id,
            repository_id=data.repository_id,
            pull_request_id=data.pull_request_id,
            title=data.title,
            language=data.language,
            status=data.status or "COMPLETED",
            score=data.score,
            summary=data.summary,
            review_type=data.review_type or "MANUAL",
            duration_ms=data.duration_ms,
            commit_sha=data.commit_sha,
            model_used=data.model_used,
            error_message=data.error_message,
        )
        db.add(review)
        await db.flush()

        if data.findings:
            for item in data.findings:
                finding = Finding(
                    review_id=review.id,
                    severity=item.severity,
                    category=item.category,
                    file_path=item.file_path,
                    line_number=item.line_number,
                    title=item.title,
                    description=item.description,
                    impact=item.impact,
                    suggestion=item.suggestion,
                    diff_snippet=item.diff_snippet,
                    github_comment_id=item.github_comment_id,
                )
                db.add(finding)

        await db.commit()
        await db.refresh(review)
        return await ReviewRepository.get_by_id(db, review.id)

    @staticmethod
    async def get_findings_by_review(
        db: AsyncSession,
        review_id: int,
        severity: Optional[str] = None,
        category: Optional[str] = None
    ) -> List[Finding]:
        stmt = select(Finding).where(Finding.review_id == review_id)
        if severity:
            stmt = stmt.where(Finding.severity == severity.upper())
        if category:
            stmt = stmt.where(Finding.category == category.upper())

        stmt = stmt.order_by(Finding.created_at.asc())
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_stats(db: AsyncSession, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Compute aggregated dashboard telemetry from DB."""
        # Total Reviews
        review_filter = [Review.user_id == user_id] if user_id else []
        stmt_reviews = select(func.count(Review.id), func.avg(Review.score)).where(*review_filter)
        res_reviews = await db.execute(stmt_reviews)
        total_reviews, avg_score = res_reviews.one()

        # Connected Repositories
        repo_filter = [Repository.user_id == user_id] if user_id else []
        stmt_repos = select(func.count(Repository.id)).where(*repo_filter)
        res_repos = await db.execute(stmt_repos)
        connected_repos = res_repos.scalar() or 0

        # Security issues found
        stmt_sec = select(func.count(Finding.id)).join(Review, Finding.review_id == Review.id)
        if user_id:
            stmt_sec = stmt_sec.where(Review.user_id == user_id)
        stmt_sec = stmt_sec.where(Finding.category == "SECURITY")
        res_sec = await db.execute(stmt_sec)
        security_issues = res_sec.scalar() or 0

        # Severity breakdown
        stmt_sev = select(Finding.severity, func.count(Finding.id)).join(Review, Finding.review_id == Review.id)
        if user_id:
            stmt_sev = stmt_sev.where(Review.user_id == user_id)
        stmt_sev = stmt_sev.group_by(Finding.severity)
        res_sev = await db.execute(stmt_sev)
        sev_dict = {row[0]: row[1] for row in res_sev.all()}

        # Category breakdown
        stmt_cat = select(Finding.category, func.count(Finding.id)).join(Review, Finding.review_id == Review.id)
        if user_id:
            stmt_cat = stmt_cat.where(Review.user_id == user_id)
        stmt_cat = stmt_cat.group_by(Finding.category)
        res_cat = await db.execute(stmt_cat)
        cat_dict = {row[0]: row[1] for row in res_cat.all()}

        return {
            "total_reviews": total_reviews or 0,
            "average_score": round(float(avg_score), 1) if avg_score else 8.5,
            "security_issues_found": security_issues,
            "connected_repositories": connected_repos,
            "severity_breakdown": {
                "critical": sev_dict.get("CRITICAL", 0),
                "high": sev_dict.get("HIGH", 0),
                "medium": sev_dict.get("MEDIUM", 0),
                "low": sev_dict.get("LOW", 0),
                "info": sev_dict.get("INFO", 0),
            },
            "category_breakdown": {
                "security": cat_dict.get("SECURITY", 0),
                "performance": cat_dict.get("PERFORMANCE", 0),
                "quality": cat_dict.get("QUALITY", 0),
                "bug": cat_dict.get("BUG", 0),
                "style": cat_dict.get("STYLE", 0),
            }
        }
