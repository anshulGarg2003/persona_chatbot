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


def generate_response(prompt):
    logger.info("Requesting chat completion: model=%s prompt_chars=%d", CHAT_MODEL, len(prompt))
    try:
        response = client.chat.completions.create(
            model=CHAT_MODEL,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=CHAT_MAX_TOKENS,
            temperature=CHAT_TEMPERATURE,
            top_p=0.9,
        )
        reply = response.choices[0].message.content
        logger.info("Chat completion succeeded: response_chars=%d", len(reply or ""))
        return reply
    except Exception:
        logger.exception("Chat completion API request failed: model=%s", CHAT_MODEL)
        raise
