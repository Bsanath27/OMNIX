import shutil
import importlib.util
from typing import Dict, Any
from fastapi import APIRouter
from backend.core.config import settings

router = APIRouter(prefix="/api/doctor", tags=["Diagnostics"])


def check_command(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def check_python_package(pkg: str) -> bool:
    return importlib.util.find_spec(pkg) is not None


@router.get("", response_model=Dict[str, Any])
async def run_diagnostics() -> Dict[str, Any]:
    """Inspect server capabilities and provider credentials."""
    checks = {
        "ffmpeg": {
            "status": "ok" if check_command("ffmpeg") else "missing",
            "message": "FFmpeg binary found" if check_command("ffmpeg") else "FFmpeg missing; video joining disabled"
        },
        "latex": {
            "status": "ok" if (check_command("latex") or check_command("pdflatex")) else "warning",
            "message": "LaTeX detected" if (check_command("latex") or check_command("pdflatex")) else "LaTeX missing; using Cairo/Pango text fallback for Manim"
        },
        "manim": {
            "status": "ok" if check_python_package("manim") else "missing",
            "message": "Manim engine available" if check_python_package("manim") else "Manim not installed"
        },
        "kokoro_tts": {
            "status": "ok" if check_python_package("kokoro_onnx") else "warning",
            "message": "kokoro-onnx installed" if check_python_package("kokoro_onnx") else "kokoro-onnx missing; TTS disabled"
        },
        "groq_api": {
            "status": "ok" if bool(settings.GROQ_API_KEY) else "warning",
            "message": "Groq API key configured" if bool(settings.GROQ_API_KEY) else "Groq API key not set"
        },
        "cloudflare_api": {
            "status": "ok" if bool(settings.CLOUDFLARE_API_TOKEN) else "info",
            "message": "Cloudflare token configured" if bool(settings.CLOUDFLARE_API_TOKEN) else "Cloudflare token not set (backup provider)"
        }
    }

    # Overall system health
    critical_statuses = [checks["ffmpeg"]["status"], checks["manim"]["status"]]
    if any(s == "missing" for s in critical_statuses):
        overall = "degraded"
    else:
        overall = "ok"

    return {
        "status": overall,
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "components": checks
    }

