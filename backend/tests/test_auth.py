from app.dependencies.auth import create_access_token, create_refresh_token, decode_token


class TestAuthEndpoints:
    def test_login_success(self, client, admin_user):
        resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_wrong_password(self, client, admin_user):
        resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "wrong"})
        assert resp.status_code == 401

    def test_login_nonexistent_user(self, client):
        resp = client.post("/api/v1/auth/token", data={"username": "nobody", "password": "pass"})
        assert resp.status_code == 401

    def test_login_inactive_user(self, client, db, admin_user):
        admin_user.is_active = False
        db.commit()
        resp = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
        assert resp.status_code == 401

    def test_refresh_token(self, client, admin_user):
        login = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
        refresh = login.json()["refresh_token"]
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
        assert resp.status_code == 200
        assert "access_token" in resp.json()

    def test_refresh_with_access_token_fails(self, client, admin_user):
        login = client.post("/api/v1/auth/token", data={"username": "admin", "password": "admin123"})
        access = login.json()["access_token"]
        resp = client.post("/api/v1/auth/refresh", json={"refresh_token": access})
        assert resp.status_code == 401

    def test_get_me(self, client, admin_user, admin_headers):
        resp = client.get("/api/v1/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "admin"

    def test_get_me_unauthorized(self, client):
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_logout(self, client, admin_headers):
        resp = client.post("/api/v1/auth/logout", headers=admin_headers)
        assert resp.status_code == 200

    def test_token_type_claim(self, admin_user):
        access = create_access_token(admin_user.id)
        refresh = create_refresh_token(admin_user.id)
        access_payload = decode_token(access, "access")
        refresh_payload = decode_token(refresh, "refresh")
        assert access_payload["type"] == "access"
        assert refresh_payload["type"] == "refresh"
