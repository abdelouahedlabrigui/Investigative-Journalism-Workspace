# app/main.py
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import investigations
from app.models.investigation import Investigation
from app.models.evidence_log import EvidenceLog
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

log = logging.getLogger("uvicorn.error")

app = FastAPI(
    title="Investigative Journalism AI Trends Platform",
    version="0.1.0",
    description=(
        "FastAPI micro‑service that ingests investigative notes, runs Hugging Face "
        "NLP pipelines, pulls historical context, and streams LLM‑generated reports "
        "from Ollama Cloud."
    ),
)

# Allow your Vite frontend origin (and general local development)
# --------------------- CORS (frontend will hit this API) ---------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------- Register Routers -----------------------------------
app.include_router(investigations.router)

# ----------------------- Startup / shutdown --------------------------------
@app.on_event("startup")
async def on_startup():
    """Initialize MongoDB connection + Beanie document registration."""
    # 1. Create the Motor client using your connection string
    motor_client = AsyncIOMotorClient(settings.mongodb_uri.get_secret_value())
    client = await init_beanie(
        database=motor_client[settings.mongodb_db_name],
        document_models=[Investigation, EvidenceLog],
    )
    log.info("✅ Beanie connected to MongoDB")

@app.on_event("shutdown")
async def on_shutdown():
    log.info("🚪 Shutting down – any cleanup goes here")


import uvicorn
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000
    )