import hmac
import hashlib
import base64
import logging
from typing import Optional, Dict, Any, List
import httpx
import jwt
import time
from app.core.config import settings
from app.services.ai_review_service import ai_service
from app.repositories.repository_repo import RepositoryRepository
from app.repositories.pr_repo import PullRequestRepository
from app.repositories.review_repo import ReviewRepository
from app.schemas.pull_request import PullRequestCreate
from app.schemas.review import ReviewCreate, FindingCreate
from app.core.database import AsyncSessionLocal

logger = logging.getLogger("github_service")


class GitHubService:
    """Service for interacting with GitHub REST API and processing Webhook events."""

    def __init__(self):
        self.api_url = "https://api.github.com"
        self.default_headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "AI-Code-Review-Bot",
        }
        if settings.GITHUB_TOKEN and not settings.GITHUB_TOKEN.startswith("ghp_your"):
            self.default_headers["Authorization"] = f"token {settings.GITHUB_TOKEN}"

    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Build request headers with user token or server token."""
        headers = dict(self.default_headers)
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    def get_app_jwt(self) -> Optional[str]:
        if not settings.GITHUB_PRIVATE_KEY_PATH or not settings.GITHUB_APP_ID:
            return None
        try:
            with open(settings.GITHUB_PRIVATE_KEY_PATH, "r") as f:
                private_key = f.read()

            payload = {
                "iat": int(time.time()) - 60,
                "exp": int(time.time()) + 600,
                "iss": str(settings.GITHUB_APP_ID),
            }

            return jwt.encode(payload, private_key, algorithm="RS256")
        except Exception as e:
            logger.error(f"Error generating GitHub App JWT: {e}")
            return None

    @staticmethod
    def verify_webhook_signature(payload_body: bytes, signature_header: Optional[str]) -> bool:
        """Verify HMAC-SHA256 signature from GitHub webhook event."""
        if not settings.GITHUB_WEBHOOK_SECRET:
            logger.warning("GITHUB_WEBHOOK_SECRET not set; skipping signature validation.")
            return True

        if not signature_header or not signature_header.startswith("sha256="):
            return False

        expected_sig = "sha256=" + hmac.new(
            settings.GITHUB_WEBHOOK_SECRET.encode(),
            payload_body,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(expected_sig, signature_header)

    async def list_user_repositories(self, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """Fetch accessible repositories for the user via GitHub API."""
        headers = self._get_headers(access_token)
        if "Authorization" not in headers:
            # Fallback sample repositories for demonstration when no token is present
            return [
                {
                    "id": 101,
                    "name": "payment-service",
                    "full_name": "acme-corp/payment-service",
                    "owner": {"login": "acme-corp", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"},
                    "description": "Core payment orchestration & Stripe webhook processing service",
                    "language": "Python",
                    "default_branch": "main",
                    "stargazers_count": 142,
                    "open_issues_count": 4,
                    "private": False,
                    "html_url": "https://github.com/acme-corp/payment-service"
                },
                {
                    "id": 102,
                    "name": "order-engine",
                    "full_name": "acme-corp/order-engine",
                    "owner": {"login": "acme-corp", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"},
                    "description": "High-throughput asynchronous order processing microservice",
                    "language": "TypeScript",
                    "default_branch": "main",
                    "stargazers_count": 89,
                    "open_issues_count": 2,
                    "private": False,
                    "html_url": "https://github.com/acme-corp/order-engine"
                },
                {
                    "id": 103,
                    "name": "analytics-backend",
                    "full_name": "acme-corp/analytics-backend",
                    "owner": {"login": "acme-corp", "avatar_url": "https://avatars.githubusercontent.com/u/9919?v=4"},
                    "description": "Real-time stream aggregation pipelines and query engine",
                    "language": "Go",
                    "default_branch": "main",
                    "stargazers_count": 215,
                    "open_issues_count": 7,
                    "private": False,
                    "html_url": "https://github.com/acme-corp/analytics-backend"
                }
            ]

        url = f"{self.api_url}/user/repos?sort=updated&per_page=50"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"Failed to fetch user repos: {resp.status_code} {resp.text}")
                return []
        except Exception as e:
            logger.error(f"Error fetching user repos: {e}")
            return []

    async def list_repo_branches(self, owner: str, repo: str, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """List branches for a given GitHub repository."""
        headers = self._get_headers(access_token)
        if "Authorization" not in headers:
            return [
                {"name": "main", "protected": True, "commit": {"sha": "a8f93e1029cbb214"}},
                {"name": "feat/github-auth", "protected": False, "commit": {"sha": "c3b9910d512a"}},
                {"name": "fix/sql-locks", "protected": False, "commit": {"sha": "e7b1248a901f"}},
                {"name": "develop", "protected": False, "commit": {"sha": "4f910a34b981"}}
            ]

        url = f"{self.api_url}/repos/{owner}/{repo}/branches"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    return resp.json()
                return [{"name": "main"}]
        except Exception as e:
            logger.error(f"Error fetching branches: {e}")
            return [{"name": "main"}]

    async def list_repo_contents(self, owner: str, repo: str, path: str = "", ref: Optional[str] = None, access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """List directory contents or file metadata in repository."""
        headers = self._get_headers(access_token)
        if "Authorization" not in headers:
            # Realistic mock file structure
            if not path or path == "/":
                return [
                    {"name": "src", "path": "src", "type": "dir", "size": 0},
                    {"name": "tests", "path": "tests", "type": "dir", "size": 0},
                    {"name": "app", "path": "app", "type": "dir", "size": 0},
                    {"name": "README.md", "path": "README.md", "type": "file", "size": 1240},
                    {"name": "package.json", "path": "package.json", "type": "file", "size": 650},
                    {"name": "main.py", "path": "main.py", "type": "file", "size": 2400},
                ]
            elif path in ["src", "app"]:
                return [
                    {"name": "auth.py", "path": f"{path}/auth.py", "type": "file", "size": 1820},
                    {"name": "database.py", "path": f"{path}/database.py", "type": "file", "size": 950},
                    {"name": "services.py", "path": f"{path}/services.py", "type": "file", "size": 3100},
                    {"name": "router.py", "path": f"{path}/router.py", "type": "file", "size": 1200},
                ]
            else:
                return [
                    {"name": "test_service.py", "path": f"{path}/test_service.py", "type": "file", "size": 890}
                ]

        url = f"{self.api_url}/repos/{owner}/{repo}/contents/{path.strip('/')}"
        params = {"ref": ref} if ref else {}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=15.0)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, list):
                        return data
                    return [data]
                return []
        except Exception as e:
            logger.error(f"Error fetching repo contents: {e}")
            return []

    async def get_raw_file_content(self, owner: str, repo: str, path: str, ref: Optional[str] = None, access_token: Optional[str] = None) -> Dict[str, Any]:
        """Fetch raw content of a specific file from GitHub."""
        headers = self._get_headers(access_token)
        if "Authorization" not in headers:
            # Return sample file code for review demo
            sample_code = """import os
