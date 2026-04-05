import io
import json
from unittest.mock import MagicMock, patch

import pytest

from app.models import Category


# Minimal valid JPEG (SOI + APP0 + EOI)
TINY_JPEG = bytes([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
    0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xD9,
])


@pytest.fixture
def physics_categories(db):
    """Create the standard physics lab categories."""
    names = [
        "Mechanics",
        "Optics",
        "Electricity & Magnetism",
        "Waves & Sound",
        "Thermodynamics",
        "Measurement & Tools",
        "General Lab Equipment",
    ]
    cats = []
    for name in names:
        cat = Category(name=name)
        db.add(cat)
        cats.append(cat)
    db.commit()
    for cat in cats:
        db.refresh(cat)
    return cats


def _upload_file(content=TINY_JPEG, filename="photo.jpg", content_type="image/jpeg"):
    return ("file", (filename, io.BytesIO(content), content_type))


def _mock_anthropic_response(data: dict):
    """Create a mock Anthropic messages.create response."""
    mock_content = MagicMock()
    mock_content.text = json.dumps(data)
    mock_message = MagicMock()
    mock_message.content = [mock_content]
    return mock_message


class TestIdentifyNoAuth:
    def test_returns_401_without_token(self, client):
        resp = client.post("/api/v1/items/identify", files=[_upload_file()])
        assert resp.status_code == 401


class TestIdentifyNoApiKey:
    def test_returns_503_when_key_empty(self, client, admin_headers, db):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            mock_settings.max_image_size_mb = 5
            resp = client.post(
                "/api/v1/items/identify",
                headers=admin_headers,
                files=[_upload_file()],
            )
        assert resp.status_code == 503
        assert "not configured" in resp.json()["detail"]


class TestIdentifyValidation:
    def test_rejects_invalid_file_type(self, client, admin_headers):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.max_image_size_mb = 5
            resp = client.post(
                "/api/v1/items/identify",
                headers=admin_headers,
                files=[_upload_file(b"not an image", "test.txt", "text/plain")],
            )
        assert resp.status_code == 400
        assert "Invalid image type" in resp.json()["detail"]

    def test_rejects_oversized_file(self, client, admin_headers):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "test-key"
            mock_settings.max_image_size_mb = 0  # 0 MB limit
            resp = client.post(
                "/api/v1/items/identify",
                headers=admin_headers,
                files=[_upload_file()],
            )
        assert resp.status_code == 400
        assert "too large" in resp.json()["detail"]


