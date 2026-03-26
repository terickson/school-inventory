class TestUserEndpoints:
    def test_create_user(self, client, admin_headers):
        resp = client.post("/api/v1/users", json={
            "username": "newteacher",
            "full_name": "New Teacher",
            "password": "pass123",
            "role": "teacher",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["username"] == "newteacher"
        assert resp.json()["role"] == "teacher"

    def test_create_user_duplicate_username(self, client, admin_headers, teacher_user):
        resp = client.post("/api/v1/users", json={
            "username": "teacher1",
            "password": "pass123",
        }, headers=admin_headers)
        assert resp.status_code == 409

    def test_create_user_teacher_forbidden(self, client, teacher_headers):
        resp = client.post("/api/v1/users", json={
            "username": "other", "password": "p",
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_list_users(self, client, admin_headers, teacher_user):
        resp = client.get("/api/v1/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total" in data
        assert "items" in data
        assert data["total"] >= 1

    def test_list_users_pagination(self, client, admin_headers, teacher_user):
        resp = client.get("/api/v1/users?skip=0&limit=1", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["limit"] == 1

    def test_list_users_filter_role(self, client, admin_headers, admin_user, teacher_user):
        resp = client.get("/api/v1/users?role=teacher", headers=admin_headers)
        assert resp.status_code == 200
        for u in resp.json()["items"]:
            assert u["role"] == "teacher"

    def test_list_users_search(self, client, admin_headers, teacher_user):
        resp = client.get("/api/v1/users?search=teacher1", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] >= 1
        assert any(u["username"] == "teacher1" for u in data["items"])

    def test_list_users_search_no_match(self, client, admin_headers, teacher_user):
        resp = client.get("/api/v1/users?search=nonexistent", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_get_user(self, client, admin_headers, teacher_user):
        resp = client.get(f"/api/v1/users/{teacher_user.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == teacher_user.id

    def test_get_user_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/users/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_user(self, client, admin_headers, teacher_user):
        resp = client.patch(f"/api/v1/users/{teacher_user.id}", json={
            "full_name": "Updated Name",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "Updated Name"

    def test_soft_delete_user(self, client, admin_headers, teacher_user):
        resp = client.delete(f"/api/v1/users/{teacher_user.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_reset_password(self, client, admin_headers, teacher_user):
        resp = client.post(
            f"/api/v1/users/{teacher_user.id}/reset-password",
            json={"new_password": "newpass123"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        # Verify new password works
        login = client.post("/api/v1/auth/token", data={
            "username": "teacher1", "password": "newpass123",
        })
        assert login.status_code == 200

    def test_update_self(self, client, teacher_headers):
        resp = client.patch("/api/v1/users/me", json={
            "full_name": "My New Name",
        }, headers=teacher_headers)
        assert resp.status_code == 200
        assert resp.json()["full_name"] == "My New Name"

    def test_get_my_profile(self, client, teacher_headers, teacher_user):
        resp = client.get("/api/v1/users/me", headers=teacher_headers)
        assert resp.status_code == 200
        assert resp.json()["username"] == "teacher1"


class TestUserSorting:
    def test_sort_users_by_username_asc(self, client, admin_headers, db):
        from app.models.user import User
        from passlib.context import CryptContext
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)
        for name in ["charlie", "alice", "bob"]:
            db.add(User(username=name, password_hash=pwd.hash("p"), role="teacher"))
        db.commit()
        resp = client.get("/api/v1/users?sort_by=username&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [u["username"] for u in resp.json()["items"]]
        assert names == sorted(names)

    def test_sort_users_by_username_desc(self, client, admin_headers, db):
        from app.models.user import User
        from passlib.context import CryptContext
        pwd = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=4)
        for name in ["charlie", "alice", "bob"]:
            db.add(User(username=name, password_hash=pwd.hash("p"), role="teacher"))
        db.commit()
        resp = client.get("/api/v1/users?sort_by=username&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        names = [u["username"] for u in resp.json()["items"]]
        assert names == sorted(names, reverse=True)

    def test_sort_users_invalid_column_ignored(self, client, admin_headers, admin_user):
        resp = client.get("/api/v1/users?sort_by=nonexistent&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200

    def test_sort_users_invalid_order_rejected(self, client, admin_headers, admin_user):
        resp = client.get("/api/v1/users?sort_by=username&sort_order=invalid", headers=admin_headers)
        assert resp.status_code == 422
