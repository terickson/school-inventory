from pydantic import BaseModel


class IdentifySuggestion(BaseModel):
    name: str
    description: str
    category_name: str
    category_id: int | None = None
    unit_of_measure: str = "unit"
    confidence: str  # "high", "medium", or "low"
    reasoning: str


class FeaturesResponse(BaseModel):
    identify_item: bool
