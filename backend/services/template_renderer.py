"""Template Renderer Service for Presenton 16 Master Design Packs."""

import json
import logging
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

try:
    from backend.core.config import settings
except ImportError:
    from core.config import settings

logger = logging.getLogger(__name__)

CATALOG_DIR = settings.ROOT_DIR / "backend" / "templates" / "catalog"
RENDERER_SCRIPT = settings.ROOT_DIR / "backend" / "tools" / "slides" / "render_layout_html.mjs"


def get_template_catalog_info(template_id: str) -> Optional[Dict[str, Any]]:
    """Load metadata, theme colors, and layout catalog for a given template ID."""
    clean_id = (template_id or "").lower().strip()
    tpl_path = CATALOG_DIR / clean_id / "template.json"
    if not tpl_path.exists():
        return None

    try:
        with open(tpl_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        theme_data = data.get("theme", {}) or {}
        colors = theme_data.get("colors", {}) or {}
        fonts = theme_data.get("fonts", {}) or {}

        layouts_summary: List[Dict[str, str]] = []
        for l in data.get("layouts", []):
            l_id = l.get("id", "")
            desc = l.get("description") or l_id.replace("_", " ").title()
            layouts_summary.append({
                "id": l_id,
                "description": desc
            })

        return {
            "id": clean_id,
            "name": data.get("name", clean_id.title()),
            "description": data.get("description", ""),
            "colors": colors,
            "fonts": fonts,
            "layouts": layouts_summary,
            "layout_count": len(layouts_summary)
        }
    except Exception as e:
        logger.error(f"Failed to load template info for '{template_id}': {e}")
        return None


def render_template_layout_html(
    template_id: str,
    layout_id: Optional[str],
    slide_dict: Dict[str, Any]
) -> Tuple[Optional[str], Optional[str]]:
    """Render authentic Presenton layout HTML by invoking node renderer."""
    clean_id = (template_id or "").lower().strip()
    tpl_info = get_template_catalog_info(clean_id)
    if not tpl_info:
        return None, None

    req_payload = {
        "template_id": clean_id,
        "layout_id": layout_id,
        "slide": slide_dict
    }

    try:
        res = subprocess.run(
            ["node", str(RENDERER_SCRIPT)],
            input=json.dumps(req_payload),
            text=True,
            capture_output=True,
            timeout=5
        )
        if res.returncode == 0 and res.stdout.strip():
            result = json.loads(res.stdout.strip())
            html = result.get("html")
            chosen_layout = result.get("layoutId")
            return html, chosen_layout
        else:
            logger.warning(f"Node template rendering returned non-zero ({res.returncode}): {res.stderr}")
    except Exception as e:
        logger.warning(f"Error invoking node template renderer: {e}")

    return None, None
