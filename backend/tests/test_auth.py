import pytest


@pytest.mark.asyncio
async def test_auth_register_and_login(client):
    # 1. Register a new user
    reg_payload = {
        "name": "Test Engineer",
        "email": "engineer@example.com",
        "password": "securepassword123",
        "confirm_password": "securepassword123"
    }
    reg_res = await client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert "access_token" in reg_data
    assert reg_data["user"]["email"] == "engineer@example.com"
    token = reg_data["access_token"]

    # 2. Duplicate registration should be rejected
    dup_res = await client.post("/api/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Log in with credentials
    login_res = await client.post("/api/auth/login", json={
        "email": "engineer@example.com",
        "password": "securepassword123"
    })
    assert login_res.status_code == 200
    login_data = login_res.json()
    assert "access_token" in login_data

    # 4. Access /api/auth/me with token
    me_res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert me_res.status_code == 200
    me_data = me_res.json()
    assert me_data["name"] == "Test Engineer"
    assert me_data["email"] == "engineer@example.com"


@pytest.mark.asyncio
async def test_auth_invalid_credentials(client):
    res = await client.post("/api/auth/login", json={
        "email": "nonexistent@example.com",
        "password": "wrongpassword"
    })
    assert res.status_code == 401
