# app/models/investigation.py
from beanie import Document, Indexed, Link
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from bson import ObjectId


class SteeringControls(BaseModel):
    bias_angle: str = Field(..., description="e.g. geopolitical, ethical, financial, technical")
    tone_selector: str = Field(..., description="investigative | critical | objective | speculative")
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.9, ge=0.0, le=1.0)
    context_window_depth: int = Field(default=5, ge=1)


class Investigation(Document):
    title: str = Field(..., description="Human‑readable investigation title")
    target_trend: str = Field(..., description="Topic / trend we are investigating")
    raw_notes: str = Field(..., description="User‑provided raw notes / transcripts")
    source_urls: List[str] = Field(default_factory=list)
    external_info_prompt: Optional[str] = Field(
        None, description="Free‑text field for breaking news, leaks, etc."
    )
    steering: SteeringControls = Field(...)
    generated_report: Optional[str] = Field(None, description="LLM output after generation")
    embedding: Optional[List[float]] = Field(
        None, description="Sentence‑Transformer vector, stored for similarity search"
    )
    # timestamps – Beanie automatically updates `created_at`/`updated_at`
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "investigations"
        indexes = [
            # fast filter on trend + bias angle
            [("target_trend", 1), ("steering.bias_angle", 1)]
        ]

    class Config:
        # Let Pydantic return ObjectId as str for JSON serialisation
        json_encoders = {ObjectId: str}