import sqlite3
import requests

def authenticate_user(username, password):
    # Vulnerability: Direct f-string formatting into SQL query
    conn = sqlite3.connect("users.db")
    cursor = conn.cursor()
    query = f"SELECT * FROM users WHERE username = '{username}' AND password = '{password}'"
    cursor.execute(query)
    user = cursor.fetchone()
    
    # Hardcoded fallback key
    api_key = "sk-live-supersecretapikey12345"
    
    return user
"""
            return {
                "name": path.split("/")[-1],
                "path": path,
                "content": sample_code,
                "encoding": "utf-8",
                "size": len(sample_code)
            }

        url = f"{self.api_url}/repos/{owner}/{repo}/contents/{path.strip('/')}"
        params = {"ref": ref} if ref else {}
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, params=params, timeout=15.0)
                if resp.status_code == 200:
                    data = resp.json()
                    content_encoded = data.get("content", "")
                    if data.get("encoding") == "base64" and content_encoded:
                        decoded_bytes = base64.b64decode(content_encoded)
                        text_content = decoded_bytes.decode("utf-8", errors="replace")
                    else:
                        text_content = content_encoded

                    return {
                        "name": data.get("name"),
                        "path": data.get("path"),
                        "content": text_content,
                        "size": data.get("size", 0)
                    }
                return {"name": path, "path": path, "content": "", "size": 0}
        except Exception as e:
            logger.error(f"Error fetching raw file: {e}")
            return {"name": path, "path": path, "content": "", "size": 0}

    async def list_repo_pull_requests(self, owner: str, repo: str, state: str = "open", access_token: Optional[str] = None) -> List[Dict[str, Any]]:
        """List pull requests for a repository."""
        headers = self._get_headers(access_token)
        if "Authorization" not in headers:
            return [
                {
                    "id": 1,
                    "number": 42,
                    "title": "feat: add OAuth2 GitHub authentication and token refresh",
                    "user": {"login": "alex-dev", "avatar_url": "https://avatars.githubusercontent.com/u/101?v=4"},
                    "head": {"ref": "feat/github-auth", "sha": "a8f93e1029cbb214"},
                    "base": {"ref": "main"},
                    "state": "open",
                    "created_at": "2026-09-02T14:30:00Z",
                    "html_url": f"https://github.com/{owner}/{repo}/pull/42",
                    "body": "Implements GitHub OAuth login flow and secure token refresh rotation."
                },
                {
                    "id": 2,
                    "number": 15,
                    "title": "fix: optimize SQL transaction locks on order checkout",
                    "user": {"login": "sarah-code", "avatar_url": "https://avatars.githubusercontent.com/u/102?v=4"},
                    "head": {"ref": "fix/sql-locks", "sha": "c3b9910d512a"},
                    "base": {"ref": "main"},
                    "state": "open",
                    "created_at": "2026-09-03T09:15:00Z",
                    "html_url": f"https://github.com/{owner}/{repo}/pull/15",
                    "body": "Eliminates row contention during concurrent stock reservations."
                }
            ]

        url = f"{self.api_url}/repos/{owner}/{repo}/pulls?state={state}"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    return resp.json()
                return []
        except Exception as e:
            logger.error(f"Error fetching PRs: {e}")
            return []

    async def get_pull_request_diff(self, owner: str, repo: str, pr_number: int, access_token: Optional[str] = None) -> str:
        """Fetch raw unified diff patch for a Pull Request."""
        headers = self._get_headers(access_token)
        headers["Accept"] = "application/vnd.github.v3.diff"

        if "Authorization" not in headers or "Bearer None" in headers.get("Authorization", ""):
            return """--- a/app/api/auth/github.py
