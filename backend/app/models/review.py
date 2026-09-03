from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Integer, Float, ForeignKey, DateTime, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base


class Review(Base):
    """AI code review execution session model."""
    __tablename__ = "reviews"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    repository_id: Mapped[Optional[int]] = mapped_column(ForeignKey("repositories.id", ondelete="SET NULL"), nullable=True, index=True)
    pull_request_id: Mapped[Optional[int]] = mapped_column(ForeignKey("pull_requests.id", ondelete="CASCADE"), nullable=True, index=True)
    title: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    language: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="COMPLETED")  # PENDING, IN_PROGRESS, COMPLETED, FAILED
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Scale 1.0 to 10.0
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    review_type: Mapped[str] = mapped_column(String(50), default="AUTOMATED")  # AUTOMATED, MANUAL, FILE, PR
    duration_ms: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    commit_sha: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    model_used: Mapped[Optional[str]] = mapped_column(String(50), default="gpt-4o-mini")
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user: Mapped[Optional["User"]] = relationship("User", back_populates="reviews")
    repository: Mapped[Optional["Repository"]] = relationship("Repository", back_populates="reviews")
    pull_request: Mapped[Optional["PullRequest"]] = relationship("PullRequest", back_populates="reviews")
    findings: Mapped[List["Finding"]] = relationship("Finding", back_populates="review", cascade="all, delete-orphan")



class Finding(Base):
    """Individual code review finding / diagnostic item."""
    __tablename__ = "findings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    review_id: Mapped[int] = mapped_column(ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(20), index=True, nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    category: Mapped[str] = mapped_column(String(50), index=True, nullable=False)  # SECURITY, PERFORMANCE, QUALITY, BUG, STYLE
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    suggestion: Mapped[str] = mapped_column(Text, nullable=False)
    diff_snippet: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    github_comment_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    review: Mapped["Review"] = relationship("Review", back_populates="findings")
