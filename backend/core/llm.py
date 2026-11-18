import json
import logging
import re
from typing import Optional, List, Dict, Any
import certifi
import httpx
from backend.core.config import settings

logger = logging.getLogger(__name__)


def get_active_llm_provider() -> str:
    """Return the name of the active and configured LLM provider."""
    # Check configured provider in settings
    provider_pref = (settings.LLM or "").lower().strip()
    if provider_pref == "google" and settings.GOOGLE_API_KEY.strip():
        return "google"
    if provider_pref == "openrouter" and settings.OPENROUTER_API_KEY.strip():
        return "openrouter"
    if provider_pref == "groq" and settings.GROQ_API_KEY.strip():
        return "groq"
    if provider_pref == "openai" and settings.OPENAI_API_KEY.strip():
        return "openai"

    # Fallback to whatever key is populated
    if settings.GOOGLE_API_KEY.strip():
        return "google"
    if settings.OPENROUTER_API_KEY.strip():
        return "openrouter"
    if settings.GROQ_API_KEY.strip():
        return "groq"
    if settings.OPENAI_API_KEY.strip():
        return "openai"
    return "none"


def clean_topic_string(raw: str, fallback: str = "Lesson Presentation") -> str:
    """Strip imperative command prefixes so prompt input becomes a clean title."""
    if not raw or not raw.strip():
        return fallback
    cleaned = raw.strip()
    # Strip common command prefixes like "ppt on", "powerpoint about", "create slides for"
    cleaned = re.sub(
        r'^(?:please\s+)?(?:create|make|generate|build|give\s+me|show\s+me|write)?\s*(?:a|an)?\s*(?:\d+)?\s*(?:slides?|presentation|deck|ppt|powerpoint)?\s*(?:on|about|for|regarding|of)?\s*',
        '',
        cleaned,
        flags=re.IGNORECASE
    ).strip()
    # Strip trailing instructions
    cleaned = re.sub(
        r'\s*(?:with|for)\s+(?:speaker\s+notes|class\s+\d+|grade\s+\d+|students).*$',
        '',
        cleaned,
        flags=re.IGNORECASE
    ).strip()
    # Strip any lingering "ppt on" or "slides on" at start
    cleaned = re.sub(r'^(?:ppt|slides?|presentation)\s+(?:on|about|for)\s+', '', cleaned, flags=re.IGNORECASE).strip()
    # If the user only typed "slides", "ppt", etc., use fallback
    if cleaned.lower() in ("slides", "slide", "presentation", "deck", "ppt", "powerpoint"):
        return fallback
    return cleaned.title() if len(cleaned) >= 2 else fallback


def safe_json_loads(s: str) -> Any:
    """Robust JSON parser that repairs common LLM syntax issues (invalid escapes, trailing commas, markdown wrappers)."""
    if not s or not s.strip():
        return {}
    clean = s.strip()
    if clean.startswith("```"):
        clean = re.sub(r"^```(?:json)?\s*", "", clean)
        clean = re.sub(r"\s*```$", "", clean)

    # First attempt: direct load
    try:
        return json.loads(clean)
    except json.JSONDecodeError:
        pass

    # Clean trailing commas: e.g. [1, 2, ] -> [1, 2] or {"a": 1, } -> {"a": 1}
    fixed = re.sub(r',\s*([}\]])', r'\1', clean)
    # Fix backslash escapes that aren't valid JSON escapes
    fixed = re.sub(r'\\([^"\\/bfnrtu])', r'\1', fixed)
    try:
        return json.loads(fixed)
    except Exception:
        pass

    # Extract outermost JSON object or array
    match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', clean)
    if match:
        inner = match.group(1)
        inner = re.sub(r',\s*([}\]])', r'\1', inner)
        inner = re.sub(r'\\([^"\\/bfnrtu])', r'\1', inner)
        try:
            return json.loads(inner)
        except Exception as e:
            logger.warning(f"safe_json_loads fallback failed: {e}")
            raise

    raise ValueError(f"Could not parse valid JSON from LLM response (length {len(s)})")


async def call_llm(
    messages: List[Dict[str, str]],
    json_mode: bool = False,
    temperature: float = 0.3,
    max_tokens: int = 2048,
    retries: int = 2,
) -> Optional[str]:
    """Call the active LLM provider asynchronously with automatic failover across providers."""
    import asyncio

    # Determine priority order of providers
    providers = []
    primary = get_active_llm_provider()
    if primary != "none":
        providers.append(primary)
    for p in ["google", "openrouter", "openai", "groq"]:
        if p not in providers:
            if p == "google" and settings.GOOGLE_API_KEY.strip():
                providers.append(p)
            elif p == "openrouter" and settings.OPENROUTER_API_KEY.strip():
                providers.append(p)
            elif p == "openai" and settings.OPENAI_API_KEY.strip():
                providers.append(p)
            elif p == "groq" and settings.GROQ_API_KEY.strip():
                providers.append(p)

    if not providers:
        logger.info("No active LLM provider configured.")
        return None

    for provider in providers:
        for attempt in range(retries + 1):
            try:
                if provider == "google":
                    from openai import OpenAI
                    http_client = httpx.Client(verify=certifi.where())
                    client = OpenAI(
                        api_key=settings.GOOGLE_API_KEY.strip(),
                        base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                        http_client=http_client
                    )
                    model = settings.GOOGLE_MODEL.replace("models/", "").strip() or "gemini-3.5-flash-lite"
                    resp = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format={"type": "json_object"} if json_mode else None
                    )
                    content = resp.choices[0].message.content
                    if content:
                        return content

                elif provider == "openrouter":
                    from openai import OpenAI
                    http_client = httpx.Client(verify=certifi.where())
                    client = OpenAI(
                        api_key=settings.OPENROUTER_API_KEY.strip(),
                        base_url="https://openrouter.ai/api/v1",
                        http_client=http_client
                    )
                    model = settings.OPENROUTER_MODEL.strip() or "nvidia/nemotron-3.5-lightning:free"
                    resp = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format={"type": "json_object"} if json_mode else None
                    )
                    content = resp.choices[0].message.content
                    if content:
                        return content

                elif provider == "groq":
                    from groq import Groq
                    client = Groq(api_key=settings.GROQ_API_KEY.strip())
                    model = settings.GROQ_MODEL.replace("groq/", "").strip() or "llama-3.3-70b-versatile"
                    resp = client.chat.completions.create(
                        model=model,
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format={"type": "json_object"} if json_mode else None
                    )
                    content = resp.choices[0].message.content
                    if content:
                        return content

                elif provider == "openai":
                    from openai import OpenAI
                    client = OpenAI(api_key=settings.OPENAI_API_KEY.strip())
                    resp = client.chat.completions.create(
                        model=settings.OPENAI_MODEL.strip() or "gpt-4o",
                        messages=messages,
                        temperature=temperature,
                        max_tokens=max_tokens,
                        response_format={"type": "json_object"} if json_mode else None
                    )
                    content = resp.choices[0].message.content
                    if content:
                        return content

            except Exception as e:
                err_msg = str(e)
                if ("503" in err_msg or "429" in err_msg or "overloaded" in err_msg.lower()) and attempt < retries:
                    logger.warning(f"Transient error from {provider} (attempt {attempt+1}/{retries+1}): {err_msg}. Retrying in 1.2s...")
                    await asyncio.sleep(1.2)
                    continue
                logger.error(f"Provider '{provider}' failed: {e}. Trying next available provider...")
                break

    return None
