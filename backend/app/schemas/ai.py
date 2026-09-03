from typing import List, Optional
from pydantic import BaseModel, Field


class DirectCodeReviewRequest(BaseModel):
    """Payload for submitting direct client code snippet or diff to AI reviewer."""
    code: str = Field(..., description="Source code or unified git diff to analyze")
    language: str = Field(default="python", description="Programming language (python, javascript, typescript, go, rust, java, etc.)")
    is_diff: bool = Field(default=False, description="True if input is a unified git diff, False if standard source code")
    filename: Optional[str] = Field(default="snippet.py", description="Optional filename context")
    model: Optional[str] = Field(default="gpt-4o-mini", description="OpenAI model name")
    focus_areas: Optional[List[str]] = Field(
        default=["SECURITY", "PERFORMANCE", "QUALITY", "BUG"],
        description="Focus areas to inspect"
    )
    min_severity: Optional[str] = Field(default="MEDIUM", pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$")
    custom_instructions: Optional[str] = None


class AIFindingSchema(BaseModel):
    """Schema for individual structured AI finding."""
    severity: str = Field(pattern="^(CRITICAL|HIGH|MEDIUM|LOW|INFO)$")
    category: str = Field(pattern="^(SECURITY|PERFORMANCE|QUALITY|BUG|STYLE)$")
    file: str
    line: Optional[int] = None
    title: str
    description: str
    impact: Optional[str] = None
    suggestion: str
    diff_snippet: Optional[str] = None


class AIReviewResultSchema(BaseModel):
    """Structured response output from OpenAI Code Review Engine."""
    summary: str = Field(description="Executive summary of the code review findings")
    score: float = Field(ge=1.0, le=10.0, description="Overall code quality score between 1.0 and 10.0")
    findings: List[AIFindingSchema] = Field(default_factory=list)
    model_used: str = "gpt-4o-mini"
    duration_ms: Optional[float] = None
