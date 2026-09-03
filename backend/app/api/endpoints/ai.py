from fastapi import APIRouter, HTTPException, status
from app.schemas.ai import DirectCodeReviewRequest, AIReviewResultSchema
from app.services.ai_review_service import ai_service

router = APIRouter(prefix="/ai", tags=["AI Code Review"])


@router.post("/review-code", response_model=AIReviewResultSchema)
async def review_direct_code_snippet(request: DirectCodeReviewRequest):
    """Analyze a direct code snippet or patch submitted by user in Code Studio."""
    if not request.code.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source code or diff cannot be empty."
        )
    return await ai_service.review_direct_code(request)
