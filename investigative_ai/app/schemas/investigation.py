# app/schemas/investigation.py
from typing import List, Optional, Annotated, Any
from pydantic import BaseModel, Field, HttpUrl, conlist, validator, ConfigDict, BeforeValidator
from datetime import datetime
from bson import ObjectId

# Helper to safely convert ObjectId to string when reading from database models
def object_id_to_str(v: Any) -> str:
    if isinstance(v, ObjectId):
        return str(v)
    return str(v) if v is not None else v

PyObjectIdStr = Annotated[str, BeforeValidator(object_id_to_str)]


class SteeringControlsSchema(BaseModel):
    bias_angle: str = Field(..., description="Focus area (geopolitical, ethical, …)")
    tone_selector: str = Field(..., description="investigative | critical | objective | speculative")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    context_window_depth: int = Field(default=5, ge=1)

    model_config = ConfigDict(from_attributes=True)  # <-- Add this


class InvestigationCreateSchema(BaseModel):
    investigation_title: str = Field(..., max_length=200)
    target_trend: str = Field(..., max_length=200)
    raw_notes: str = Field(..., description="Free‑form notes or interview transcripts")
    source_urls: Optional[conlist(HttpUrl)] = Field(default_factory=list) # type: ignore
    external_info_prompt: Optional[str] = Field(None)

    steering_controls: SteeringControlsSchema

    # @validator("raw_notes", "external_info_prompt", pre=True, always=True)
    # def strip_whitespace(cls, v):
    #     return v.strip() if isinstance(v, str) else v
    model_config = ConfigDict(from_attributes=True)  # <-- Add this too


class InvestigationResponseSchema(BaseModel):
    # Map MongoDB's '_id' or Beanie's 'id' to a string
    id: PyObjectIdStr = Field(..., alias="_id")
    title: str
    target_trend: str
    steering: SteeringControlsSchema
    generated_report: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Pydantic v2 Model Config
    model_config = ConfigDict(
        from_attributes=True,         # Replaces orm_mode = True
        populate_by_name=True,        # Replaces allow_population_by_field_name = True
    )
