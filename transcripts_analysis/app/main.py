# app/main.py
import logging
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routes import router as investigation_router

log = logging.getLogger("uvicorn")
log.setLevel(logging.INFO)
handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))
log.addHandler(handler)

app = FastAPI(
    title="Investigations API",
    description="Create, store and search AI‑generated investigations from YouTube transcripts.",
    version="1.0.0",
)

# CORS – open for local dev / front‑ends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(investigation_router)


@app.on_event("startup")
async def on_startup():
    await init_db()
    log.info("✅ MongoDB connected, indexes created")

import uvicorn
if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8100
    )