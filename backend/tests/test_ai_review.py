import pytest


@pytest.mark.asyncio
async def test_ai_direct_code_review_vulnerability(client):
    # Test submitting a snippet with SQL injection
    payload = {
        "code": "def login(user, pw):\n    query = f\"SELECT * FROM users WHERE u = '{user}'\"\n    db.execute(query)",
        "language": "python",
        "is_diff": False,
        "filename": "auth.py",
        "min_severity": "MEDIUM",
    }

    res = await client.post("/api/ai/review-code", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert "summary" in data
    assert "findings" in data
    assert len(data["findings"]) >= 1
    # Check that SQL injection was detected
    assert any(f["category"] == "SECURITY" for f in data["findings"])
    assert any(f["severity"] == "CRITICAL" for f in data["findings"])


@pytest.mark.asyncio
async def test_ai_direct_code_review_clean_code(client):
    # Test submitting safe code
    payload = {
        "code": "async def fetch_user(db: AsyncSession, user_id: int):\n    stmt = select(User).where(User.id == user_id)\n    return await db.execute(stmt)",
        "language": "python",
        "is_diff": False,
        "filename": "service.py",
    }

    res = await client.post("/api/ai/review-code", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["score"] >= 9.0
    assert len(data["findings"]) == 0
