from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from app.models.repository import Repository, ReviewConfiguration
from app.models.review import Review
from app.schemas.repository import RepositoryCreate, RepositoryUpdate, ReviewConfigUpdate


class RepositoryRepository:
    """CRUD database operations for repositories and review configurations."""

    @staticmethod
    async def get_by_id(db: AsyncSession, repo_id: int) -> Optional[Repository]:
        stmt = (
            select(Repository)
            .where(Repository.id == repo_id)
            .options(selectinload(Repository.config), selectinload(Repository.pull_requests))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_by_full_name(db: AsyncSession, full_name: str) -> Optional[Repository]:
        stmt = (
            select(Repository)
            .where(Repository.full_name == full_name)
            .options(selectinload(Repository.config))
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def list_all(db: AsyncSession, skip: int = 0, limit: int = 50) -> List[Repository]:
        stmt = (
            select(Repository)
            .options(selectinload(Repository.config))
            .order_by(Repository.updated_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def create(db: AsyncSession, data: RepositoryCreate, user_id: Optional[int] = None) -> Repository:
        repo = Repository(
            user_id=user_id,
            github_id=data.github_id,
            name=data.name,
            full_name=data.full_name,
            owner=data.owner,
            language=data.language,
            default_branch=data.default_branch,
            is_active=data.is_active,
        )
        db.add(repo)
        await db.flush()

        # Initialize review configuration
        config_data = data.config
        config = ReviewConfiguration(
            repository_id=repo.id,
            auto_review=config_data.auto_review if config_data else True,
            min_severity=config_data.min_severity if config_data else "MEDIUM",
            check_security=config_data.check_security if config_data else True,
            check_performance=config_data.check_performance if config_data else True,
            check_quality=config_data.check_quality if config_data else True,
            check_style=config_data.check_style if config_data else False,
            max_files_per_review=config_data.max_files_per_review if config_data else 20,
            model_name=config_data.model_name if config_data else "gpt-4o-mini",
            custom_instructions=config_data.custom_instructions if config_data else None,
        )
        db.add(config)
        await db.commit()
        return await RepositoryRepository.get_by_id(db, repo.id)

    @staticmethod
    async def update(db: AsyncSession, repo_id: int, data: RepositoryUpdate) -> Optional[Repository]:
        repo = await RepositoryRepository.get_by_id(db, repo_id)
        if not repo:
            return None

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(repo, key, value)

        await db.commit()
        await db.refresh(repo)
        return repo

    @staticmethod
    async def update_config(db: AsyncSession, repo_id: int, data: ReviewConfigUpdate) -> Optional[ReviewConfiguration]:
        stmt = select(ReviewConfiguration).where(ReviewConfiguration.repository_id == repo_id)
        result = await db.execute(stmt)
        config = result.scalar_one_or_none()

        if not config:
            config = ReviewConfiguration(repository_id=repo_id)
            db.add(config)

        update_dict = data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(config, key, value)

        await db.commit()
        await db.refresh(config)
        return config

    @staticmethod
    async def delete(db: AsyncSession, repo_id: int) -> bool:
        repo = await RepositoryRepository.get_by_id(db, repo_id)
        if not repo:
            return False
        await db.delete(repo)
        await db.commit()
        return True
