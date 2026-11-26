"""LLM factory with a strict offline fallback.

The whole product works with zero credentials: every agent has a deterministic
implementation. Configure an OpenAI-compatible key to upgrade answer quality,
quiz authoring and plan rationale.
"""

from __future__ import annotations

import json
import re
from typing import Any, TypeVar

from pydantic import BaseModel

from .config import get_settings

T = TypeVar("T", bound=BaseModel)

_LLM: Any = None


def get_llm(temperature: float | None = None):
    """Return a ChatOpenAI-compatible client, or None in offline mode."""
    global _LLM
    settings = get_settings()
    if not settings.llm_enabled:
        return None
    if _LLM is None:
        from langchain_openai import ChatOpenAI

        kwargs: dict[str, Any] = {
            "model": settings.llm_model,
            "api_key": settings.llm_api_key,
            "temperature": settings.llm_temperature,
            "timeout": 45,
            "max_retries": 1,
        }
        if settings.llm_base_url:
            kwargs["base_url"] = settings.llm_base_url
        _LLM = ChatOpenAI(**kwargs)
    if temperature is not None:
        return _LLM.bind(temperature=temperature)
    return _LLM


def llm_text(system: str, user: str, temperature: float | None = None) -> str | None:
    llm = get_llm(temperature)
    if llm is None:
        return None
    try:
        from langchain_core.messages import HumanMessage, SystemMessage

        response = llm.invoke([SystemMessage(content=system), HumanMessage(content=user)])
        content = response.content
        if isinstance(content, list):
            content = "".join(part.get("text", "") if isinstance(part, dict) else str(part) for part in content)
        return str(content).strip() or None
    except Exception:
        return None


def llm_json(system: str, user: str, model_cls: type[T]) -> T | None:
    """Ask for structured output, tolerating providers without tool support."""
    llm = get_llm()
    if llm is None:
        return None
    try:
        structured = llm.with_structured_output(model_cls)
        result = structured.invoke(system + "\n\n" + user)
        if isinstance(result, model_cls):
            return result
    except Exception:
        pass

    raw = llm_text(system + "\nReturn ONLY valid JSON, no prose.", user)
    if not raw:
        return None
    candidate = raw.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", candidate, re.S)
    if fence:
        candidate = fence.group(1)
    match = re.search(r"[\{\[].*[\}\]]", candidate, re.S)
    if match:
        candidate = match.group(0)
    try:
        return model_cls.model_validate(json.loads(candidate))
    except Exception:
        return None
