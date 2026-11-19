#!/usr/bin/env python3
"""
Zero-Key OpenAI-Compatible High-Quality Image Bridge
Combines DuckDuckGo Image Search + Wikimedia Commons + Pollinations.ai fallback.
Provides an OpenAI-compatible /v1/images/generations endpoint for Presenton.
100% Free, Zero Rate-Limits, Real Educational Diagrams & Photos.
"""

import base64
import hashlib
import json
from io import BytesIO
import os
import re
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image

app = FastAPI(title="Zero-Key High-Quality Image Bridge")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CACHE_DIR = Path(__file__).resolve().parent.parent / "output" / "image_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


class ImageGenerationRequest(BaseModel):
    prompt: str
    model: Optional[str] = "flux"
    n: Optional[int] = 1
    quality: Optional[str] = "standard"
    response_format: Optional[str] = "b64_json"
    size: Optional[str] = "1024x768"
    user: Optional[str] = None


def clean_search_query(prompt: str) -> str:
    """Extract clean core query terms from Presenton's verbose LLM prompt."""
    p = re.sub(
        r'(?i)\b(8k|4k|high quality|photorealistic|hyperrealistic|none|ultra hd|realistic|hd|detailed|scientific illustration|illustration of|diagram of|picture of|photo of|image of)\b',
        ' ',
        prompt,
    )
    p = re.sub(r'[^a-zA-Z0-9\s]', ' ', p)
    words = p.split()
    # Take first 7-9 descriptive words
    return ' '.join(words[:8]) if words else prompt[:40]


def fetch_from_ddg(query: str) -> Optional[bytes]:
    """Fetch high-res image from DuckDuckGo."""
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    vqd_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(vqd_url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode('utf-8', errors='ignore')
            m = re.search(r'vqd=([0-9-]+)', body) or re.search(r'vqd="([0-9-]+)"', body)
            if not m:
                return None
            vqd = m.group(1)

        img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1"
        req2 = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            data = json.loads(resp2.read().decode())
            results = data.get('results', [])
            for r in results[:4]:
                u = r.get('image')
                if not u or u.endswith('.svg') or u.endswith('.pdf'):
                    continue
                try:
                    img_req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
                    with urllib.request.urlopen(img_req, timeout=7) as img_resp:
                        raw = img_resp.read()
                        if len(raw) > 5000:
                            return raw
                except Exception:
                    continue
    except Exception as e:
        print(f"  [DDG] Search error for '{query}': {e}")
    return None


def fetch_from_wikimedia(query: str, width: int = 1024) -> Optional[bytes]:
    """Fetch high-quality diagram/thumbnail from Wikimedia Commons."""
    headers = {'User-Agent': 'OMNIX-Presentation-Generator/1.0 (contact@omnix.ai)'}
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search"
        f"&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=3&prop=imageinfo"
        f"&iiprop=url|size|mime&iiurlwidth={width}"
    )
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode())
            pages = data.get('query', {}).get('pages', {})
            for pid, pdata in pages.items():
                ii = pdata.get('imageinfo', [{}])[0]
                thumb = ii.get('thumburl') or ii.get('url')
                if not thumb or thumb.endswith('.pdf') or thumb.endswith('.ogv'):
                    continue
                img_req = urllib.request.Request(thumb, headers=headers)
                with urllib.request.urlopen(img_req, timeout=7) as img_resp:
                    raw = img_resp.read()
                    if len(raw) > 4000:
                        return raw
    except Exception as e:
        print(f"  [Wikimedia] Error for '{query}': {e}")
    return None


def fetch_from_pollinations(prompt: str, width: int = 1024, height: int = 768) -> Optional[bytes]:
    """Fallback to Pollinations.ai."""
    encoded_prompt = urllib.parse.quote(prompt[:80])
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true"
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=12) as resp:
            if resp.status == 200:
                raw = resp.read()
                if len(raw) > 3000:
                    return raw
    except Exception as e:
        print(f"  [Pollinations] Error: {e}")
    return None


def normalize_to_jpeg(image_bytes: bytes, target_width: int = 1024, target_height: int = 768) -> bytes:
    """Safely resize and convert to high-quality JPEG."""
    try:
        im = Image.open(BytesIO(image_bytes))
        im = im.convert("RGB")
        im.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        out = BytesIO()
        im.save(out, format="JPEG", quality=88)
        return out.getvalue()
    except Exception as e:
        print(f"  [PIL] Image normalization error: {e}")
        return image_bytes


@app.get("/")
@app.get("/health")
async def health():
    return {"status": "ok", "service": "Zero-Key Image Bridge", "version": "2.0.0"}


@app.post("/v1/images/generations")
@app.post("/images/generations")
async def generate_images(request: ImageGenerationRequest):
    prompt = request.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt cannot be empty")

    # Parse target dimensions
    width, height = 1024, 768
    if request.size and "x" in request.size:
        try:
            parts = request.size.split("x")
            width, height = int(parts[0]), int(parts[1])
        except Exception:
            pass

    print(f"\n[Bridge] Image Generation Request:")
    print(f"  Raw Prompt: '{prompt[:70]}...'")
    print(f"  Size:       {width}x{height}")

    # Check cache
    cache_key = hashlib.md5(f"{prompt}_{width}_{height}".encode("utf-8")).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.jpg"

    if cache_file.exists() and cache_file.stat().st_size > 5000:
        print(f"  Cache hit: {cache_file.name} ({cache_file.stat().st_size // 1024} KB)")
        with open(cache_file, "rb") as f:
            image_bytes = f.read()
    else:
        clean_q = clean_search_query(prompt)
        print(f"  Searching DDG Images for: '{clean_q} diagram'...")
        t0 = time.time()
        raw = fetch_from_ddg(f"{clean_q} diagram")
        
        if not raw:
            print(f"  DDG missed. Trying Wikimedia Commons: '{clean_q}'...")
            raw = fetch_from_wikimedia(clean_q, width=width)

        if not raw:
            print(f"  Trying Pollinations...")
            raw = fetch_from_pollinations(clean_q, width=width, height=height)

        if raw:
            image_bytes = normalize_to_jpeg(raw, width, height)
            with open(cache_file, "wb") as f:
                f.write(image_bytes)
            print(f"  Successfully fetched & normalized image in {time.time() - t0:.2f}s ({len(image_bytes) // 1024} KB)")
        else:
            print(f"  [!] Fallback to colored diagram placeholder")
            im = Image.new("RGB", (width, height), color=(30, 41, 59))
            out = BytesIO()
            im.save(out, format="JPEG")
            image_bytes = out.getvalue()

    b64_str = base64.b64encode(image_bytes).decode("utf-8")

    return {
        "created": int(time.time()),
        "data": [
            {
                "b64_json": b64_str,
                "revised_prompt": prompt
            }
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8088)
