# app/models.py
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from beanie import Document, Indexed
from pydantic import BaseModel, Field, ConfigDict

class SteeringControls(BaseModel):
    bias_angle: str
    tone_selector: str
    temperature: float = Field(ge=0.0, le=1.0)
    top_p: float = Field(ge=0.0, le=1.0)
    context_window_depth: int = Field(gt=0)


class InvestigationFields(BaseModel):
    investigation_title: str
    target_trend: str
    raw_notes: str
    source_urls: List[str] = Field(default_factory=list)
    external_info_prompt: str = ""
    steering_controls: SteeringControls


class Investigation(Document):
    # Core fields coming from the POST request
    investigation_title: str = Indexed()
    target_trend: str
    raw_notes: str
    source_urls: Optional[List[str]] = None
    external_info_prompt: Optional[str] = None
    steering_controls: SteeringControls  # Make sure this is also a Pydantic model

    # --- AI‑generated fields -------------------------------------------------
    transcript: Dict[str, Any]
    transcript_summary: Optional[str] = None
    extracted_fields: Optional[Dict[str, Any]] = None

    # Meta
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "transcripts_investigations"  # <-- This works perfectly!

    model_config = ConfigDict(extra="allow")