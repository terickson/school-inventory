class TestCategoryEndpoints:
    def test_list_categories(self, client, admin_headers, category):
        resp = client.get("/api/v1/categories", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_create_category(self, client, admin_headers):
        resp = client.post("/api/v1/categories", json={
            "name": "New Category",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "New Category"

    def test_create_category_teacher_forbidden(self, client, teacher_headers):
        resp = client.post("/api/v1/categories", json={
            "name": "Forbidden",
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_create_category_duplicate_name(self, client, admin_headers, category):
        resp = client.post("/api/v1/categories", json={
            "name": category.name,
        }, headers=admin_headers)
        assert resp.status_code == 409

    def test_get_category(self, client, admin_headers, category):
        resp = client.get(f"/api/v1/categories/{category.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == category.id
        assert resp.json()["name"] == category.name

    def test_get_category_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/categories/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_category(self, client, admin_headers, category):
        resp = client.patch(f"/api/v1/categories/{category.id}", json={
            "name": "Updated Category",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Category"

    def test_update_category_not_found(self, client, admin_headers):
        resp = client.patch("/api/v1/categories/9999", json={
            "name": "Nope",
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_update_category_duplicate_name(self, client, admin_headers, db):
        from app.models.item import Category
        cat1 = Category(name="Cat One")
        cat2 = Category(name="Cat Two")
        db.add_all([cat1, cat2])
        db.commit()
        db.refresh(cat2)
        resp = client.patch(f"/api/v1/categories/{cat2.id}", json={
            "name": "Cat One",
        }, headers=admin_headers)
        assert resp.status_code == 409

    def test_update_category_teacher_forbidden(self, client, teacher_headers, category):
        resp = client.patch(f"/api/v1/categories/{category.id}", json={
            "name": "Nope",
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_delete_category(self, client, admin_headers, db):
        from app.models.item import Category
        cat = Category(name="Deletable")
        db.add(cat)
        db.commit()
        db.refresh(cat)
        resp = client.delete(f"/api/v1/categories/{cat.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_category_with_items_blocked(self, client, admin_headers, category, item):
        resp = client.delete(f"/api/v1/categories/{category.id}", headers=admin_headers)
        assert resp.status_code == 400
        assert "Cannot delete category" in resp.json()["detail"]

    def test_delete_category_not_found(self, client, admin_headers):
        resp = client.delete("/api/v1/categories/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_delete_category_teacher_forbidden(self, client, teacher_headers, category):
        resp = client.delete(f"/api/v1/categories/{category.id}", headers=teacher_headers)
        assert resp.status_code == 403

    def test_list_categories_search(self, client, admin_headers, category):
        resp = client.get(f"/api/v1/categories?search={category.name}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_sort_categories_by_name(self, client, admin_headers, db):
        from app.models.item import Category
        for name in ["Zebra Cat", "Alpha Cat", "Middle Cat"]:
            db.add(Category(name=name))
        db.commit()
        resp = client.get("/api/v1/categories?sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [c["name"] for c in resp.json()["items"]]
        assert names == sorted(names)


class TestItemEndpoints:
    def test_create_item(self, client, admin_headers, category):
        resp = client.post("/api/v1/items", json={
            "name": "Pencils",
            "description": "No. 2 pencils",
            "category_id": category.id,
            "unit_of_measure": "box",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Pencils"

    def test_create_item_invalid_category(self, client, admin_headers):
        resp = client.post("/api/v1/items", json={
            "name": "Pencils",
            "category_id": 9999,
        }, headers=admin_headers)
        assert resp.status_code == 404

    def test_list_items(self, client, admin_headers, item):
        resp = client.get("/api/v1/items", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_items_search(self, client, admin_headers, item):
        resp = client.get("/api/v1/items?search=Test", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_items_filter_category(self, client, admin_headers, item, category):
        resp = client.get(f"/api/v1/items?category_id={category.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_item(self, client, admin_headers, item):
        resp = client.get(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == item.id

    def test_get_item_not_found(self, client, admin_headers):
        resp = client.get("/api/v1/items/9999", headers=admin_headers)
        assert resp.status_code == 404

    def test_update_item(self, client, admin_headers, item):
        resp = client.patch(f"/api/v1/items/{item.id}", json={
            "name": "Updated Item",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Item"

    def test_delete_item(self, client, admin_headers, item):
        resp = client.delete(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_item_with_inventory_blocked(self, client, admin_headers, inventory_record, item):
        resp = client.delete(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp.status_code == 400

    def test_create_item_teacher_forbidden(self, client, teacher_headers, category):
        resp = client.post("/api/v1/items", json={
            "name": "Bad", "category_id": category.id,
        }, headers=teacher_headers)
        assert resp.status_code == 403

    def test_teacher_can_list_items(self, client, teacher_headers, item):
        resp = client.get("/api/v1/items", headers=teacher_headers)
        assert resp.status_code == 200


class TestItemSorting:
    def test_sort_items_by_name_asc(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Scissors", "Glue Sticks", "Markers"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names)

    def test_sort_items_by_name_desc(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Scissors", "Glue Sticks", "Markers"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?sort_by=name&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names, reverse=True)

    def test_sort_items_with_search(self, client, admin_headers, category, db):
        from app.models.item import Item
        for name in ["Red Paint", "Red Markers", "Red Paper"]:
            db.add(Item(name=name, category_id=category.id, unit_of_measure="unit"))
        db.commit()
        resp = client.get("/api/v1/items?search=Red&sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [it["name"] for it in resp.json()["items"]]
        assert names == sorted(names)
        assert all("Red" in n for n in names)


class TestItemImage:
    """Tests for item image upload and deletion."""

    @staticmethod
    def _make_jpeg_bytes():
        """Minimal valid JPEG bytes."""
        return b"\xff\xd8\xff\xe0" + b"\x00" * 100

    def _setup_upload_dir(self, tmp_path, monkeypatch):
        upload_dir = str(tmp_path / "uploads")
        import os
        os.makedirs(upload_dir, exist_ok=True)
        from app.config import settings
        monkeypatch.setattr(settings, "upload_dir", upload_dir)
        return upload_dir

    def test_upload_image(self, client, admin_headers, item, tmp_path, monkeypatch):
        upload_dir = self._setup_upload_dir(tmp_path, monkeypatch)
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("test.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["image_url"] is not None
        assert data["image_url"].startswith("/api/v1/uploads/item_")
        # Verify file exists on disk
        import os
        filename = data["image_url"].split("/")[-1]
        assert os.path.exists(os.path.join(upload_dir, filename))

    def test_upload_image_replaces_existing(self, client, admin_headers, item, tmp_path, monkeypatch):
        upload_dir = self._setup_upload_dir(tmp_path, monkeypatch)
        # Upload first image
        resp1 = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("a.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        old_filename = resp1.json()["image_url"].split("/")[-1]
        # Upload replacement
        resp2 = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("b.png", b"\x89PNG\r\n\x1a\n" + b"\x00" * 100, "image/png")},
            headers=admin_headers,
        )
        assert resp2.status_code == 200
        new_filename = resp2.json()["image_url"].split("/")[-1]
        assert new_filename != old_filename
        import os
        assert not os.path.exists(os.path.join(upload_dir, old_filename))
        assert os.path.exists(os.path.join(upload_dir, new_filename))

    def test_upload_image_invalid_type(self, client, admin_headers, item, tmp_path, monkeypatch):
        self._setup_upload_dir(tmp_path, monkeypatch)
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("test.txt", b"hello", "text/plain")},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "Invalid image type" in resp.json()["detail"]

    def test_upload_image_too_large(self, client, admin_headers, item, tmp_path, monkeypatch):
        self._setup_upload_dir(tmp_path, monkeypatch)
        monkeypatch.setattr("app.config.settings.max_image_size_mb", 0)  # 0 MB = reject everything
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("big.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"]

    def test_upload_image_item_not_found(self, client, admin_headers, tmp_path, monkeypatch):
        self._setup_upload_dir(tmp_path, monkeypatch)
        resp = client.post(
            "/api/v1/items/9999/image",
            files={"file": ("test.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_upload_image_teacher_forbidden(self, client, teacher_headers, item, tmp_path, monkeypatch):
        self._setup_upload_dir(tmp_path, monkeypatch)
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("test.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=teacher_headers,
        )
        assert resp.status_code == 403

    def test_delete_image(self, client, admin_headers, item, tmp_path, monkeypatch):
        upload_dir = self._setup_upload_dir(tmp_path, monkeypatch)
        # Upload first
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("test.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        filename = resp.json()["image_url"].split("/")[-1]
        # Delete
        resp2 = client.delete(f"/api/v1/items/{item.id}/image", headers=admin_headers)
        assert resp2.status_code == 204
        import os
        assert not os.path.exists(os.path.join(upload_dir, filename))
        # Verify item no longer has image_url
        resp3 = client.get(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp3.json()["image_url"] is None

    def test_delete_image_when_none(self, client, admin_headers, item, tmp_path, monkeypatch):
        self._setup_upload_dir(tmp_path, monkeypatch)
        resp = client.delete(f"/api/v1/items/{item.id}/image", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_item_removes_image_file(self, client, admin_headers, item, tmp_path, monkeypatch):
        upload_dir = self._setup_upload_dir(tmp_path, monkeypatch)
        # Upload image
        resp = client.post(
            f"/api/v1/items/{item.id}/image",
            files={"file": ("test.jpg", self._make_jpeg_bytes(), "image/jpeg")},
            headers=admin_headers,
        )
        filename = resp.json()["image_url"].split("/")[-1]
        # Delete the item itself
        resp2 = client.delete(f"/api/v1/items/{item.id}", headers=admin_headers)
        assert resp2.status_code == 204
        import os
        assert not os.path.exists(os.path.join(upload_dir, filename))

    def test_image_url_in_list_response(self, client, admin_headers, item):
        resp = client.get("/api/v1/items", headers=admin_headers)
        assert resp.status_code == 200
        for it in resp.json()["items"]:
            assert "image_url" in it
