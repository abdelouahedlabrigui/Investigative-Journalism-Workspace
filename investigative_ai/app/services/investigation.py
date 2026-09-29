# app/services/investigation.py
import logging
from datetime import datetime
from typing import List, Tuple, Dict, Any
import json

from beanie import PydanticObjectId
from app.models.investigation import Investigation, SteeringControls
from app.models.evidence_log import EvidenceLog
from app.services import nlp, ollama

logger = logging.getLogger(__name__)


# ----------------------------------------------------------------------
#   PUBLIC SERVICE FUNCTIONS – called by the router layer.
#   These functions hide all DB + AI details from the HTTP layer,
#   making unit‑testing trivial.
# ----------------------------------------------------------------------


async def create_investigation(payload: Dict[str, Any]) -> Investigation:
    """
    1️⃣ Store raw payload
    2️⃣ Embed the user’s raw notes + external info (if any)
    3️⃣ Extract entities for later UI display (store in EvidenceLog)
    4️⃣ Return the persisted Investigation document (without generated_report)
    """
    # ---- 1️⃣ Build DB doc -------------------------------------------------
    steering = SteeringControls(**payload["steering_controls"])
    investigation = Investigation(
        title=payload["investigation_title"],
        target_trend=payload["target_trend"],
        raw_notes=payload["raw_notes"],
        source_urls=payload.get("source_urls", []),
        external_info_prompt=payload.get("external_info_prompt"),
        steering=steering,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    await investigation.insert()

    # ---- 2️⃣ Embedding ----------------------------------------------------
    full_text = " ".join(
        filter(
            None,
            [investigation.raw_notes, investigation.external_info_prompt],
        )
    )
    investigation.embedding = nlp.embed_text(full_text)
    await investigation.save()  # persist embedding

    # ---- 3️⃣ Entity extraction & evidence log -----------------------------
    entities = nlp.extract_entities(full_text)
    evidence = EvidenceLog(
        investigation_id=investigation.id,
        source_type="User Input",
        extracted_entities=entities,
        content=full_text,
    )
    await evidence.insert()

    logger.info(f"Created investigation {investigation.id}")
    return investigation


async def get_similar_investigations(
    embedding: List[float], top_k: int = 5
) -> List[Tuple[Investigation, float]]:
    """
    Returns the *top_k* most similar investigations based on cosine similarity.
    """
    # Grab all embeddings – in a real‑world app you would use MongoDB Atlas
    # vector search or a dedicated vector DB like Qdrant/Weaviate.
    all_docs = await Investigation.find(
        Investigation.embedding != None,
        projection_model=Investigation,
    ).to_list()

    # Compute similarity locally
    similarities = [
        (doc, nlp.cosine_similarity(embedding, doc.embedding)) for doc in all_docs
    ]
    # Sort descending and slice
    similarities.sort(key=lambda x: x[1], reverse=True)
    return similarities[:top_k]


def build_system_prompt(investigation: Investigation) -> str:
    """
    System prompt that primes the LLM for investigative‑journalism style.
    Feel free to tweak the wording – the UI team does not need to know it.
    """
    return f"""You are an investigative journalist AI specialized in AI‑technology trends.
The report you generate must:
- Cite the **target trend**: {investigation.target_trend}
- Follow a **bias angle** of *{investigation.steering.bias_angle}* and a **tone** of *{investigation.steering.tone_selector}*.
- Use a clear structure: Overview → Key Findings → Evidence → Implications → Recommendations.
- Keep the language professional, data‑driven, and objective, unless the *tone_selector* requests a more critical style.

Do not hallucinate sources. If you need to reference an entity you discovered, embed it in brackets, e.g. [EntityName].
"""

def build_user_prompt(
    investigation: Investigation,
    historical_context: List[Tuple[str, List[float]]],
) -> str:
    """
    Combines user‑provided raw notes, external info and a few most relevant historical
    snippets (controlled by `context_window_depth`). Returns the final user‑prompt
    that goes after the system prompt.
    """
    # 1️⃣ Gather most relevant historical chunks
    depth = investigation.steering.context_window_depth
    # Grab embeddings of historical docs (already done in calling code)
    relevant_chunks = [chunk for chunk, _ in historical_context[:depth]]

    # 2️⃣ Build prompt
    prompt_parts = [
        f"### Investigation Title\n{investigation.title}\n",
        f"### Target Trend\n{investigation.target_trend}\n",
        "### User Notes & External Info\n",
        investigation.raw_notes or "",
        "\n",
        investigation.external_info_prompt or "",
        "\n",
        "### Historical Context (most similar past investigations)\n",
        "\n---\n".join(relevant_chunks) if relevant_chunks else "None",
        "\n\nWrite a concise investigative report using the above information.",
    ]
    return "\n".join(prompt_parts)


async def generate_report_stream(investigation_id: PydanticObjectId):
    """
    Core orchestration called by the `/stream` endpoint:
    1️⃣ Load the investigation.
    2️⃣ Retrieve *similar* past investigations (vector search) and embed them.
    3️⃣ Build system & user prompts.
    4️⃣ Call the Ollama streaming client.
    5️⃣ As tokens arrive, persist them incrementally (so a user can stop early
       and still keep the partial report).
    """
    investigation = await Investigation.get(investigation_id)
    if not investigation:
        raise ValueError("Investigation not found")

    # ------------------------------------------------------------------
    #   2️⃣ Vector similarity – get top N similar past investigations
    # ------------------------------------------------------------------
    similar = await get_similar_investigations(
        embedding=investigation.embedding, top_k=investigation.steering.context_window_depth
    )
    # Convert similar docs → list of (text, embedding) for prompt injection
    historical_context = []
    for doc, _score in similar:
        # Re‑use the raw notes + external_prompt for context
        text = " ".join(filter(None, [doc.raw_notes, doc.external_info_prompt]))
        historical_context.append((text, doc.embedding))

    # ------------------------------------------------------------------
    #   3️⃣ Build prompts
    # ------------------------------------------------------------------
    system_prompt = build_system_prompt(investigation)
    user_prompt = build_user_prompt(investigation, historical_context)

    # ------------------------------------------------------------------
    #   4️⃣ Stream from Ollama
    # ------------------------------------------------------------------
    async for token_json in ollama.generate_text_stream(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        temperature=investigation.steering.temperature,
        top_p=investigation.steering.top_p,
        # max_tokens=2048,
    ):
        # token_json is a JSON string: {"token":"...", "is_finished":false}
        data = json.loads(token_json)
        token = data["token"]
        # Append token to the persisted report (optional step)
        investigation.generated_report = (investigation.generated_report or "") + token
        investigation.updated_at = datetime.utcnow()
        await investigation.save()  # tiny write per token – ok for low volume; batch in prod
        yield token_json  # send to SSE upstream

    # --------------------------------------------------------------
    #   5️⃣ Log final Evidence (optionally store each token slice)
    # --------------------------------------------------------------
    logger.info(f"Report generation finished for investigation {investigation_id}")
