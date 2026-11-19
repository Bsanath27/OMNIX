#!/usr/bin/env python3
"""
OMNIX / Presenton Slide Generation Benchmark Script
Tests automated slide deck synthesis using:
1. Google Gemini (via GOOGLE_API_KEY)
2. Open-source models via OpenRouter (e.g., Qwen 2.5 72B / 7B)

Usage:
    python3 scripts/test_presenton_generation.py --provider google
    python3 scripts/test_presenton_generation.py --provider openrouter --openrouter-key <KEY>
    python3 scripts/test_presenton_generation.py --provider all
"""

import argparse
import json
import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Optional, Dict, Any

try:
    import requests
except ImportError:
    print("Error: 'requests' library not found. Run 'pip install requests'.")
    sys.exit(1)

try:
    from pptx import Presentation
except ImportError:
    Presentation = None


# Paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
OMNIX_ENV_PATH = PROJECT_ROOT / ".env"
PRESENTON_DEMO_DIR = PROJECT_ROOT.parent / "presenton-demo"
PRESENTON_ENV_PATH = PRESENTON_DEMO_DIR / ".env"
OUTPUT_DIR = PROJECT_ROOT / "output" / "test_slides"
PRESENTON_API_URL = "http://localhost:5001"


def load_env_file(path: Path) -> Dict[str, str]:
    """Parse key=value pairs from a .env file."""
    env_vars = {}
    if not path.exists():
        return env_vars
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip().strip('"').strip("'")
    return env_vars


