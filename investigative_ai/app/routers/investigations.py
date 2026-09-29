# app/routers/investigations.py
import json
import logging
from fastapi import APIRouter, Body, HTTPException, Depends, status, Request, Query
from fastapi.responses import StreamingResponse
from beanie import PydanticObjectId
from typing import List, Dict, Any, Optional

from app.schemas.investigation import (
    InvestigationCreateSchema,
    InvestigationResponseSchema,
    SteeringControlsSchema,
)
from app.services import investigation as inv_service

router = APIRouter(prefix="/api/v1/investigations", tags=["Investigations"])
log = logging.getLogger(__name__)

# ----------------------------------------------------------------------
#   1️⃣ CREATE INVESTIGATION
# ----------------------------------------------------------------------
@router.post(
    "/",
    response_model=InvestigationResponseSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new investigation (metadata + raw notes)",
    description=(
        "The UI must send a JSON body that matches `InvestigationCreateSchema`. "
        "All fields are validated server‑side before any LLM call is made. "
        "On success the response contains the newly generated `id` that the UI "
        "will store locally (e.g., Redux store) and later use for streaming."
    ),
)
async def create_investigation(payload: InvestigationCreateSchema = Body(...)):
    try:
        doc = await inv_service.create_investigation(payload.model_dump(mode="json"))
    except Exception as exc:
        log.exception("Failed to create investigation")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(exc),
        )
    return InvestigationResponseSchema.from_orm(doc)


@router.get(
    "/search",
    response_model=List[InvestigationResponseSchema],
    summary="List investigations with search, offset, and limit",
)
async def list_investigations(
    search: Optional[str] = Query(None, description="Keyword to search in title or target trend"),
    skip: int = Query(0, ge=0, description="Number of records to skip (offset)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of records to return (limit)"),
):
    # 1. Build the query filter dynamically if a search keyword is provided
    query = {}
    if search:
        # Case-insensitive regex search across relevant text fields
        query = {
            "$or": [
                {"investigation_title": {"$regex": search, "$options": "i"}},
                {"target_trend": {"$regex": search, "$options": "i"}}
            ]
        }

    # 2. Execute the Beanie query with filtering, sorting, skipping, and limiting
    docs = await inv_service.Investigation.find(query)\
        .sort("-created_at")\
        .skip(skip)\
        .limit(limit)\
        .to_list()

    # 3. Convert database models to response schemas using Pydantic v2 model_validate
    return [InvestigationResponseSchema.model_validate(d) for d in docs]

@router.delete(
    "/{investigation_id}",
    status_code=204,
    summary="Delete a single investigation by its ObjectId",
)
async def delete_investigation(investigation_id: str):
    doc = await inv_service.Investigation.get(PydanticObjectId(investigation_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    await doc.delete()
    return None

# ----------------------------------------------------------------------
#   2️⃣ GET ONE (for UI preview / edit)
# ----------------------------------------------------------------------
@router.get(
    "/{investigation_id}",
    response_model=InvestigationResponseSchema,
    summary="Fetch a single investigation by its ObjectId",
)
async def get_investigation(investigation_id: str):
    doc = await inv_service.Investigation.get(PydanticObjectId(investigation_id))
    if not doc:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return InvestigationResponseSchema.from_orm(doc)




# ----------------------------------------------------------------------
#   3️⃣ STREAM GENERATION (SSE)
# ----------------------------------------------------------------------
@router.post(
    "/{investigation_id}/stream",
    summary="Start LLM generation and stream tokens via Server‑Sent Events",
    description=(
        "The front‑end should open an EventSource to this URL. "
        "Each server‑sent event payload is a tiny JSON: "
        "`{\"token\": \"...\", \"is_finished\": false}`. "
        "When `is_finished` becomes true, close the EventSource. "
        "If the user aborts (e.g., clicks a Cancel button), the UI must abort "
        "the request – FastAPI will stop the async generator automatically."
    ),
    response_class=StreamingResponse,
)
async def stream_report(investigation_id: str):
    try:
        generator = inv_service.generate_report_stream(PydanticObjectId(investigation_id))
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as exc:
        log.exception("Error launching Ollama stream")
        raise HTTPException(
            status_code=500, detail="Failed to start generation stream"
        )

    async def event_generator():
        # SSE format: `data: <json>\n\n`
        async for token_json in generator:
            yield f"data: {token_json}\n\n"

        # Final event to tell UI we are done (in case Ollama didn't send a 'done')
        yield f'data: {json.dumps({"token": "", "is_finished": True})}\n\n'

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ----------------------------------------------------------------------
#   4️⃣ LIST RECENT INVESTIGATIONS (for UI dashboard)
# ----------------------------------------------------------------------
@router.get(
    "/",
    response_model=List[InvestigationResponseSchema],
    summary="List the most recent investigations (limit=20 by default)",
)
async def list_recent(limit: int = 20):
    docs = await inv_service.Investigation.find(
        sort=[("-created_at", 1)], limit=limit
    ).to_list()
    return [InvestigationResponseSchema.from_orm(d) for d in docs]

