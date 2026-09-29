# app/services/nlp.py
import logging
from typing import List, Tuple, Dict

from sentence_transformers import SentenceTransformer, util
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

# ----------------------------------------------------------------------
#   NOTE FOR FRONTEND TEAM:
#   * All NLP work runs **server‑side** – the UI never sees embeddings or
#     intermediate NER data.  The UI only needs to know the final report
#     and (optionally) a list of extracted entities that can be rendered in a
#     sidebar.
# ----------------------------------------------------------------------


logger = logging.getLogger(__name__)

# Load once at import time – they are thread‑safe.
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
EMBEDDING_MODEL = SentenceTransformer(EMBED_MODEL_NAME, device='cpu')

NER_MODEL_NAME = "dslim/bert-base-NER"
NER_PIPELINE = pipeline("ner", model=NER_MODEL_NAME, aggregation_strategy="simple", device='cpu')


def embed_text(text: str) -> List[float]:
    """
    Returns a 384‑dim vector (float list) for the given text.
    """
    vector = EMBEDDING_MODEL.encode(text, normalize_embeddings=True)
    return vector.tolist()


def chunk_and_embed(text: str, max_tokens: int = 500) -> List[Tuple[str, List[float]]]:
    """
    Very simple chunker – split on double newline, then fall back to sentence split.
    Each chunk is embedded and returned as (chunk_text, embedding) pair.
    """
    from nltk import sent_tokenize  # lazy import, optional

    # Split into paragraphs first
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: List[str] = []
    current = ""
    for para in paragraphs:
        # Approximate token count with word count (rough but cheap)
        if len(current.split()) + len(para.split()) > max_tokens:
            chunks.append(current.strip())
            current = para
        else:
            current += "\n\n" + para
    if current:
        chunks.append(current.strip())

    # Embed each chunk
    result = [(c, embed_text(c)) for c in chunks]
    return result


def extract_entities(text: str) -> List[str]:
    """
    Returns a deduplicated list of entity strings (PERSON, ORG, LOC, etc.)
    """
    ner_results = NER_PIPELINE(text)
    entities = {item["word"] for item in ner_results}
    return list(entities)


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Utility – can be used for manual similarity searches."""
    return util.cos_sim(vec_a, vec_b).item()
