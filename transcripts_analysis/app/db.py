# app/db.py
import os
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie, Document
from dotenv import load_dotenv

# load_dotenv("./.env")


client: AsyncIOMotorClient | None = None

async def init_db():
    """Initialise Beanie (Mongo ODM) and create indexes."""
    from .models import Investigation  # Imported lazily to avoid circular deps

    global client
    mongo_url = os.getenv("MONGODB_URL", "mongodb://admin:supersecretpassword@10.42.0.243:27017/investigate_ai?authSource=admin")
    client = AsyncIOMotorClient(mongo_url)

    # FIXED: Use dictionary lookup or client.investigations_db WITHOUT parentheses
    await init_beanie(database=client["investigate_ai"], document_models=[Investigation])

    # Text index for simple full‑text search
    await Investigation.get_motor_collection().create_index(
        [("investigation_title", "text"),
         ("target_trend", "text"),
         ("raw_notes", "text")],
        background=True,
        name="investigations_text_index",
    )