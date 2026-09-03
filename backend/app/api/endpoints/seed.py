from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.repository import Repository, ReviewConfiguration
from app.models.pull_request import PullRequest
from app.models.review import Review, Finding

router = APIRouter(tags=["Database Seeder"])


@router.post("/seed", status_code=status.HTTP_201_CREATED)
async def seed_database(db: AsyncSession = Depends(get_db)):
    """Seed the database with realistic sample repositories, PRs, reviews, and findings."""
    # Check if already seeded
    stmt = select(Repository)
    res = await db.execute(stmt)
    existing = res.scalars().first()
    if existing:
        return {"message": "Database already contains data.", "status": "skipped"}

    # Repo 1: Payment Service
    repo1 = Repository(
        name="payment-service",
        full_name="acme-corp/payment-service",
        owner="acme-corp",
        language="Python",
        default_branch="main",
        is_active=True,
    )
    db.add(repo1)
    await db.flush()

    config1 = ReviewConfiguration(
        repository_id=repo1.id,
        auto_review=True,
        min_severity="MEDIUM",
        check_security=True,
        check_performance=True,
        check_quality=True,
        check_style=False,
        max_files_per_review=25,
        model_name="gpt-4o-mini",
    )
    db.add(config1)

    pr1 = PullRequest(
        repository_id=repo1.id,
        pr_number=42,
        title="feat: add OAuth2 GitHub authentication and token refresh",
        description="Implements GitHub OAuth login flow and secure token refresh rotation.",
        author="alex-dev",
        head_branch="feat/github-auth",
        base_branch="main",
        status="open",
        head_commit_sha="a8f93e1029cbb214",
        html_url="https://github.com/acme-corp/payment-service/pull/42",
    )
    db.add(pr1)
    await db.flush()

    review1 = Review(
        pull_request_id=pr1.id,
        status="COMPLETED",
        score=8.5,
        summary="Overall this PR is well-structured and implements the OAuth2 handshake cleanly. However, there is 1 critical security vulnerability regarding unverified state tokens and 2 moderate performance/quality items to address before merging.",
        review_type="AUTOMATED",
        duration_ms=1420.0,
        commit_sha="a8f93e1029cbb214",
        model_used="gpt-4o-mini",
    )
    db.add(review1)
    await db.flush()

    finding1 = Finding(
        review_id=review1.id,
        severity="CRITICAL",
        category="SECURITY",
        file_path="app/api/auth/github.py",
        line_number=42,
        title="OAuth state parameter is not verified against CSRF",
        description="The callback handler accepts the `code` parameter without validating that the returned `state` matches the user session state.",
        impact="An attacker can initiate an OAuth login and trick a victim into linking the attacker's GitHub account to the victim's session (OAuth CSRF).",
        suggestion="Store a cryptographically random state parameter in the session or signed cookie before redirecting, and verify it on callback.",
        diff_snippet="""@@ -40,6 +40,8 @@ async def github_callback(code: str, state: str):
-    token_res = await fetch_github_token(code)
+    # FIX: Verify state parameter against user session token
+    if not verify_oauth_state(state):
+        raise HTTPException(status_code=400, detail="Invalid CSRF state token")
+    token_res = await fetch_github_token(code)""",
    )

    finding2 = Finding(
        review_id=review1.id,
        severity="HIGH",
        category="PERFORMANCE",
        file_path="app/services/token_service.py",
        line_number=118,
        title="Synchronous blocking HTTP call inside async FastAPI endpoint",
        description="The function uses `requests.post()` instead of an asynchronous client like `httpx.AsyncClient()`.",
        impact="This blocks the asyncio event loop during network roundtrips, degrading backend throughput under concurrent load.",
        suggestion="Use `httpx.AsyncClient()` with `async with` context manager for non-blocking outbound requests.",
        diff_snippet="""@@ -115,4 +115,4 @@ async def refresh_access_token(refresh_token: str):
-    response = requests.post(GITHUB_OAUTH_URL, data=payload)
+    async with httpx.AsyncClient() as client:
+        response = await client.post(GITHUB_OAUTH_URL, data=payload)""",
    )

    finding3 = Finding(
        review_id=review1.id,
        severity="MEDIUM",
        category="QUALITY",
        file_path="app/schemas/user.py",
        line_number=19,
        title="Missing input validation and length bounds on username field",
        description="The `username` string field in the Pydantic model does not specify `min_length` or `max_length`.",
        impact="Allows excessively long strings which could lead to database column overflow or memory consumption.",
        suggestion="Add `Field(min_length=3, max_length=50)` to restrict acceptable input lengths.",
        diff_snippet="""@@ -18,2 +18,2 @@ class UserCreate(BaseModel):
-    username: str
+    username: str = Field(..., min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")""",
    )

    db.add_all([finding1, finding2, finding3])

    # Repo 2: Order Engine
    repo2 = Repository(
        name="order-engine",
        full_name="acme-corp/order-engine",
        owner="acme-corp",
        language="TypeScript",
        default_branch="main",
        is_active=True,
    )
    db.add(repo2)
    await db.flush()

    config2 = ReviewConfiguration(
        repository_id=repo2.id,
        auto_review=True,
        min_severity="LOW",
        check_security=True,
        check_performance=True,
        check_quality=True,
        check_style=True,
        max_files_per_review=30,
        model_name="gpt-4o-mini",
    )
    db.add(config2)

    pr2 = PullRequest(
        repository_id=repo2.id,
        pr_number=15,
        title="fix: optimize SQL transaction locks on order checkout",
        description="Eliminates row contention during concurrent stock reservations.",
        author="sarah-code",
        head_branch="fix/sql-locks",
        base_branch="main",
        status="open",
        head_commit_sha="c3b9910d512a",
        html_url="https://github.com/acme-corp/order-engine/pull/15",
    )
    db.add(pr2)
    await db.flush()

    review2 = Review(
        pull_request_id=pr2.id,
        status="COMPLETED",
        score=9.2,
        summary="High-quality database lock optimization. No security issues detected. Minor suggestion on query timeout setting.",
        review_type="AUTOMATED",
        duration_ms=980.0,
        commit_sha="c3b9910d512a",
        model_used="gpt-4o-mini",
    )
    db.add(review2)
    await db.flush()

    finding4 = Finding(
        review_id=review2.id,
        severity="LOW",
        category="PERFORMANCE",
        file_path="src/database/transactions.ts",
        line_number=74,
        title="Consider setting explicit statement timeout on advisory locks",
        description="Advisory locks without explicit timeout may wait indefinitely if connection drops unexpectedly.",
        impact="Could hold lock indefinitely in edge-case network partitions.",
        suggestion="Add `SET statement_timeout = '5000ms'` prior to acquiring lock.",
        diff_snippet="""@@ -72,3 +72,4 @@ async function acquireOrderLock(orderId: string) {
+    await client.query("SET statement_timeout = '5000ms'");
     await client.query("SELECT pg_advisory_lock($1)", [orderId]);""",
    )
    db.add(finding4)

    # Repo 3: Analytics Backend
    repo3 = Repository(
        name="analytics-backend",
        full_name="acme-corp/analytics-backend",
        owner="acme-corp",
        language="Go",
        default_branch="main",
        is_active=False,
    )
    db.add(repo3)
    await db.flush()

    config3 = ReviewConfiguration(
        repository_id=repo3.id,
        auto_review=False,
        min_severity="HIGH",
        check_security=True,
        check_performance=True,
        check_quality=True,
        check_style=False,
        max_files_per_review=15,
        model_name="gpt-4o",
    )
    db.add(config3)

    await db.commit()
    return {"message": "Database seeded successfully with 3 repositories, 2 PRs, 2 reviews, and 4 findings.", "status": "success"}
