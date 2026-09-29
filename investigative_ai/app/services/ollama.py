# app/services/ollama.py
import json
import logging
from typing import AsyncGenerator, Dict, Any, List

import httpx
from app.core.config import settings

logger = logging.getLogger(__name__)

# ----------------------------------------------------------------------
#   NOTE TO FRONTEND:
#   * The UI calls `/stream` (SSE) when it wants a live‑typing effect.
#   * Each SSE **event** contains a small JSON payload:
#        { "token": "...", "is_finished": false }
#   * When `is_finished` becomes true the UI stops listening.
# ----------------------------------------------------------------------


async def _post_ollama(payload: Dict[str, Any]) -> httpx.Response:
    """
    Small wrapper that adds the default model and timeout.
    """
    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        resp = await client.post(
            f"{settings.ollama_base_url}/generate",
            json=payload,
        )
        resp.raise_for_status()
        return resp


async def generate_text_stream(
    system_prompt: str,
    user_prompt: str,
    temperature: float,
    top_p: float,
    # max_tokens: int = 1024,
) -> AsyncGenerator[str, None]:
    """
    Calls Ollama with `stream: true`. Yields **raw token strings** (including
    whitespace) as they arrive.
    """
    payload = {
        "model": settings.ollama_default_model,
        "system": system_prompt,
        "prompt": user_prompt,
        "temperature": temperature,
        "top_p": top_p,
        # "max_tokens": max_tokens,
        "stream": True,
    }

    async with httpx.AsyncClient(timeout=settings.ollama_timeout) as client:
        async with client.stream("POST", f"{settings.ollama_base_url}/generate", json=payload) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                # Ollama sends JSON per line:
                # {"model":"...","created_at":"...","response":"the token","done":false}
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    logger.warning(f"Failed to decode Ollama line: {line!r}")
                    continue
                token = data.get("response", "")
                done = data.get("done", False)
                # Yield a minimal JSON string that the SSE endpoint will forward
                yield json.dumps({"token": token, "is_finished": done})
                if done:
                    break
