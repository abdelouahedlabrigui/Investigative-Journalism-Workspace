# app/models/evidence_log.py
from beanie import Document, PydanticObjectId
from datetime import datetime
from typing import List
from pydantic import Field


class EvidenceLog(Document):
    investigation_id: PydanticObjectId = Field(
        ..., description="Reference to parent Investigation"
    )
    source_type: str = Field(..., description="User Input | Web Scrape | Ollama Output")
    extracted_entities: List[str] = Field(default_factory=list)
    content: str = Field(..., description="Raw chunk that produced the entities")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "evidence_logs"

    class Config:
        json_encoders = {PydanticObjectId: str}
