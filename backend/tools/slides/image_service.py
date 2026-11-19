import asyncio
import hashlib
import json
import logging
import re
import urllib.parse
import urllib.request
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, Optional
from PIL import Image, ImageDraw, ImageFont

from backend.core.config import settings

logger = logging.getLogger(__name__)

CACHE_DIR = settings.ROOT_DIR / "output" / "image_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def clean_search_query(prompt: str) -> str:
    """Extract clean, descriptive core query terms for scientific searching."""
    p = re.sub(
        r"(?i)\b(8k|4k|high quality|photorealistic|hyperrealistic|none|ultra hd|realistic|hd|detailed|scientific illustration|illustration of|diagram of|picture of|photo of|image of)\b",
        " ",
        prompt,
    )
    p = re.sub(r"[^a-zA-Z0-9\s]", " ", p)
    words = p.split()
    return " ".join(words[:8]) if words else prompt[:40]


def fetch_from_wikimedia(query: str, width: int = 1024) -> Optional[bytes]:
    """Fetch verified educational diagram/thumbnail from Wikimedia Commons."""
    headers = {"User-Agent": "OMNIX-Presentation-Generator/2.0 (contact@omnix.ai)"}
    url = (
        f"https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search"
        f"&gsrnamespace=6&gsrsearch={urllib.parse.quote(query)}&gsrlimit=3&prop=imageinfo"
        f"&iiprop=url|size|mime&iiurlwidth={width}"
    )
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            pages = data.get("query", {}).get("pages", {})
            for pid, pdata in pages.items():
                ii = pdata.get("imageinfo", [{}])[0]
                thumb = ii.get("thumburl") or ii.get("url")
                if not thumb or thumb.endswith(".pdf") or thumb.endswith(".ogv"):
                    continue
                img_req = urllib.request.Request(thumb, headers=headers)
                with urllib.request.urlopen(img_req, timeout=6) as img_resp:
                    raw = img_resp.read()
                    if len(raw) > 4000:
                        return raw
    except Exception as e:
        logger.debug(f"[Wikimedia] Error for '{query}': {e}")
    return None


