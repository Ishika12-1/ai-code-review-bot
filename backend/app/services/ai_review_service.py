import json
import time
import re
import logging
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from app.core.config import settings
from app.schemas.ai import DirectCodeReviewRequest, AIReviewResultSchema, AIFindingSchema

logger = logging.getLogger("ai_review_service")

SYSTEM_PROMPT = """You are an elite Senior Staff Software Engineer and Application Security Architect performing a rigorous code review.

Your task is to analyze code changes or source files and provide structured, high-value, actionable feedback.

Rules:
1. FOCUS ON HIGH-IMPACT ISSUES: Flag critical bugs, security vulnerabilities (OWASP Top 10), performance bottlenecks, concurrency risks, memory leaks, and severe error-handling gaps.
2. DO NOT REPORT TRIVIAL NITS: Avoid superficial stylistic comments unless explicitly requested. Respect developer velocity.
3. EXPLAIN WHY IT MATTERS: For every finding, clearly articulate the security or runtime impact (e.g., race condition, denial-of-service, SQL injection, event loop blocking).
4. ACTIONABLE REMEDIATION: Provide clear, concise suggestions and a unified git-diff style replacement code snippet where applicable.
5. STRICT SEVERITY CALIBRATION:
   - CRITICAL: Remote code execution, SQLi, authentication bypass, data loss, crashes in critical path.
   - HIGH: Memory leaks, unindexed performance bottlenecks, event loop blocking, major logic flaws.
   - MEDIUM: Missing error handling, unvalidated boundary inputs, improper resource cleanup.
   - LOW: Minor edge cases, suboptimal algorithms, missing documentation for complex logic.
   - INFO: Suggestions for modern idioms or architecture refactoring.
6. JSON OUTPUT FORMAT ONLY: Return a strictly valid JSON object conforming exactly to the requested schema.

Output JSON Schema:
{
  "summary": "High-level summary of code quality and main concerns.",
  "score": 8.5,
  "findings": [
    {
      "severity": "HIGH",
      "category": "SECURITY",
      "file": "path/to/file.py",
      "line": 42,
      "title": "Concise issue title",
      "description": "Clear description of the problem",
      "impact": "Detailed explanation of why this matters and potential exploit/failure scenarios",
      "suggestion": "Specific instructions on how to fix the issue",
      "diff_snippet": "@@ -40,3 +40,3 @@\\n-  bad_code()\\n+  fixed_code()"
    }
  ]
}
"""


