from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks, status
from typing import Optional
from app.services.github_service import github_service
import logging

logger = logging.getLogger("webhook_router")
router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/github", status_code=status.HTTP_202_ACCEPTED)
async def handle_github_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_github_event: Optional[str] = Header(None),
    x_hub_signature_256: Optional[str] = Header(None)
):
    """Receive and securely process GitHub webhook events in background worker."""
    raw_body = await request.body()

    # 1. Verify HMAC Signature
    if not github_service.verify_webhook_signature(raw_body, x_hub_signature_256):
        logger.warning("Rejected GitHub webhook with invalid HMAC signature.")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid GitHub webhook signature (X-Hub-Signature-256 mismatch)."
        )

    # 2. Only process pull_request events
    if x_github_event != "pull_request":
        return {"status": "ignored", "event": x_github_event, "message": "Only pull_request events are processed."}

    payload = await request.json()
    action = payload.get("action")

    # We inspect on PR opened, synchronized (new commits pushed), or reopened
    if action in ["opened", "synchronize", "reopened"]:
        background_tasks.add_task(github_service.process_pull_request_webhook, payload)
        return {
            "status": "queued",
            "action": action,
            "pr_number": payload.get("pull_request", {}).get("number"),
            "message": "AI code review analysis queued for background processing."
        }

    return {"status": "ignored", "action": action, "message": f"Action '{action}' does not trigger code review."}