def save_env_file(path: Path, updates: Dict[str, str]) -> None:
    """Update or append variables in a .env file."""
    lines = []
    existing_keys = set()
    if path.exists():
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()

    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k = stripped.split("=", 1)[0].strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                existing_keys.add(k)
                continue
        new_lines.append(line)

    if new_lines and not new_lines[-1].endswith("\n"):
        new_lines[-1] += "\n"

    for k, v in updates.items():
        if k not in existing_keys:
            new_lines.append(f"{k}={v}\n")

    with open(path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


def ensure_presenton_running() -> bool:
    """Verify that Presenton container is running and healthy on port 5001."""
    try:
        res = requests.get(f"{PRESENTON_API_URL}/api/v1/auth/status", timeout=5)
        if res.status_code == 200:
            return True
    except Exception:
        pass

    print("[*] Presenton is not responding on port 5001. Checking Docker container...")
    try:
        subprocess.run(["docker", "start", "presenton"], check=True, capture_output=True)
        time.sleep(3)
        res = requests.get(f"{PRESENTON_API_URL}/api/v1/auth/status", timeout=10)
        return res.status_code == 200
    except Exception as e:
        print(f"[!] Could not connect to Presenton container: {e}")
        return False


def get_container_env() -> Dict[str, str]:
    """Retrieve environment variables currently active inside the running container."""
    try:
        res = subprocess.run(["docker", "exec", "presenton", "env"], capture_output=True, text=True, check=True)
        env = {}
        for line in res.stdout.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                env[k] = v
        return env
    except Exception:
        return {}


def configure_presenton(
    llm_provider: str,
    api_key: str,
    model_name: str,
    enable_image_bridge: bool = True
) -> bool:
    """Reconfigure Presenton container with specified LLM provider, credentials, and image bridge."""
    current_env = get_container_env()
    
    # Check if recreation is needed
    needs_restart = False
    if current_env.get("LLM") != llm_provider:
        needs_restart = True
    
    if llm_provider == "google":
        if current_env.get("GOOGLE_API_KEY") != api_key or current_env.get("GOOGLE_MODEL") != model_name:
            needs_restart = True
    elif llm_provider == "openrouter":
        if current_env.get("OPENROUTER_API_KEY") != api_key or current_env.get("OPENROUTER_MODEL") != model_name:
            needs_restart = True

    if enable_image_bridge:
        if (
            current_env.get("IMAGE_PROVIDER") != "openai_compatible"
            or current_env.get("OPENAI_COMPAT_IMAGE_BASE_URL") != "http://host.docker.internal:8088/v1"
        ):
            needs_restart = True

    if not needs_restart:
        print(f"[*] Configuration already active (LLM={llm_provider}, model={model_name}, images={'enabled' if enable_image_bridge else 'disabled'}).")
        return True

    updates = {
        "DISABLE_AUTH": "true",
        "CAN_CHANGE_KEYS": "true",
        "LLM": llm_provider,
    }

    if enable_image_bridge:
        updates["IMAGE_PROVIDER"] = "openai_compatible"
        updates["OPENAI_COMPAT_IMAGE_BASE_URL"] = "http://host.docker.internal:8088/v1"
        updates["OPENAI_COMPAT_IMAGE_API_KEY"] = "free"
        updates["OPENAI_COMPAT_IMAGE_MODEL"] = "flux"
        updates["DISABLE_IMAGE_GENERATION"] = "false"

    if llm_provider == "google":
        updates["GOOGLE_API_KEY"] = api_key
        updates["GOOGLE_MODEL"] = model_name
    elif llm_provider == "openrouter":
        updates["OPENROUTER_API_KEY"] = api_key
        updates["OPENROUTER_MODEL"] = model_name

    save_env_file(PRESENTON_ENV_PATH, updates)

    # Recreate container to apply updated environment variables
    print(f"[*] Recreating container with new configuration (LLM={llm_provider}, model={model_name}, images={'enabled' if enable_image_bridge else 'disabled'})...")
    try:
        subprocess.run(["docker", "stop", "presenton"], capture_output=True)
        subprocess.run(["docker", "rm", "presenton"], capture_output=True)
        run_cmd = [
            "docker", "run", "-d",
            "--name", "presenton",
            "-p", "5001:80",
            "--env-file", str(PRESENTON_ENV_PATH),
            "-v", f"{PRESENTON_DEMO_DIR}/user_data:/app/user_data",
            "ghcr.io/presenton/presenton:latest"
        ]
        subprocess.run(run_cmd, check=True, capture_output=True)

        # Poll until FastAPI is fully ready
        for attempt in range(20):
            time.sleep(2)
            try:
                r = requests.get(f"{PRESENTON_API_URL}/api/v1/auth/status", timeout=2)
                if r.status_code == 200:
                    print("[*] Presenton backend is ready.")
                    # Patch batch_size to prevent Google Gemini free tier rate limit bursts
                    subprocess.run(["docker", "exec", "presenton", "python", "-c", """
path = '/app/servers/fastapi/api/v1/ppt/endpoints/presentation.py'
content = open(path).read()
old = 'batch_size = 10'
new = 'batch_size = 2'
if old in content:
    open(path, 'w').write(content.replace(old, new, 1))
"""], capture_output=True)
                    return True
            except Exception:
                pass
        print("[!] Presenton took too long to become ready after container recreation.")
        return False
    except Exception as e:
        print(f"[!] Failed to recreate presenton container: {e}")
        return False


def generate_slides(topic: str, n_slides: int = 3, template: str = "modern") -> Dict[str, Any]:
    """Call Presenton sync generate endpoint and wait for completion."""
    url = f"{PRESENTON_API_URL}/api/v1/ppt/presentation/generate"
    payload = {
        "content": topic,
        "n_slides": n_slides,
        "template": template,
        "export_as": "pptx"
    }

    print(f"[*] Requesting presentation generation from Presenton API...")
    print(f"    Topic: '{topic}' ({n_slides} slides, template: {template})")
    
    start_time = time.time()
    res = requests.post(url, json=payload, timeout=600)
    elapsed = time.time() - start_time

    if res.status_code != 200:
        raise RuntimeError(f"Generation failed with status {res.status_code}: {res.text}")

    data = res.json()
    data["elapsed_seconds"] = elapsed
    return data


def download_and_verify_pptx(export_path: str, local_save_path: Path) -> Dict[str, Any]:
    """Download generated PPTX file and inspect its structure."""
    download_url = f"{PRESENTON_API_URL}{export_path}"
    res = requests.get(download_url, timeout=30)
    if res.status_code != 200:
        raise RuntimeError(f"Failed to download PPTX from {download_url} (status: {res.status_code})")

    local_save_path.parent.mkdir(parents=True, exist_ok=True)
    with open(local_save_path, "wb") as f:
        f.write(res.content)

    file_size_kb = len(res.content) / 1024

    slide_titles = []
    if Presentation is not None:
        try:
            prs = Presentation(str(local_save_path))
            for s_idx, slide in enumerate(prs.slides):
                title_text = "Untitled"
                for shape in slide.shapes:
                    if shape.has_text_frame and shape.text_frame.text:
                        first_line = shape.text_frame.text.split("\n")[0].strip()
                        if len(first_line) > 3 and not first_line.startswith("•"):
                            title_text = first_line
                            break
                slide_titles.append(f"Slide {s_idx + 1}: {title_text}")
        except Exception as e:
            slide_titles.append(f"(Could not inspect PPTX with python-pptx: {e})")

    return {
        "local_path": str(local_save_path),
        "file_size_kb": round(file_size_kb, 1),
        "slide_count": len(slide_titles),
        "slide_titles": slide_titles
    }


def run_benchmark(
    provider: str,
    openrouter_key: Optional[str] = None,
    topic: str = "The Fundamental Unit of Life: Cell Structure and Organelles",
    custom_model: Optional[str] = None,
    n_slides: int = 7,
    template: str = "modern",
    enable_image_bridge: bool = True
) -> Optional[Dict[str, Any]]:
    """Execute full generation benchmark for a specific provider."""
    print(f"\n=======================================================")
    print(f"  RUNNING BENCHMARK: {provider.upper()} ({n_slides} SLIDES)")
    print(f"=======================================================")

    # Load existing env keys
    omnix_env = load_env_file(OMNIX_ENV_PATH)
    presenton_env = load_env_file(PRESENTON_ENV_PATH)

    api_key = None
    model_name = None

    if provider == "google":
        api_key = (
            os.getenv("GOOGLE_API_KEY")
            or presenton_env.get("GOOGLE_API_KEY")
            or omnix_env.get("GOOGLE_API_KEY")
        )
        model_name = custom_model or "models/gemini-3.1-flash-lite-preview"

        if not api_key:
            print("[!] ERROR: GOOGLE_API_KEY not found in environment or .env files.")
            return None

    elif provider == "openrouter":
        api_key = (
            openrouter_key
            or os.getenv("OPENROUTER_API_KEY")
            or presenton_env.get("OPENROUTER_API_KEY")
            or omnix_env.get("OPENROUTER_API_KEY")
        )
        model_name = custom_model or "nvidia/nemotron-3.5-lightning:free"

        if not api_key:
            print(f"\n[!] MISSING KEY: OPENROUTER_API_KEY is required to test OpenRouter.")
            print(f"    Please provide your OpenRouter API key using:")
            print(f"    python3 scripts/test_presenton_generation.py --provider openrouter --openrouter-key <YOUR_KEY>")
            print(f"    or set it in presenton-demo/.env (OPENROUTER_API_KEY=sk-or-v1-...)")
            return None

    # Verify Presenton is up
    if not ensure_presenton_running():
        print("[!] Presenton service is unavailable.")
        return None

    # Configure Presenton
    configure_presenton(provider, api_key, model_name, enable_image_bridge=enable_image_bridge)

    # Run generation
    try:
        result = generate_slides(topic=topic, n_slides=n_slides, template=template)
        elapsed = result["elapsed_seconds"]
        export_path = result.get("path")

        if not export_path:
            print(f"[!] No export path returned: {result}")
            return None

        # Download PPTX
        safe_name = f"{provider}_{int(time.time())}.pptx"
        local_file = OUTPUT_DIR / safe_name
        meta = download_and_verify_pptx(export_path, local_file)

        print("\n[✓] BENCHMARK COMPLETED SUCCESSFULLY!")
        print(f"    Provider:       {provider.upper()}")
        print(f"    Model:          {model_name}")
        print(f"    Generation Time:{elapsed:.2f} seconds")
        print(f"    File Size:      {meta['file_size_kb']} KB")
        print(f"    Saved PPTX:     {meta['local_path']}")
        print(f"    Generated Slides:")
        for t in meta["slide_titles"]:
            print(f"      • {t}")

        return {
            "provider": provider,
            "model": model_name,
            "elapsed_seconds": round(elapsed, 2),
            "file_size_kb": meta["file_size_kb"],
            "slide_count": meta["slide_count"],
            "local_path": meta["local_path"]
        }

    except Exception as e:
        print(f"[!] Error during {provider} generation: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(description="OMNIX / Presenton Slide Generation Benchmark")
    parser.add_argument("--provider", choices=["google", "openrouter", "all"], default="google",
                        help="LLM provider to test ('google', 'openrouter', or 'all')")
    parser.add_argument("--openrouter-key", default=None,
                        help="OpenRouter API key for testing open-source models like Qwen 2.5")
    parser.add_argument("--model", default=None,
                        help="Override default model (e.g. 'models/gemini-3-flash-preview' or 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free')")
    parser.add_argument("--slides", type=int, default=7,
                        help="Number of slides to generate (default: 7)")
    parser.add_argument("--template", default="modern",
                        help="Template style (e.g. 'modern', 'mosaic', 'editorial', 'verdant')")
    parser.add_argument("--topic", default="The Fundamental Unit of Life: Cell Structure, Organelles, and Functions (9th Grade Biology)",
                        help="Curriculum topic for presentation generation")
    parser.add_argument("--disable-images", action="store_true",
                        help="Disable image bridge and generate without custom images")
    args = parser.parse_args()

    results = []

    if args.provider in ["google", "all"]:
        res_g = run_benchmark(
            "google",
            topic=args.topic,
            custom_model=args.model,
            n_slides=args.slides,
            template=args.template,
            enable_image_bridge=not args.disable_images
        )
        if res_g:
            results.append(res_g)

    if args.provider in ["openrouter", "all"]:
        res_or = run_benchmark(
            "openrouter",
            openrouter_key=args.openrouter_key,
            topic=args.topic,
            custom_model=args.model,
            n_slides=args.slides,
            template=args.template,
            enable_image_bridge=not args.disable_images
        )
        if res_or:
            results.append(res_or)

    if results:
        print("\n" + "=" * 60)
        print("                   BENCHMARK SUMMARY")
        print("=" * 60)
        for r in results:
            print(f"• {r['provider'].upper():<12} | Model: {r['model']:<30} | {r['elapsed_seconds']}s | {r['file_size_kb']} KB")
        print("=" * 60)


if __name__ == "__main__":
    main()
