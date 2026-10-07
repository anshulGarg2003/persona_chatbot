import os
import logging
from openai import OpenAI

logger = logging.getLogger(__name__)

CHAT_MODEL = os.getenv("OPEN_ROUTER_CHAT_MODEL", "openai/gpt-4o-mini")
CHAT_MAX_TOKENS = int(os.getenv("CHAT_MAX_TOKENS", "700"))
CHAT_TEMPERATURE = float(os.getenv("CHAT_TEMPERATURE", "0.6"))

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPEN_ROUTER_API_KEY"),
)


def stream_response(prompt):
    """Yield chat completion text deltas as they arrive from OpenRouter."""
    logger.info("Requesting streaming chat completion: model=%s prompt_chars=%d", CHAT_MODEL, len(prompt))
    try:
        stream = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=CHAT_MAX_TOKENS,
            temperature=CHAT_TEMPERATURE,
            top_p=0.9,
            stream=True,
        )
        for chunk in stream:
            content = chunk.choices[0].delta.content
            if content:
                yield content
    except Exception:
        logger.exception("Streaming chat completion API request failed: model=%s", CHAT_MODEL)
        raise
