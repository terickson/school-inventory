import base64
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.dependencies.auth import get_current_user
from app.models.item import Category
from app.models.user import User
from app.schemas.identify import FeaturesResponse, IdentifySuggestion

logger = logging.getLogger(__name__)

router = APIRouter(tags=["identify"])

ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]

SYSTEM_PROMPT = """You are an expert physics laboratory equipment identifier for a school inventory system.
A teacher has photographed an unknown piece of lab equipment and needs help identifying it.

Analyze the image and provide your identification as JSON with these exact fields:
{{
  "name": "Concise equipment name (e.g., 'Vernier Caliper', 'Convex Lens 50mm')",
  "description": "Brief description, what it's used for, notable features. 1-2 sentences.",
  "category_name": "One of: {categories}",
  "unit_of_measure": "One of: unit, set, pair, pack, kit, roll, spool, bag, pad, box",
  "confidence": "high, medium, or low",
  "reasoning": "One sentence explaining your identification"
}}

Guidelines:
- Use standard physics lab terminology
- Choose the most specific category
- If uncertain, still provide best guess with confidence "low"
- Keep name concise but specific
- No brand names unless essential

Respond with ONLY the JSON object, no other text."""

MOCK_RESPONSE = IdentifySuggestion(
    name="Unknown Lab Equipment",
    description="An unidentified piece of physics laboratory equipment. Please review and update the name and description.",
    category_name="General Lab Equipment",
    category_id=None,
    unit_of_measure="unit",
    confidence="medium",
    reasoning="This is a mock identification for testing purposes.",
)


def _match_category(categories: list[Category], ai_category_name: str) -> Category | None:
    """Match AI-suggested category name to an existing category."""
    # Exact match (case-insensitive)
    for cat in categories:
        if cat.name.lower() == ai_category_name.lower():
            return cat
    # Partial match
    for cat in categories:
        if ai_category_name.lower() in cat.name.lower() or cat.name.lower() in ai_category_name.lower():
            return cat
    # Fallback to General Lab Equipment
    for cat in categories:
        if cat.name == "General Lab Equipment":
            return cat
    # Last resort: first category
    return categories[0] if categories else None


def _parse_ai_response(text: str) -> dict:
    """Parse JSON from AI response, stripping markdown code fences if present."""
    cleaned = text.strip()
    if cleaned.startswith("```"):
        # Remove opening fence (with optional language tag)
        first_newline = cleaned.index("\n")
        cleaned = cleaned[first_newline + 1 :]
    if cleaned.endswith("```"):
        cleaned = cleaned[: -3]
    return json.loads(cleaned.strip())


@router.get(
    "/features",
    response_model=FeaturesResponse,
    summary="Get available features",
    description="Returns which optional features are enabled on this server.",
)
def get_features():
    return FeaturesResponse(
        identify_item=bool(settings.anthropic_api_key),
    )


@router.post(
    "/items/identify",
    response_model=IdentifySuggestion,
    summary="Identify item from image",
    description="Upload a photo of unknown equipment to get an AI-powered identification suggestion.",
)
def identify_item(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI identification is not configured. Set ANTHROPIC_API_KEY to enable this feature.",
        )

    # Validate content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image type '{file.content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Read and validate file size
    contents = file.file.read()
    max_bytes = settings.max_image_size_mb * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Image too large. Maximum size is {settings.max_image_size_mb} MB.",
        )

    # Get categories for prompt and matching
    categories = db.query(Category).all()
    category_names = ", ".join(c.name for c in categories) if categories else "General Lab Equipment"

    # Mock mode for testing
    if settings.anthropic_api_key == "mock":
        mock = MOCK_RESPONSE.model_copy()
        matched = _match_category(categories, mock.category_name)
        if matched:
            mock.category_id = matched.id
        return mock

    # Call Anthropic Vision API
    try:
        import anthropic

        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        image_b64 = base64.b64encode(contents).decode("utf-8")
        media_type = file.content_type

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": "Please identify this physics lab equipment.",
                        },
                    ],
                }
            ],
            system=SYSTEM_PROMPT.format(categories=category_names),
        )

        ai_text = message.content[0].text
        ai_data = _parse_ai_response(ai_text)

    except json.JSONDecodeError as e:
        logger.error("Failed to parse AI response: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI returned an invalid response. Please try again.",
        )
    except Exception as e:
        logger.error("Anthropic API error: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI service temporarily unavailable. Please try again later.",
        )

    # Match category
    ai_category_name = ai_data.get("category_name", "General Lab Equipment")
    matched = _match_category(categories, ai_category_name)

    return IdentifySuggestion(
        name=ai_data.get("name", "Unknown Item"),
        description=ai_data.get("description", ""),
        category_name=matched.name if matched else ai_category_name,
        category_id=matched.id if matched else None,
        unit_of_measure=ai_data.get("unit_of_measure", "unit"),
        confidence=ai_data.get("confidence", "low"),
        reasoning=ai_data.get("reasoning", ""),
    )