class AIReviewService:
    """Service for orchestrating AI code reviews via OpenAI or intelligent heuristic fallbacks."""

    def __init__(self):
        self.client = None
        if settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your"):
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    async def review_direct_code(self, req: DirectCodeReviewRequest) -> AIReviewResultSchema:
        """Analyze direct client code snippet or diff."""
        start_time = time.time()
        model_name = req.model or settings.OPENAI_MODEL

        # If live OpenAI client is available, query OpenAI
        if self.client:
            try:
                user_prompt = f"""Please review the following {req.language} code ({'Unified Diff' if req.is_diff else 'Source Code'}).
Filename: {req.filename}
Focus Areas: {', '.join(req.focus_areas) if req.focus_areas else 'All'}
Minimum Severity: {req.min_severity}
Custom Instructions: {req.custom_instructions or 'None'}

```
{req.code}
```
"""
                response = await self.client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.2,
                )
                raw_json = response.choices[0].message.content
                data = json.loads(raw_json)
                result = AIReviewResultSchema(**data)
                result.model_used = model_name
                result.duration_ms = round((time.time() - start_time) * 1000, 2)
                return result
            except Exception as e:
                logger.error(f"OpenAI API call failed: {e}. Falling back to heuristic analyzer.", exc_info=True)

        # Fallback intelligent analyzer for local dev & testing
        return self._heuristic_review_code(req, start_time, model_name)

    async def review_pr_diff(
        self,
        repo_name: str,
        pr_title: str,
        pr_number: int,
        diff_content: str,
        model_name: Optional[str] = None,
        custom_instructions: Optional[str] = None
    ) -> AIReviewResultSchema:
        """Analyze a full GitHub Pull Request unified diff."""
        req = DirectCodeReviewRequest(
            code=diff_content,
            language="multi",
            is_diff=True,
            filename=f"{repo_name}#PR-{pr_number}",
            model=model_name or settings.OPENAI_MODEL,
            custom_instructions=custom_instructions
        )
        return await self.review_direct_code(req)

    def _heuristic_review_code(
        self,
        req: DirectCodeReviewRequest,
        start_time: float,
        model_name: str
    ) -> AIReviewResultSchema:
        """Intelligent offline pattern analyzer for instant feedback without API keys."""
        findings: List[AIFindingSchema] = []
        code = req.code
        lines = code.split("\n")
        score = 9.5
        filename = req.filename or "code_snippet"

        # Check 1: SQL Injection / Unsafe String Formatting
        sql_patterns = [
            (r"f[\"']\s*(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*?\{.*?\}", "Potential SQL injection via f-string query construction"),
            (r"(SELECT|INSERT|UPDATE|DELETE)\s+.*?\{\w+\}", "Unsafe SQL dynamic query interpolation"),
            (r"execute\s*\(\s*f[\"'].*?\{.*?\}", "Potential SQL injection via f-string formatting in execute()"),
            (r"SELECT\s+.*?\s+FROM\s+.*?%\s*\(", "Unsafe string formatting in SQL query"),
            (r"cursor\.execute\s*\(\s*[\"'].*?\+\s*", "SQL query concatenation vulnerability"),
            (r"db\.query\s*\(\s*f[\"']", "Unsafe ORM raw query formatting"),
        ]
        for i, line in enumerate(lines):
            for pattern, title in sql_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    findings.append(AIFindingSchema(
                        severity="CRITICAL",
                        category="SECURITY",
                        file=filename,
                        line=i + 1,
                        title=title,
                        description="User-controlled parameters appear to be concatenated or formatted directly into a SQL query string.",
                        impact="Allows attackers to manipulate query logic, bypass authentication, or exfiltrate database contents (CWE-89 SQL Injection).",
                        suggestion="Use parameterized queries with bind variables (e.g. `cursor.execute('SELECT * FROM users WHERE id = :id', {'id': user_id})`).",
                        diff_snippet=f"@@ -{i+1},1 +{i+1},1 @@\n-{line.strip()}\n+  # Use parameterized queries\n+  await db.execute(select(User).where(User.id == user_id))"
                    ))
                    score -= 2.5
                    break

        # Check 2: Hardcoded Secrets / Tokens
        secret_patterns = [
            (r"(api_key|secret|password|token|access_token|private_key)\s*=\s*[\"'][a-zA-Z0-9_\-]{8,}[\"']", "Hardcoded API secret or credential detected"),
            (r"ghp_[a-zA-Z0-9]{36}", "Hardcoded GitHub Personal Access Token"),
            (r"sk-[a-zA-Z0-9]{32,}", "Hardcoded OpenAI Secret Key"),
        ]
        for i, line in enumerate(lines):
            for pattern, title in secret_patterns:
                if re.search(pattern, line, re.IGNORECASE) and not "os.getenv" in line and not "environ" in line:
                    findings.append(AIFindingSchema(
                        severity="CRITICAL",
                        category="SECURITY",
                        file=filename,
                        line=i + 1,
                        title=title,
                        description="Sensitive credential or token is hardcoded in the source code.",
                        impact="Hardcoded credentials committed to version control can be scraped by malicious actors, leading to compromised accounts.",
                        suggestion="Store credentials in environment variables and access via `os.environ.get()` or a `.env` file.",
                        diff_snippet=f"@@ -{i+1},1 +{i+1},1 @@\n-{line.strip()}\n+  secret_key = os.environ.get('SECRET_KEY')"
                    ))
                    score -= 2.0
                    break

        # Check 3: Synchronous blocking calls in async def
        if "async def" in code:
            for i, line in enumerate(lines):
                if re.search(r"requests\.(get|post|put|delete|patch)\(", line):
                    findings.append(AIFindingSchema(
                        severity="HIGH",
                        category="PERFORMANCE",
                        file=filename,
                        line=i + 1,
                        title="Synchronous blocking HTTP call inside async function",
                        description="`requests` is a synchronous blocking library that halts the entire asyncio event loop during network requests.",
                        impact="Severely degrades server throughput and concurrency, causing severe latency spikes for all concurrent users.",
                        suggestion="Use an asynchronous HTTP client such as `httpx.AsyncClient` with `await client.get(...)`.",
                        diff_snippet=f"@@ -{i+1},1 +{i+1},2 @@\n-{line.strip()}\n+  async with httpx.AsyncClient() as client:\n+      response = await client.get(url)"
                    ))
                    score -= 1.5
                    break
                elif re.search(r"time\.sleep\(", line):
                    findings.append(AIFindingSchema(
                        severity="HIGH",
                        category="PERFORMANCE",
                        file=filename,
                        line=i + 1,
                        title="Synchronous `time.sleep()` in async handler",
                        description="`time.sleep()` blocks the operating thread and halts all async event loop tasks.",
                        impact="Freezes all concurrent request processing for the duration of the sleep.",
                        suggestion="Replace `time.sleep(n)` with `await asyncio.sleep(n)`.",
                        diff_snippet=f"@@ -{i+1},1 +{i+1},1 @@\n-{line.strip()}\n+  await asyncio.sleep(duration)"
                    ))
                    score -= 1.5
                    break

        # Check 4: Unsafe eval() / exec()
        for i, line in enumerate(lines):
            if re.search(r"\b(eval|exec)\s*\(", line):
                findings.append(AIFindingSchema(
                    severity="CRITICAL",
                    category="SECURITY",
                    file=filename,
                    line=i + 1,
                    title="Dangerous dynamic code evaluation (`eval` / `exec`)",
                    description="Executing untrusted string data dynamically allows arbitrary code execution on the server.",
                    impact="Enables arbitrary remote code execution (RCE) and full server takeover.",
                    suggestion="Use safe parsers like `json.loads()`, `ast.literal_eval()`, or explicit dispatch tables.",
                    diff_snippet=f"@@ -{i+1},1 +{i+1},1 @@\n-{line.strip()}\n+  result = json.loads(user_input)"
                ))
                score -= 3.0
                break

        # Check 5: Bare Except clauses
        for i, line in enumerate(lines):
            if re.search(r"^\s*except:\s*$", line):
                findings.append(AIFindingSchema(
                    severity="MEDIUM",
                    category="QUALITY",
                    file=filename,
                    line=i + 1,
                    title="Bare `except:` catch-all suppresses system interrupts",
                    description="A bare `except:` catches `KeyboardInterrupt`, `SystemExit`, and hides unexpected bugs without logging.",
                    impact="Makes debugging extremely difficult and prevents clean application shutdown.",
                    suggestion="Catch specific exceptions like `except Exception as e:` and log the error.",
                    diff_snippet=f"@@ -{i+1},1 +{i+1},2 @@\n-{line.strip()}\n+  except Exception as e:\n+      logger.error(f'Operation failed: {{e}}')"
                ))
                score -= 0.8
                break

        # Default clean feedback if no issues detected
        score = max(1.0, min(10.0, round(score, 1)))
        if not findings:
            summary = "Excellent code quality! No security vulnerabilities, performance bottlenecks, or anti-patterns were detected. The implementation adheres to best practices."
        elif any(f.severity == "CRITICAL" for f in findings):
            summary = f"Review detected {len(findings)} concern(s), including critical security or stability blockers that must be resolved before production merge."
        else:
            summary = f"Review completed with {len(findings)} actionable observation(s). Overall structure is good with a few recommended performance and quality enhancements."

        return AIReviewResultSchema(
            summary=summary,
            score=score,
            findings=findings,
            model_used=model_name + " (heuristic-engine)",
            duration_ms=round((time.time() - start_time) * 1000, 2)
        )


ai_service = AIReviewService()
