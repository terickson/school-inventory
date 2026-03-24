class TestLocatorEndpoints:
    def test_create_locator(self, client, admin_headers):
        resp = client.post("/api/v1/locators", json={
            "name": "Supply Closet",
            "description": "Main supply closet",
        }, headers=admin_headers)
        assert resp.status_code == 201
        assert resp.json()["name"] == "Supply Closet"

    def test_list_locators_admin(self, client, admin_headers, locator):
        resp = client.get("/api/v1/locators", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_list_locators_teacher_only_own(self, client, teacher_headers, locator):
        # Teacher should not see admin's locators
        resp = client.get("/api/v1/locators", headers=teacher_headers)
        assert resp.status_code == 200
        assert resp.json()["total"] == 0

    def test_get_locator(self, client, admin_headers, locator):
        resp = client.get(f"/api/v1/locators/{locator.id}", headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == locator.id

    def test_get_locator_forbidden(self, client, teacher_headers, locator):
        resp = client.get(f"/api/v1/locators/{locator.id}", headers=teacher_headers)
        assert resp.status_code == 403

    def test_update_locator(self, client, admin_headers, locator):
        resp = client.patch(f"/api/v1/locators/{locator.id}", json={
            "name": "Updated Closet",
        }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Closet"

    def test_delete_locator(self, client, admin_headers, locator):
        resp = client.delete(f"/api/v1/locators/{locator.id}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_locator_with_inventory_blocked(self, client, admin_headers, inventory_record):
        resp = client.delete(f"/api/v1/locators/{inventory_record.locator_id}", headers=admin_headers)
        assert resp.status_code == 400

    def test_delete_locator_teacher_forbidden(self, client, teacher_headers, locator):
        resp = client.delete(f"/api/v1/locators/{locator.id}", headers=teacher_headers)
        assert resp.status_code == 403


class TestSublocatorEndpoints:
    def test_create_sublocator(self, client, admin_headers, locator):
        resp = client.post(
            f"/api/v1/locators/{locator.id}/sublocators",
            json={"name": "Shelf 2", "description": "Second shelf"},
            headers=admin_headers,
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "Shelf 2"

    def test_list_sublocators(self, client, admin_headers, locator, sublocator):
        resp = client.get(
            f"/api/v1/locators/{locator.id}/sublocators",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["total"] >= 1

    def test_get_sublocator(self, client, admin_headers, locator, sublocator):
        resp = client.get(
            f"/api/v1/locators/{locator.id}/sublocators/{sublocator.id}",
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == sublocator.id

    def test_update_sublocator(self, client, admin_headers, locator, sublocator):
        resp = client.patch(
            f"/api/v1/locators/{locator.id}/sublocators/{sublocator.id}",
            json={"name": "Updated Shelf"},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["name"] == "Updated Shelf"

    def test_delete_sublocator(self, client, admin_headers, locator, sublocator):
        resp = client.delete(
            f"/api/v1/locators/{locator.id}/sublocators/{sublocator.id}",
            headers=admin_headers,
        )
        assert resp.status_code == 204

    def test_delete_sublocator_with_inventory_blocked(self, client, admin_headers, locator, inventory_record):
        resp = client.delete(
            f"/api/v1/locators/{locator.id}/sublocators/{inventory_record.sublocator_id}",
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_sublocator_not_found(self, client, admin_headers, locator):
        resp = client.get(
            f"/api/v1/locators/{locator.id}/sublocators/9999",
            headers=admin_headers,
        )
        assert resp.status_code == 404


class TestLocatorSorting:
    def test_sort_locators_by_name_asc(self, client, admin_headers, admin_user, db):
        from app.models.locator import Locator
        for name in ["Zulu Room", "Alpha Room", "Mike Room"]:
            db.add(Locator(name=name, user_id=admin_user.id))
        db.commit()
        resp = client.get("/api/v1/locators?sort_by=name&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        names = [loc["name"] for loc in resp.json()["items"]]
        assert names == sorted(names)

    def test_sort_locators_by_name_desc(self, client, admin_headers, admin_user, db):
        from app.models.locator import Locator
        for name in ["Zulu Room", "Alpha Room", "Mike Room"]:
            db.add(Locator(name=name, user_id=admin_user.id))
        db.commit()
        resp = client.get("/api/v1/locators?sort_by=name&sort_order=desc", headers=admin_headers)
        assert resp.status_code == 200
        names = [loc["name"] for loc in resp.json()["items"]]
        assert names == sorted(names, reverse=True)

    def test_sort_locators_by_created_at(self, client, admin_headers, admin_user, db):
        from app.models.locator import Locator
        for name in ["First", "Second", "Third"]:
            db.add(Locator(name=name, user_id=admin_user.id))
            db.commit()
        resp = client.get("/api/v1/locators?sort_by=created_at&sort_order=asc", headers=admin_headers)
        assert resp.status_code == 200
        items = resp.json()["items"]
        dates = [it["created_at"] for it in items]
        assert dates == sorted(dates)

    def test_sort_locators_invalid_column_ignored(self, client, admin_headers, locator):
        resp = client.get("/api/v1/locators?sort_by=bogus", headers=admin_headers)
        assert resp.status_code == 200
