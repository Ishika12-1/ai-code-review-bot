from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.repositories.repository_repo import RepositoryRepository
from app.schemas.repository import (
    RepositoryCreate,
    RepositoryUpdate,
    RepositoryResponse,
    ReviewConfigUpdate,
    ReviewConfigResponse,
)

router = APIRouter(prefix="/repositories", tags=["Repositories"])


@router.get("", response_model=List[RepositoryResponse])
async def list_repositories(skip: int = 0, limit: int = 50, db: AsyncSession = Depends(get_db)):
    """List all connected GitHub repositories."""
    repos = await RepositoryRepository.list_all(db, skip=skip, limit=limit)
    return repos


@router.post("", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED)
async def create_repository(data: RepositoryCreate, db: AsyncSession = Depends(get_db)):
    """Register and connect a new GitHub repository."""
    existing = await RepositoryRepository.get_by_full_name(db, data.full_name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Repository '{data.full_name}' is already connected."
        )
    return await RepositoryRepository.create(db, data)


@router.get("/{repo_id}", response_model=RepositoryResponse)
async def get_repository(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed information for a specific repository."""
    repo = await RepositoryRepository.get_by_id(db, repo_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repo_id} not found."
        )
    return repo


@router.put("/{repo_id}", response_model=RepositoryResponse)
async def update_repository(repo_id: int, data: RepositoryUpdate, db: AsyncSession = Depends(get_db)):
    """Update repository configuration or active status."""
    repo = await RepositoryRepository.update(db, repo_id, data)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repo_id} not found."
        )
    return repo


@router.put("/{repo_id}/config", response_model=ReviewConfigResponse)
async def update_review_config(repo_id: int, data: ReviewConfigUpdate, db: AsyncSession = Depends(get_db)):
    """Update AI code review rules and thresholds for a repository."""
    repo = await RepositoryRepository.get_by_id(db, repo_id)
    if not repo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repo_id} not found."
        )
    config = await RepositoryRepository.update_config(db, repo_id, data)
    return config


@router.delete("/{repo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_repository(repo_id: int, db: AsyncSession = Depends(get_db)):
    """Disconnect and delete a repository."""
    success = await RepositoryRepository.delete(db, repo_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Repository with ID {repo_id} not found."
        )
    return None
