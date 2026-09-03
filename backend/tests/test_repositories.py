import pytest


@pytest.mark.asyncio
async def test_create_and_get_repository(client):
    payload = {
        "name": "test-repo",
        "full_name": "acme/test-repo",
        "owner": "acme",
        "language": "Python",
        "default_branch": "main",
        "is_active": True,
        "config": {
            "auto_review": True,
            "min_severity": "HIGH",
            "check_security": True,
            "check_performance": True,
            "check_quality": True,
            "check_style": False,
            "max_files_per_review": 15,
            "model_name": "gpt-4o-mini"
        }
    }

    # 1. Create Repository
    res = await client.post("/api/repositories", json=payload)
    assert res.status_code == 201
    created = res.json()
    assert created["full_name"] == "acme/test-repo"
    assert created["id"] is not None

    # 2. List Repositories
    list_res = await client.get("/api/repositories")
    assert list_res.status_code == 200
    repos = list_res.json()
    assert len(repos) >= 1

    # 3. Update Review Config
    config_update = {"min_severity": "CRITICAL", "model_name": "gpt-4o"}
    cfg_res = await client.put(f"/api/repositories/{created['id']}/config", json=config_update)
    assert cfg_res.status_code == 200
    cfg_data = cfg_res.json()
    assert cfg_data["min_severity"] == "CRITICAL"
    assert cfg_data["model_name"] == "gpt-4o"