class TestIdentifyMockMode:
    def test_returns_canned_response(self, client, admin_headers, physics_categories):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "mock"
            mock_settings.max_image_size_mb = 5
            resp = client.post(
                "/api/v1/items/identify",
                headers=admin_headers,
                files=[_upload_file()],
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Unknown Lab Equipment"
        assert data["confidence"] == "medium"
        assert data["category_name"] == "General Lab Equipment"
        assert data["category_id"] is not None


class TestIdentifySuccess:
    def test_returns_suggestion_with_matched_category(self, client, admin_headers, physics_categories):
        ai_response = {
            "name": "Vernier Caliper",
            "description": "A precision measurement instrument for internal and external dimensions.",
            "category_name": "Measurement & Tools",
            "unit_of_measure": "unit",
            "confidence": "high",
            "reasoning": "The distinctive sliding jaw and vernier scale are clearly visible.",
        }
        mock_msg = _mock_anthropic_response(ai_response)

        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "real-key"
            mock_settings.max_image_size_mb = 5
            with patch("anthropic.Anthropic") as MockClient:
                MockClient.return_value.messages.create.return_value = mock_msg
                resp = client.post(
                    "/api/v1/items/identify",
                    headers=admin_headers,
                    files=[_upload_file()],
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "Vernier Caliper"
        assert data["confidence"] == "high"
        assert data["category_name"] == "Measurement & Tools"
        # Should resolve to the real category ID
        mt_cat = next(c for c in physics_categories if c.name == "Measurement & Tools")
        assert data["category_id"] == mt_cat.id

    def test_handles_markdown_wrapped_response(self, client, admin_headers, physics_categories):
        ai_response = {
            "name": "Spring Scale",
            "description": "Measures force using Hooke's law.",
            "category_name": "Mechanics",
            "unit_of_measure": "unit",
            "confidence": "high",
            "reasoning": "Spring mechanism with graduated scale visible.",
        }
        mock_content = MagicMock()
        mock_content.text = f"```json\n{json.dumps(ai_response)}\n```"
        mock_message = MagicMock()
        mock_message.content = [mock_content]

        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "real-key"
            mock_settings.max_image_size_mb = 5
            with patch("anthropic.Anthropic") as MockClient:
                MockClient.return_value.messages.create.return_value = mock_message
                resp = client.post(
                    "/api/v1/items/identify",
                    headers=admin_headers,
                    files=[_upload_file()],
                )

        assert resp.status_code == 200
        assert resp.json()["name"] == "Spring Scale"


class TestIdentifyLowConfidence:
    def test_low_confidence_passes_through(self, client, admin_headers, physics_categories):
        ai_response = {
            "name": "Unknown Metal Object",
            "description": "A metal piece that could be a bracket or clamp.",
            "category_name": "General Lab Equipment",
            "unit_of_measure": "unit",
            "confidence": "low",
            "reasoning": "Image is unclear and object is partially obscured.",
        }
        mock_msg = _mock_anthropic_response(ai_response)

        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "real-key"
            mock_settings.max_image_size_mb = 5
            with patch("anthropic.Anthropic") as MockClient:
                MockClient.return_value.messages.create.return_value = mock_msg
                resp = client.post(
                    "/api/v1/items/identify",
                    headers=admin_headers,
                    files=[_upload_file()],
                )

        assert resp.status_code == 200
        assert resp.json()["confidence"] == "low"


class TestIdentifyCategoryFallback:
    def test_unknown_category_falls_back(self, client, admin_headers, physics_categories):
        ai_response = {
            "name": "Exotic Device",
            "description": "Some device.",
            "category_name": "Quantum Physics",  # doesn't exist
            "unit_of_measure": "unit",
            "confidence": "medium",
            "reasoning": "Best guess.",
        }
        mock_msg = _mock_anthropic_response(ai_response)

        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "real-key"
            mock_settings.max_image_size_mb = 5
            with patch("anthropic.Anthropic") as MockClient:
                MockClient.return_value.messages.create.return_value = mock_msg
                resp = client.post(
                    "/api/v1/items/identify",
                    headers=admin_headers,
                    files=[_upload_file()],
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["category_name"] == "General Lab Equipment"


class TestIdentifyApiError:
    def test_anthropic_error_returns_502(self, client, admin_headers, physics_categories):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "real-key"
            mock_settings.max_image_size_mb = 5
            with patch("anthropic.Anthropic") as MockClient:
                MockClient.return_value.messages.create.side_effect = Exception("API timeout")
                resp = client.post(
                    "/api/v1/items/identify",
                    headers=admin_headers,
                    files=[_upload_file()],
                )

        assert resp.status_code == 502
        assert "unavailable" in resp.json()["detail"]


class TestFeaturesEndpoint:
    def test_features_with_key_configured(self, client):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = "some-key"
            resp = client.get("/api/v1/features")
        assert resp.status_code == 200
        assert resp.json()["identify_item"] is True

    def test_features_without_key(self, client):
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            resp = client.get("/api/v1/features")
        assert resp.status_code == 200
        assert resp.json()["identify_item"] is False

    def test_features_no_auth_required(self, client):
        """Features endpoint should work without authentication."""
        with patch("app.routers.identify.settings") as mock_settings:
            mock_settings.anthropic_api_key = ""
            resp = client.get("/api/v1/features")
        assert resp.status_code == 200
