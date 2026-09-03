import pytest
import json
import hmac
import hashlib
from app.core.config import settings


def generate_signature(body: bytes) -> str:
    signature = hmac.new(
        settings.GITHUB_WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"


@pytest.mark.asyncio
async def test_webhook_non_pr_event_ignored(client):
    body = json.dumps({"action": "created"}).encode("utf-8")
    sig = generate_signature(body)
    res = await client.post(
        "/api/webhooks/github",
        content=body,
        headers={
            "x-github-event": "push",
            "x-hub-signature-256": sig,
            "content-type": "application/json"
        }
    )
    assert res.status_code == 202
    data = res.json()
    assert data["status"] == "ignored"


@pytest.mark.asyncio
async def test_webhook_pr_opened_event_queued(client):
    payload = {
        "action": "opened",
        "pull_request": {
            "number": 99,
            "title": "test: add integration checks",
            "body": "PR description",
            "state": "open",
            "head": {"sha": "abc12345", "ref": "feat/test"},
            "base": {"ref": "main"},
            "user": {"login": "dev-user"},
            "html_url": "https://github.com/acme/test-repo/pull/99"
        },
        "repository": {
            "name": "test-repo",
            "full_name": "acme/test-repo",
            "owner": {"login": "acme"}
        }
    }

    body = json.dumps(payload).encode("utf-8")
    sig = generate_signature(body)
    res = await client.post(
        "/api/webhooks/github",
        content=body,
        headers={
            "x-github-event": "pull_request",
            "x-hub-signature-256": sig,
            "content-type": "application/json"
        }
    )
    assert res.status_code == 202
    data = res.json()
    assert data["status"] == "queued"
    assert data["pr_number"] == 99
