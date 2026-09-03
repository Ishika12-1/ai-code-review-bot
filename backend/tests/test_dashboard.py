import pytest


@pytest.mark.asyncio
async def test_dashboard_stats_and_reviews(client):
    # 1. Get initial stats
    res = await client.get("/api/dashboard/stats")
    assert res.status_code == 200
    data = res.json()
    assert "total_reviews" in data
    assert "average_score" in data
    assert "severity_breakdown" in data

    # 2. Create a manual code review session
    review_payload = {
        "title": "src/auth/token.py",
        "language": "python",
        "status": "COMPLETED",
        "score": 9.0,
        "summary": "High quality token generation logic.",
        "review_type": "MANUAL",
        "findings": [
            {
                "severity": "LOW",
                "category": "QUALITY",
                "file_path": "src/auth/token.py",
                "line_number": 10,
                "title": "Type annotations could be refined",
                "description": "Add return type annotation",
                "suggestion": "Add -> str to function signature"
            }
        ]
    }
    create_res = await client.post("/api/reviews", json=review_payload)
    assert create_res.status_code == 201
    created_data = create_res.json()
    assert created_data["title"] == "src/auth/token.py"
    assert len(created_data["findings"]) == 1

    # 3. Verify stats reflect created review
    res2 = await client.get("/api/dashboard/stats")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["total_reviews"] >= 1