def fetch_from_ddg(query: str) -> Optional[bytes]:
    """Fetch high-res educational diagram from DuckDuckGo."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    vqd_url = f"https://duckduckgo.com/?q={urllib.parse.quote(query)}"
    try:
        req = urllib.request.Request(vqd_url, headers=headers)
        with urllib.request.urlopen(req, timeout=4) as resp:
            body = resp.read().decode("utf-8", errors="ignore")
            m = re.search(r"vqd=([0-9-]+)", body) or re.search(r'vqd="([0-9-]+)"', body)
            if not m:
                return None
            vqd = m.group(1)

        img_url = f"https://duckduckgo.com/i.js?l=us-en&o=json&q={urllib.parse.quote(query)}&vqd={vqd}&f=,,,&p=1"
        req2 = urllib.request.Request(img_url, headers=headers)
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            data = json.loads(resp2.read().decode())
            results = data.get("results", [])
            blocked_domains = ("shutterstock", "gettyimages", "dreamstime", "stock.adobe", "pinterest", "alamy")
            for r in results[:5]:
                u = r.get("image")
                if not u or any(b in u.lower() for b in blocked_domains):
                    continue
                if u.endswith(".pdf") or u.endswith(".svg"):
                    continue
                try:
                    img_req = urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0"})
                    with urllib.request.urlopen(img_req, timeout=5) as img_resp:
                        raw = img_resp.read()
                        if len(raw) > 5000:
                            return raw
                except Exception:
                    continue
    except Exception as e:
        logger.debug(f"[DDG] Error for '{query}': {e}")
    return None


def fetch_from_pollinations_safe(prompt: str, width: int = 1024, height: int = 768) -> Optional[bytes]:
    """Safe short-timeout fallback to Pollinations.ai with clean prompt."""
    encoded_prompt = urllib.parse.quote(prompt[:70])
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&nologo=true"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=4) as resp:
            if resp.status == 200:
                raw = resp.read()
                if len(raw) > 3000:
                    return raw
    except Exception as e:
        logger.debug(f"[Pollinations fallback] Error: {e}")
    return None


def create_procedural_schematic(title: str, query: str, width: int = 1024, height: int = 768) -> bytes:
    """Generate high-contrast, beautiful dark-mode scientific schematic banner.
    100% offline, guaranteed zero-failure fallback."""
    im = Image.new("RGB", (width, height), color=(15, 23, 42))  # Deep slate (#0F172A)
    draw = ImageDraw.Draw(im)

    # 1. Subtle background grid
    grid_spacing = 40
    for x in range(0, width, grid_spacing):
        draw.line([(x, 0), (x, height)], fill=(24, 34, 53), width=1)
    for y in range(0, height, grid_spacing):
        draw.line([(0, y), (width, y)], fill=(24, 34, 53), width=1)

    # 2. Outer blueprint frame
    margin = 48
    draw.rounded_rectangle(
        [margin, margin, width - margin, height - margin],
        radius=24,
        fill=(22, 33, 56),
        outline=(56, 189, 248),  # Sky blue accent
        width=3,
    )

    # 3. Top badge pill
    badge_w, badge_h = 320, 36
    draw.rounded_rectangle(
        [margin + 32, margin + 28, margin + 32 + badge_w, margin + 28 + badge_h],
        radius=8,
        fill=(14, 116, 144),  # Cyan
        outline=(56, 189, 248),
        width=1,
    )
    draw.text(
        (margin + 48, margin + 36),
        "• CURRICULUM SCIENTIFIC SCHEMATIC",
        fill=(241, 245, 249),
    )

    # 4. Central schematic box
    box_top = margin + 90
    box_bottom = height - margin - 50
    draw.rounded_rectangle(
        [margin + 32, box_top, width - margin - 32, box_bottom],
        radius=16,
        fill=(15, 23, 42),
        outline=(51, 65, 85),
        width=2,
    )

    # Center label & query
    display_title = (title or query or "Scientific Concept").strip().upper()
    display_query = f"Conceptual focus: {query.strip()}" if query else "Theoretical diagram"

    draw.text((margin + 64, box_top + 40), display_title[:45], fill=(56, 189, 248))
    draw.text((margin + 64, box_top + 80), display_query[:65], fill=(148, 163, 184))

    # Decorative tech circuit lines
    draw.line([(margin + 64, box_bottom - 60), (width - margin - 64, box_bottom - 60)], fill=(51, 65, 85), width=2)
    draw.ellipse([margin + 60, box_bottom - 64, margin + 68, box_bottom - 56], fill=(255, 92, 0))
    draw.ellipse([width - margin - 68, box_bottom - 64, width - margin - 60, box_bottom - 56], fill=(56, 189, 248))

    out = BytesIO()
    im.save(out, format="JPEG", quality=90)
    return out.getvalue()


def normalize_to_jpeg(image_bytes: bytes, target_width: int = 1024, target_height: int = 768) -> bytes:
    """Resize and convert to standard JPEG."""
    try:
        im = Image.open(BytesIO(image_bytes))
        im = im.convert("RGB")
        im.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)
        out = BytesIO()
        im.save(out, format="JPEG", quality=88)
        return out.getvalue()
    except Exception as e:
        logger.debug(f"[PIL normalize] Error: {e}")
        return image_bytes


def resolve_image(query: str, title: str = "", width: int = 1024, height: int = 768) -> Dict[str, Any]:
    """Resolve an educational diagram/image via multi-tier caching resolver."""
    clean_q = clean_search_query(query)
    cache_key = hashlib.md5(f"{clean_q}_{width}_{height}".encode("utf-8")).hexdigest()
    cache_file = CACHE_DIR / f"{cache_key}.jpg"

    if cache_file.exists() and cache_file.stat().st_size > 3000:
        return {
            "url": f"/static/images/{cache_key}.jpg",
            "file_path": str(cache_file),
            "source": "cache",
            "cache_key": cache_key,
            "query": query,
        }

    raw: Optional[bytes] = None
    source = "procedural"

    # Tier 1: Wikimedia Commons
    raw = fetch_from_wikimedia(clean_q, width=width)
    if raw:
        source = "wikimedia"

    # Tier 2: DuckDuckGo
    if not raw:
        raw = fetch_from_ddg(f"{clean_q} diagram")
        if raw:
            source = "duckduckgo"

    # Tier 3: Fast Pollinations fallback
    if not raw:
        raw = fetch_from_pollinations_safe(clean_q, width=width, height=height)
        if raw:
            source = "pollinations"

    # Tier 4: Procedural schematic (guaranteed)
    if not raw:
        raw = create_procedural_schematic(title or clean_q, clean_q, width, height)
        source = "procedural"

    jpeg_bytes = normalize_to_jpeg(raw, width, height)
    with open(cache_file, "wb") as f:
        f.write(jpeg_bytes)

    return {
        "url": f"/static/images/{cache_key}.jpg",
        "file_path": str(cache_file),
        "source": source,
        "cache_key": cache_key,
        "query": query,
    }


async def resolve_image_async(query: str, title: str = "", width: int = 1024, height: int = 768) -> Dict[str, Any]:
    """Asynchronous wrapper for resolve_image using thread executor."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, resolve_image, query, title, width, height)