+++ b/app/api/auth/github.py
@@ -40,6 +40,8 @@ async def github_callback(code: str, state: str):
-    token_res = await fetch_github_token(code)
+    # NOTE: verify state parameter
+    token_res = await fetch_github_token(code)
--- a/src/services/billing.py
+++ b/src/services/billing.py
@@ -14,6 +14,8 @@ async def process_payment(order_id: str):
-    response = requests.post("https://api.stripe.com/v1/charges")
+    async with httpx.AsyncClient() as client:
+        response = await client.post("https://api.stripe.com/v1/charges")
"""

        url = f"{self.api_url}/repos/{owner}/{repo}/pulls/{pr_number}"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=headers, timeout=15.0)
                if resp.status_code == 200:
                    return resp.text
                return ""
        except Exception as e:
            logger.error(f"Error fetching PR diff: {e}")
            return ""

    async def get_pull_request_files(self, owner: str, repo: str, pr_number: int) -> List[Dict[str, Any]]:
        """Fetch list of changed files and unified diff patches for a PR."""
        url = f"{self.api_url}/repos/{owner}/{repo}/pulls/{pr_number}/files"
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, headers=self.default_headers, timeout=15.0)
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"Failed to fetch PR files: {resp.status_code} {resp.text}")
                return []
        except Exception as e:
            logger.error(f"Error fetching PR files: {e}")
            return []

    async def post_review_comment(self, owner: str, repo: str, pr_number: int, commit_sha: str, body: str) -> bool:
        """Post a general review summary comment to the GitHub Pull Request."""
        url = f"{self.api_url}/repos/{owner}/{repo}/pulls/{pr_number}/reviews"
        payload = {
            "commit_id": commit_sha,
            "body": body,
            "event": "COMMENT"
        }
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(url, headers=self.default_headers, json=payload, timeout=15.0)
                return resp.status_code in [200, 201]
        except Exception as e:
            logger.error(f"Error posting review comment: {e}")
            return False

    async def process_pull_request_webhook(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Asynchronous worker to process PR opened/synchronize webhook events."""
        action = payload.get("action")
        pr_data = payload.get("pull_request", {})
        repo_data = payload.get("repository", {})

        if not pr_data or not repo_data:
            return {"status": "ignored", "reason": "Missing pr or repository data"}

        repo_full_name = repo_data.get("full_name")
        pr_number = pr_data.get("number")
        commit_sha = pr_data.get("head", {}).get("sha", "")
        owner = repo_data.get("owner", {}).get("login", "")
        repo_name = repo_data.get("name", "")

        logger.info(f"Processing PR webhook: {repo_full_name} #{pr_number} action={action}")

        async with AsyncSessionLocal() as db:
            # 1. Look up repository in DB
            repo = await RepositoryRepository.get_by_full_name(db, repo_full_name)
            if not repo or not repo.is_active:
                logger.info(f"Repository {repo_full_name} is not registered or is inactive. Skipping.")
                return {"status": "skipped", "reason": "Repo inactive or unmonitored"}

            # 2. Register/Update Pull Request record
            pr_schema = PullRequestCreate(
                repository_id=repo.id,
                pr_number=pr_number,
                title=pr_data.get("title", f"PR #{pr_number}"),
                description=pr_data.get("body"),
                author=pr_data.get("user", {}).get("login", "unknown"),
                head_branch=pr_data.get("head", {}).get("ref", "unknown"),
                base_branch=pr_data.get("base", {}).get("ref", "main"),
                status=pr_data.get("state", "open"),
                head_commit_sha=commit_sha,
                html_url=pr_data.get("html_url"),
            )
            pr_record = await PullRequestRepository.create_or_update(db, pr_schema)

            # 3. Fetch changed files & unified diffs
            changed_files = await self.get_pull_request_files(owner, repo_name, pr_number)
            combined_diff = ""
            for file_info in changed_files[:repo.config.max_files_per_review if repo.config else 20]:
                filename = file_info.get("filename", "")
                patch = file_info.get("patch", "")
                if patch:
                    combined_diff += f"\n--- {filename}\n+++ {filename}\n{patch}\n"

            if not combined_diff:
                combined_diff = f"PR #{pr_number}: {pr_data.get('title', '')}\nNo unified patch text available."

            # 4. Trigger AI Review Engine
            model_name = repo.config.model_name if repo.config else settings.OPENAI_MODEL
            custom_instructions = repo.config.custom_instructions if repo.config else None
            ai_result = await ai_service.review_pr_diff(
                repo_name=repo_full_name,
                pr_title=pr_data.get("title", ""),
                pr_number=pr_number,
                diff_content=combined_diff,
                model_name=model_name,
                custom_instructions=custom_instructions
            )

            # 5. Persist Review and Findings to DB
            findings_create = [
                FindingCreate(
                    severity=f.severity,
                    category=f.category,
                    file_path=f.file,
                    line_number=f.line,
                    title=f.title,
                    description=f.description,
                    impact=f.impact,
                    suggestion=f.suggestion,
                    diff_snippet=f.diff_snippet
                ) for f in ai_result.findings
            ]

            review_schema = ReviewCreate(
                repository_id=repo.id,
                pull_request_id=pr_record.id,
                title=f"PR #{pr_number}: {pr_record.title}",
                status="COMPLETED",
                score=ai_result.score,
                summary=ai_result.summary,
                review_type="AUTOMATED",
                duration_ms=ai_result.duration_ms,
                commit_sha=commit_sha,
                model_used=ai_result.model_used,
                findings=findings_create
            )
            await ReviewRepository.create(db, review_schema)

            # 6. Post Review Comment back to GitHub
            comment_body = f"""## 🤖 AI Code Review Summary
**Score:** `{ai_result.score}/10` | **Model:** `{ai_result.model_used}`

{ai_result.summary}

### 🔍 Key Findings ({len(ai_result.findings)})
"""
            for finding in ai_result.findings:
                comment_body += f"- **[{finding.severity}]** `{finding.file}` (L{finding.line}): {finding.title}\n  _{finding.suggestion}_\n"

            comment_body += "\n---\n*Automated review provided by [AI Code Review Bot](https://github.com)*"
            await self.post_review_comment(owner, repo_name, pr_number, commit_sha, comment_body)

            return {
                "status": "success",
                "pr_number": pr_number,
                "score": ai_result.score,
                "findings_count": len(ai_result.findings)
            }


github_service = GitHubService()
