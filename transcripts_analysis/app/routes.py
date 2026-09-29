# app/routes.py
import logging
import httpx
from fastapi import APIRouter, HTTPException, Query, status
from typing import List, Optional

from app.models import Investigation
from app.services import Transcript, SpacyPreprocessor, Summariser, OllamaClient

router = APIRouter(prefix="/api/v1/investigations", tags=["Investigations"])
log = logging.getLogger(__name__)

# --------------------------------------------------------------------------- #
# Helper to construct an Investigation document from a transcript
# --------------------------------------------------------------------------- #
async def _build_investigation(video_id: str) -> Investigation:
    raw_transcript = Transcript(video_id).get()
    if not raw_transcript or not raw_transcript.get("text", "").strip():
        raise HTTPException(status_code=400, detail="Could not retrieve a transcript for this video")

    cleaned_transcript = SpacyPreprocessor.clean_text(raw_transcript["text"])
    transcript_data = {"video_id": video_id, "text": cleaned_transcript}
    transcript_summary = Summariser.summarise(cleaned_transcript)

    try:
        extracted = await OllamaClient().extract_fields(cleaned_transcript)
    except (httpx.HTTPError, ValueError) as exc:
        log.exception("Could not generate investigation fields from the transcript")
        raise HTTPException(
            status_code=502,
            detail="Could not generate valid investigation fields from the transcript",
        ) from exc

    extracted_fields = extracted.model_dump()
    return Investigation(
        **extracted_fields,
        transcript=transcript_data,
        transcript_summary=transcript_summary,
        extracted_fields=extracted_fields,
    )


# --------------------------------------------------------------------------- #
# POST – create an investigation from a YouTube video id
# --------------------------------------------------------------------------- #
@router.post("/", response_model=Investigation, status_code=status.HTTP_201_CREATED)
async def create_investigation(
    video_id: str = Query(
        ...,
        min_length=11,
        max_length=11,
        pattern=r"^[A-Za-z0-9_-]{11}$",
        description="YouTube video id used to fetch the transcript and generate the investigation fields.",
    ),
):
    """
    Create an investigation from the video's transcript. No request body is required.
    """
    investigation = await _build_investigation(video_id)
    await investigation.insert()
    return investigation


# --------------------------------------------------------------------------- #
# GET – search (key, limit, offset)
# --------------------------------------------------------------------------- #
@router.get("/", response_model=List[Investigation])
async def search_investigations(
    key: Optional[str] = Query(None, description="Free‑text search on title, trend, notes"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    """
    Simple text search. If `key` is omitted the endpoint behaves like a paginated list.
    """
    collection = Investigation.get_motor_collection()
    query = {}
    if key:
        query["$text"] = {"$search": key}
    cursor = collection.find(query).skip(offset).limit(limit).sort("created_at", -1)
    docs = await cursor.to_list(length=limit)
    return [Investigation(**doc) for doc in docs]

# --------------------------------------------------------------------------- #
# GET – latest N (default 5)
# --------------------------------------------------------------------------- #
@router.get("/latest", response_model=List[Investigation])
async def get_latest(limit: int = Query(5, ge=1, le=50)):
    latest = await Investigation.find_all().sort("-created_at").limit(limit).to_list()
    return latest

# --------------------------------------------------------------------------- #
# GET – by id
# --------------------------------------------------------------------------- #
@router.get("/{investigation_id}", response_model=Investigation)
async def get_by_id(investigation_id: str):
    investigation = await Investigation.get(investigation_id)
    if not investigation:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return investigation


