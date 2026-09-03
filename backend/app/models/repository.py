from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Repository(Base):
    """Connected GitHub repository model."""
    __tablename__ = "repositories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    github_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True, nullable=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)  # e.g., 'acme-corp/payment-service'
    owner: Mapped[str] = mapped_column(String(100), nullable=False)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    default_branch: Mapped[str] = mapped_column(String(100), default="main")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="repositories")
    config: Mapped[Optional["ReviewConfiguration"]] = relationship("ReviewConfiguration", back_populates="repository", uselist=False, cascade="all, delete-orphan")
    pull_requests: Mapped[List["PullRequest"]] = relationship("PullRequest", back_populates="repository", cascade="all, delete-orphan")
    reviews: Mapped[List["Review"]] = relationship("Review", back_populates="repository")



class ReviewConfiguration(Base):
    """Fine-grained AI code review rules & thresholds per repository."""
    __tablename__ = "review_configurations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    repository_id: Mapped[int] = mapped_column(ForeignKey("repositories.id", ondelete="CASCADE"), unique=True, nullable=False)
    auto_review: Mapped[bool] = mapped_column(Boolean, default=True)
    min_severity: Mapped[str] = mapped_column(String(20), default="MEDIUM")  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    check_security: Mapped[bool] = mapped_column(Boolean, default=True)
    check_performance: Mapped[bool] = mapped_column(Boolean, default=True)
    check_quality: Mapped[bool] = mapped_column(Boolean, default=True)
    check_style: Mapped[bool] = mapped_column(Boolean, default=False)
    max_files_per_review: Mapped[int] = mapped_column(Integer, default=20)
    model_name: Mapped[str] = mapped_column(String(50), default="gpt-4o-mini")
    custom_instructions: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)

    # Relationship
    repository: Mapped["Repository"] = relationship("Repository", back_populates="config")
