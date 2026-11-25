import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings, SettingsConfigDict

# Ensure .env is explicitly populated into os.environ for third-party libraries (e.g. gradio_client, huggingface_hub)
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
if _env_path.exists():
    load_dotenv(_env_path)


class Settings(BaseSettings):
    """OMNIX application configuration settings."""

    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    APP_NAME: str = "OMNIX"
    APP_VERSION: str = "0.5.0"

    # Base Paths
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = ROOT_DIR / "data"
    PROJECTS_DIR: Path = DATA_DIR / "projects"
    GOLDEN_CHAPTERS_DIR: Path = DATA_DIR / "golden_chapters"

    # LLM Providers
    LLM: str = "google"
    GOOGLE_API_KEY: str = ""
    GOOGLE_MODEL: str = "gemini-3.1-flash-lite-preview"
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-3-5-sonnet-20241022"
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_MODEL: str = "nvidia/nemotron-3.5-lightning:free"
    PRIMARY_LLM_MODEL: str = "groq/llama-3.3-70b-versatile"
    FAST_LLM_MODEL: str = "groq/llama-3.1-8b-instant"

    # Cloudflare Backup
    CLOUDFLARE_API_TOKEN: str = ""
    CLOUDFLARE_ACCOUNT_ID: str = ""

    # Image & Video Providers
    FAL_KEY: str = ""
    REPLICATE_API_TOKEN: str = ""
    HF_TOKEN: str = ""

    # TTS Settings (kokoro-onnx on CPU)
    TTS_MODEL_PATH: str = ""
    TTS_VOICE: str = "af_heart"

    # Concurrency controls
    MAX_CONCURRENT_MANIM_RENDERS: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


settings = Settings()

# Ensure directories exist
settings.PROJECTS_DIR.mkdir(parents=True, exist_ok=True)
settings.GOLDEN_CHAPTERS_DIR.mkdir(parents=True, exist_ok=True)

