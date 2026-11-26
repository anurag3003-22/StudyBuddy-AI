"""Runtime configuration for the StudyBuddy AI agent service."""

from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
DEMO_DIR = DATA_DIR / "demo"
STATE_FILE = DATA_DIR / "state.json"


class Settings(BaseSettings):
    """Environment-driven settings.

    Any OpenAI-compatible endpoint works (OpenAI, Groq, OpenRouter, Ollama,
    vLLM, ...). When no key is present the agent runs in deterministic
    offline mode so the demo never depends on the network.
    """

    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    llm_api_key: str = ""
    llm_base_url: str = ""
    llm_model: str = "gpt-4o-mini"
    llm_temperature: float = 0.2

    embedding_model: str = ""
    embedding_base_url: str = ""

    cors_origins: str = "*"
    host: str = "0.0.0.0"
    port: int = 8000

    @property
    def llm_enabled(self) -> bool:
        return bool(self.llm_api_key.strip())

    @property
    def embedding_enabled(self) -> bool:
        return bool(self.llm_api_key.strip() and self.embedding_model.strip())

    def ensure_dirs(self) -> None:
        for directory in (DATA_DIR, UPLOAD_DIR, DEMO_DIR):
            directory.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # Allow OPENAI_API_KEY to be used directly for convenience.
    if not settings.llm_api_key:
        settings.llm_api_key = os.getenv("OPENAI_API_KEY", "")
    settings.ensure_dirs()
    return settings
