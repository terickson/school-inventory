"""Tests for admin endpoints."""


class TestAdminBackup:
    def test_backup_as_admin(self, client, admin_headers):
        """Admin can download database backup."""
        resp = client.get("/api/v1/admin/backup", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/octet-stream"
        assert "school_inventory_backup.db" in resp.headers.get(
            "content-disposition", ""
        )
        # Verify it's a valid SQLite file (starts with "SQLite format 3")
        assert resp.content[:16].startswith(b"SQLite format 3")

    def test_backup_as_teacher(self, client, teacher_headers):
        """Teachers can download database backup."""
        resp = client.get("/api/v1/admin/backup", headers=teacher_headers)
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/octet-stream"
        assert resp.content[:16].startswith(b"SQLite format 3")

    def test_backup_unauthenticated(self, client):
        """Unauthenticated users cannot download backup."""
        resp = client.get("/api/v1/admin/backup")
        assert resp.status_code == 401
