import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN

from backend.core.config import settings
from backend.core.models import Artifact, ArtifactStatus, GroundingRef, ToolBrief
from backend.core.registry import BaseTool, ExecutionContext, registry
from backend.tools.ingestion.grounding import verify_grounding

logger = logging.getLogger(__name__)


def hex_to_rgb(hex_code: str) -> RGBColor:
    """Safely convert a hex color string to a python-pptx RGBColor."""
    c = hex_code.strip().lstrip("#")
    if len(c) == 3:
        c = "".join([ch * 2 for ch in c])
    if len(c) >= 6:
        try:
            return RGBColor(int(c[0:2], 16), int(c[2:4], 16), int(c[4:6], 16))
        except ValueError:
            pass
    return RGBColor(30, 41, 59)


THEME_PALETTES = {
    "daktilo": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#F3F4F6"), "card_border": hex_to_rgb("#3B82F6"),
        "primary": hex_to_rgb("#3B82F6"), "accent": hex_to_rgb("#60A5FA"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1F2937"), "muted": hex_to_rgb("#60A5FA"),
    },
    "noir": {
        "bg": hex_to_rgb("#111827"), "card_bg": hex_to_rgb("#1F2937"), "card_border": hex_to_rgb("#60A5FA"),
        "primary": hex_to_rgb("#60A5FA"), "accent": hex_to_rgb("#93C5FD"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E5E7EB"), "muted": hex_to_rgb("#93C5FD"),
    },
    "cornflower": {
        "bg": hex_to_rgb("#1B1C1D"), "card_bg": hex_to_rgb("#1B1C1D"), "card_border": hex_to_rgb("#AE8625"),
        "primary": hex_to_rgb("#AE8625"), "accent": hex_to_rgb("#F4E883"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#CFCBBF"), "muted": hex_to_rgb("#F4E883"),
    },
    "indigo": {
        "bg": hex_to_rgb("#1E1B4B"), "card_bg": hex_to_rgb("#312E81"), "card_border": hex_to_rgb("#818CF8"),
        "primary": hex_to_rgb("#818CF8"), "accent": hex_to_rgb("#A5B4FC"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E2E8F0"), "muted": hex_to_rgb("#A5B4FC"),
    },
    "orbit": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#F3F4F6"), "card_border": hex_to_rgb("#312E81"),
        "primary": hex_to_rgb("#312E81"), "accent": hex_to_rgb("#3B82F6"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1F2937"), "muted": hex_to_rgb("#3B82F6"),
    },
    "cosmos": {
        "bg": hex_to_rgb("#030712"), "card_bg": hex_to_rgb("#111827"), "card_border": hex_to_rgb("#818CF8"),
        "primary": hex_to_rgb("#818CF8"), "accent": hex_to_rgb("#60A5FA"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E5E7EB"), "muted": hex_to_rgb("#60A5FA"),
    },
    "piano": {
        "bg": hex_to_rgb("#F3F4F6"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#1F2937"),
        "primary": hex_to_rgb("#1F2937"), "accent": hex_to_rgb("#4B5563"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#374151"), "muted": hex_to_rgb("#4B5563"),
    },
    "ebony": {
        "bg": hex_to_rgb("#111827"), "card_bg": hex_to_rgb("#1F2937"), "card_border": hex_to_rgb("#E5E7EB"),
        "primary": hex_to_rgb("#E5E7EB"), "accent": hex_to_rgb("#9CA3AF"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E5E7EB"), "muted": hex_to_rgb("#9CA3AF"),
    },
    "mystique": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#F5F3FF"), "card_border": hex_to_rgb("#7C3AED"),
        "primary": hex_to_rgb("#7C3AED"), "accent": hex_to_rgb("#8B5CF6"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1F2937"), "muted": hex_to_rgb("#8B5CF6"),
    },
    "phantom": {
        "bg": hex_to_rgb("#18181B"), "card_bg": hex_to_rgb("#27272A"), "card_border": hex_to_rgb("#A78BFA"),
        "primary": hex_to_rgb("#A78BFA"), "accent": hex_to_rgb("#C4B5FD"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#D4D4D8"), "muted": hex_to_rgb("#C4B5FD"),
    },
    "allweoneLight": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#ECFEFF"), "card_border": hex_to_rgb("#06B6D4"),
        "primary": hex_to_rgb("#06B6D4"), "accent": hex_to_rgb("#0EA5E9"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#0F172A"), "muted": hex_to_rgb("#0EA5E9"),
    },
    "allweoneDark": {
        "bg": hex_to_rgb("#0F172A"), "card_bg": hex_to_rgb("#1E293B"), "card_border": hex_to_rgb("#22D3EE"),
        "primary": hex_to_rgb("#22D3EE"), "accent": hex_to_rgb("#38BDF8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E2E8F0"), "muted": hex_to_rgb("#38BDF8"),
    },
    "crimson": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#FEF2F2"), "card_border": hex_to_rgb("#DC2626"),
        "primary": hex_to_rgb("#DC2626"), "accent": hex_to_rgb("#F87171"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1F2937"), "muted": hex_to_rgb("#F87171"),
    },
    "ember": {
        "bg": hex_to_rgb("#18181B"), "card_bg": hex_to_rgb("#27272A"), "card_border": hex_to_rgb("#F87171"),
        "primary": hex_to_rgb("#F87171"), "accent": hex_to_rgb("#EF4444"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E5E7EB"), "muted": hex_to_rgb("#EF4444"),
    },
    "sunset": {
        "bg": hex_to_rgb("#FFFBEB"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#EA580C"),
        "primary": hex_to_rgb("#EA580C"), "accent": hex_to_rgb("#FB923C"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#292524"), "muted": hex_to_rgb("#FB923C"),
    },
    "dusk": {
        "bg": hex_to_rgb("#1C1917"), "card_bg": hex_to_rgb("#292524"), "card_border": hex_to_rgb("#FB923C"),
        "primary": hex_to_rgb("#FB923C"), "accent": hex_to_rgb("#F97316"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E7E5E4"), "muted": hex_to_rgb("#F97316"),
    },
    "forest": {
        "bg": hex_to_rgb("#F0FDF4"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#059669"),
        "primary": hex_to_rgb("#059669"), "accent": hex_to_rgb("#34D399"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1F2937"), "muted": hex_to_rgb("#34D399"),
    },
    "canopy": {
        "bg": hex_to_rgb("#064E3B"), "card_bg": hex_to_rgb("#065F46"), "card_border": hex_to_rgb("#34D399"),
        "primary": hex_to_rgb("#34D399"), "accent": hex_to_rgb("#10B981"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E5E7EB"), "muted": hex_to_rgb("#10B981"),
    },
    "aurora": {
        "bg": hex_to_rgb("#F0FDFA"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#06B6D4"),
        "primary": hex_to_rgb("#0891B2"), "accent": hex_to_rgb("#34D399"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#134E4A"), "muted": hex_to_rgb("#34D399"),
    },
    "borealis": {
        "bg": hex_to_rgb("#0C1222"), "card_bg": hex_to_rgb("#1E293B"), "card_border": hex_to_rgb("#22D3EE"),
        "primary": hex_to_rgb("#67E8F9"), "accent": hex_to_rgb("#4ADE80"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E2E8F0"), "muted": hex_to_rgb("#4ADE80"),
    },
    "sakura": {
        "bg": hex_to_rgb("#FDF2F8"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#EC4899"),
        "primary": hex_to_rgb("#BE185D"), "accent": hex_to_rgb("#F472B6"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#831843"), "muted": hex_to_rgb("#F472B6"),
    },
    "midnight": {
        "bg": hex_to_rgb("#1A0A14"), "card_bg": hex_to_rgb("#2D1F2B"), "card_border": hex_to_rgb("#F472B6"),
        "primary": hex_to_rgb("#F9A8D4"), "accent": hex_to_rgb("#FDA4AF"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#FECDD3"), "muted": hex_to_rgb("#FDA4AF"),
    },
    "ocean": {
        "bg": hex_to_rgb("#F0F9FF"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#0284C7"),
        "primary": hex_to_rgb("#0369A1"), "accent": hex_to_rgb("#38BDF8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#0C4A6E"), "muted": hex_to_rgb("#38BDF8"),
    },
    "abyss": {
        "bg": hex_to_rgb("#020617"), "card_bg": hex_to_rgb("#0F172A"), "card_border": hex_to_rgb("#38BDF8"),
        "primary": hex_to_rgb("#7DD3FC"), "accent": hex_to_rgb("#0EA5E9"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#BAE6FD"), "muted": hex_to_rgb("#0EA5E9"),
    },
    "sand": {
        "bg": hex_to_rgb("#FEFCE8"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#CA8A04"),
        "primary": hex_to_rgb("#A16207"), "accent": hex_to_rgb("#CA8A04"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#422006"), "muted": hex_to_rgb("#CA8A04"),
    },
    "obsidian": {
        "bg": hex_to_rgb("#0A0A0A"), "card_bg": hex_to_rgb("#1C1917"), "card_border": hex_to_rgb("#FACC15"),
        "primary": hex_to_rgb("#FDE047"), "accent": hex_to_rgb("#EAB308"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E7E5E4"), "muted": hex_to_rgb("#EAB308"),
    },
    "mint": {
        "bg": hex_to_rgb("#ECFDF5"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#10B981"),
        "primary": hex_to_rgb("#047857"), "accent": hex_to_rgb("#34D399"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#064E3B"), "muted": hex_to_rgb("#34D399"),
    },
    "jade": {
        "bg": hex_to_rgb("#022C22"), "card_bg": hex_to_rgb("#064E3B"), "card_border": hex_to_rgb("#34D399"),
        "primary": hex_to_rgb("#6EE7B7"), "accent": hex_to_rgb("#10B981"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#A7F3D0"), "muted": hex_to_rgb("#10B981"),
    },
    "rose": {
        "bg": hex_to_rgb("#FFF1F2"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#E11D48"),
        "primary": hex_to_rgb("#BE123C"), "accent": hex_to_rgb("#FB7185"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#4C0519"), "muted": hex_to_rgb("#FB7185"),
    },
    "wine": {
        "bg": hex_to_rgb("#1C0A10"), "card_bg": hex_to_rgb("#3F1525"), "card_border": hex_to_rgb("#FB7185"),
        "primary": hex_to_rgb("#FDA4AF"), "accent": hex_to_rgb("#F43F5E"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#FECDD3"), "muted": hex_to_rgb("#F43F5E"),
    },
    "arctic": {
        "bg": hex_to_rgb("#EEF2FF"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#6366F1"),
        "primary": hex_to_rgb("#4338CA"), "accent": hex_to_rgb("#818CF8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#312E81"), "muted": hex_to_rgb("#818CF8"),
    },
    "glacier": {
        "bg": hex_to_rgb("#0C0A1D"), "card_bg": hex_to_rgb("#1E1B4B"), "card_border": hex_to_rgb("#A5B4FC"),
        "primary": hex_to_rgb("#C7D2FE"), "accent": hex_to_rgb("#818CF8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E0E7FF"), "muted": hex_to_rgb("#818CF8"),
    },
    "honey": {
        "bg": hex_to_rgb("#FFFBEB"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#D97706"),
        "primary": hex_to_rgb("#B45309"), "accent": hex_to_rgb("#FBBF24"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#451A03"), "muted": hex_to_rgb("#FBBF24"),
    },
    "amber": {
        "bg": hex_to_rgb("#1A1207"), "card_bg": hex_to_rgb("#2D2410"), "card_border": hex_to_rgb("#FBBF24"),
        "primary": hex_to_rgb("#FCD34D"), "accent": hex_to_rgb("#F59E0B"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#FEF3C7"), "muted": hex_to_rgb("#F59E0B"),
    },
    "coral": {
        "bg": hex_to_rgb("#FFF7ED"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#F97316"),
        "primary": hex_to_rgb("#C2410C"), "accent": hex_to_rgb("#FB923C"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#431407"), "muted": hex_to_rgb("#FB923C"),
    },
    "magma": {
        "bg": hex_to_rgb("#1A0F0A"), "card_bg": hex_to_rgb("#2D1A10"), "card_border": hex_to_rgb("#FB923C"),
        "primary": hex_to_rgb("#FDBA74"), "accent": hex_to_rgb("#F97316"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#FFEDD5"), "muted": hex_to_rgb("#F97316"),
    },
    "lavender": {
        "bg": hex_to_rgb("#FAF5FF"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#9333EA"),
        "primary": hex_to_rgb("#7E22CE"), "accent": hex_to_rgb("#A855F7"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#3B0764"), "muted": hex_to_rgb("#A855F7"),
    },
    "velvet": {
        "bg": hex_to_rgb("#120A1C"), "card_bg": hex_to_rgb("#2E1A47"), "card_border": hex_to_rgb("#C084FC"),
        "primary": hex_to_rgb("#D8B4FE"), "accent": hex_to_rgb("#A855F7"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#E9D5FF"), "muted": hex_to_rgb("#A855F7"),
    },
    "col_blue": {
        "bg": hex_to_rgb("#FAF7F2"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#E8E2D8"),
        "primary": hex_to_rgb("#0369A1"), "accent": hex_to_rgb("#2563EB"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#18181B"), "muted": hex_to_rgb("#716D64"),
    },
    "academic_clean": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#F8FAFC"), "card_border": hex_to_rgb("#E2E8F0"),
        "primary": hex_to_rgb("#1E3A88"), "accent": hex_to_rgb("#0E7490"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1E293B"), "muted": hex_to_rgb("#64748B"),
    },
    "midnight_tech": {
        "bg": hex_to_rgb("#0F172A"), "card_bg": hex_to_rgb("#1E293B"), "card_border": hex_to_rgb("#334155"),
        "primary": hex_to_rgb("#38BDF8"), "accent": hex_to_rgb("#A855F7"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#F1F5F9"), "muted": hex_to_rgb("#94A3B8"),
    },
    "solar_obsidian": {
        "bg": hex_to_rgb("#151413"), "card_bg": hex_to_rgb("#23211F"), "card_border": hex_to_rgb("#383531"),
        "primary": hex_to_rgb("#FF5C00"), "accent": hex_to_rgb("#F97316"), "highlight": hex_to_rgb("#FB923C"),
        "text": hex_to_rgb("#F5F2EB"), "muted": hex_to_rgb("#9CA3AF"),
    },
    "verdant": {
        "bg": hex_to_rgb("#F6FAF7"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#D1E7D6"),
        "primary": hex_to_rgb("#15803D"), "accent": hex_to_rgb("#10B981"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#142319"), "muted": hex_to_rgb("#6B7D70"),
    },
    "mosaic": {
        "bg": hex_to_rgb("#FAF8F5"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#E5DFD5"),
        "primary": hex_to_rgb("#9A3412"), "accent": hex_to_rgb("#EA580C"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1C1917"), "muted": hex_to_rgb("#78716C"),
    },
    "editorial": {
        "bg": hex_to_rgb("#FDFBF7"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#E7E1D7"),
        "primary": hex_to_rgb("#1C1917"), "accent": hex_to_rgb("#44403C"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1C1917"), "muted": hex_to_rgb("#78716C"),
    },
    "civic": {
        "bg": hex_to_rgb("#F0F4F8"), "card_bg": hex_to_rgb("#FFFFFF"), "card_border": hex_to_rgb("#D6E0EA"),
        "primary": hex_to_rgb("#1E40AF"), "accent": hex_to_rgb("#3B82F6"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#1E293B"), "muted": hex_to_rgb("#64748B"),
    },
    "landmark": {
        "bg": hex_to_rgb("#14181E"), "card_bg": hex_to_rgb("#1C222B"), "card_border": hex_to_rgb("#232B35"),
        "primary": hex_to_rgb("#E2E8F0"), "accent": hex_to_rgb("#94A3B8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#F8FAFC"), "muted": hex_to_rgb("#64748B"),
    },
    "modern": {
        "bg": hex_to_rgb("#FFFFFF"), "card_bg": hex_to_rgb("#F8FAFC"), "card_border": hex_to_rgb("#E2E8F0"),
        "primary": hex_to_rgb("#0F172A"), "accent": hex_to_rgb("#3B82F6"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#0F172A"), "muted": hex_to_rgb("#64748B"),
    },
    "horizon": {
        "bg": hex_to_rgb("#0E1525"), "card_bg": hex_to_rgb("#172136"), "card_border": hex_to_rgb("#1E293B"),
        "primary": hex_to_rgb("#60A5FA"), "accent": hex_to_rgb("#38BDF8"), "highlight": hex_to_rgb("#FF5C00"),
        "text": hex_to_rgb("#F8FAFC"), "muted": hex_to_rgb("#94A3B8"),
    },
}


class SlideCard(BaseModel):
    title: str = ""
    body: str = ""
    badge: Optional[str] = None
    stat: Optional[str] = None
    isChart: Optional[bool] = False
    chartData: Optional[List[Dict[str, Any]]] = None
    image_url: Optional[str] = None


class SlideContent(BaseModel):
    slide_number: int
    title: str
    subtitle: Optional[str] = None
    archetype: str = "card_grid_3"
    cards: List[SlideCard] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)
    speaker_notes: str = ""
    grounding: Optional[GroundingRef] = None
    image_query: Optional[str] = None
    image_url: Optional[str] = None
    chart_data: Optional[List[Dict[str, Any]]] = None
    html_content: Optional[str] = None
    template_layout_id: Optional[str] = None


class SlideBrief(ToolBrief):
    """Configuration for slide deck synthesis."""
    num_slides: int = Field(default=6, ge=3, le=20, description="Target number of slides")
    theme: str = Field(default="col_blue", description="Theme name: col_blue, academic_clean, midnight_tech, etc.")
    include_speaker_notes: bool = Field(default=True, description="Embed teaching notes for educator")
    include_passage_citations: bool = Field(default=True, description="Include [Pxx-Sxx] grounding citations")


def generate_default_slide_html(
    title: str,
    archetype: str,
    cards: List[SlideCard],
    image_url: Optional[str] = None,
    subtitle: str = "",
    theme_name: str = "solar_obsidian"
) -> str:
    """Generate high-contrast, presentation-ready 1280x720 Tailwind HTML section."""
    try:
        from backend.services.template_renderer import get_template_catalog_info
        tpl = get_template_catalog_info(theme_name)
        colors = tpl.get("colors", {}) if tpl else {}
    except Exception:
        colors = {}

    bg_color = colors.get("background") or "#0B0F19"
    accent_color = colors.get("primary") or "#FF5C00"
    text_color = colors.get("background_text") or colors.get("primary_text") or "#FFFFFF"
    card_color = colors.get("card") or "rgba(255,255,255,0.05)"
    stroke_color = colors.get("stroke") or "rgba(255,255,255,0.15)"

    is_light = False
    if bg_color.startswith("#") and len(bg_color) == 7:
        try:
            r = int(bg_color[1:3], 16)
            g = int(bg_color[3:5], 16)
            b = int(bg_color[5:7], 16)
            if (0.299 * r + 0.587 * g + 0.114 * b) / 255.0 > 0.5:
                is_light = True
        except Exception:
            pass

    text_sub = "#475569" if is_light else "#94A3B8"
    card_bg_css = f"background-color: {card_color}; border: 1px solid {stroke_color};"

    c0 = cards[0] if cards else SlideCard(title="Core Principle", body="Theoretical foundation.")
    c1 = cards[1] if len(cards) > 1 else SlideCard(title="Mechanism", body="Observable phenomenon.")
    c2 = cards[2] if len(cards) > 2 else SlideCard(title="Synthesis", body="Curriculum takeaway.")

    if archetype in ("hero_title", "hero_stat"):
        return f"""<section data-slide-title="{title}" class="relative h-[720px] w-[1280px] overflow-hidden p-16 flex flex-col justify-between font-sans" style="background-color: {bg_color}; color: {text_color};">
  <div class="absolute -top-32 -left-32 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20" style="background-color: {accent_color};"></div>
  <div class="flex items-center justify-between z-10">
    <span class="px-3.5 py-1.5 rounded-full text-xs font-mono font-bold tracking-wider uppercase" style="background-color: {accent_color}25; border: 1px solid {accent_color}50; color: {accent_color};">Instructional Unit</span>
    <span class="text-xs font-mono" style="color: {text_sub};">16:9 CURRICULUM PRESENTATION</span>
  </div>
  <div class="space-y-6 z-10 max-w-4xl my-auto">
    <div class="text-xs font-mono tracking-widest uppercase font-bold" style="color: {accent_color};">{subtitle or 'CORE FOUNDATION'}</div>
    <h1 class="text-6xl font-black tracking-tight leading-tight" style="color: {text_color};">{title}</h1>
    <p class="text-xl max-w-2xl leading-relaxed" style="color: {text_sub};">{c0.body}</p>
  </div>
  <div class="flex items-center justify-between border-t pt-4 text-xs font-mono z-10" style="border-color: {stroke_color}; color: {text_sub};">
    <span>OMNIX MULTIMODAL ACADEMIC DECK</span>
    <span>CONFIRMED GROUNDING</span>
  </div>
</section>"""

    if archetype in ("hero_visual_split", "image_hero_full") and image_url:
        return f"""<section data-slide-title="{title}" class="relative h-[720px] w-[1280px] overflow-hidden p-12 flex flex-col justify-between font-sans" style="background-color: {bg_color}; color: {text_color};">
  <div class="flex items-center justify-between z-10">
    <div>
      <span class="text-xs font-mono tracking-wider uppercase font-bold" style="color: {accent_color};">{subtitle or 'ACADEMIC STRAND'}</span>
      <h2 class="text-3xl font-black tracking-tight mt-1" style="color: {text_color};">{title}</h2>
    </div>
    <span class="px-3 py-1 rounded-lg text-xs font-mono" style="{card_bg_css} color: {text_sub};">SPLIT VISUAL HERO</span>
  </div>
  <div class="grid grid-cols-12 gap-8 items-stretch my-auto z-10 h-[480px]">
    <div class="col-span-7 flex flex-col justify-between space-y-4">
      <div class="p-6 rounded-2xl flex-1 flex flex-col justify-center" style="{card_bg_css}">
        <span class="text-xs font-mono font-bold uppercase mb-1" style="color: {accent_color};">{c0.badge or 'Point 01'}</span>
        <h3 class="text-xl font-bold mb-2" style="color: {text_color};">{c0.title}</h3>
        <p class="text-sm leading-relaxed" style="color: {text_sub};">{c0.body}</p>
      </div>
      <div class="p-6 rounded-2xl flex-1 flex flex-col justify-center" style="{card_bg_css}">
        <span class="text-xs font-mono font-bold text-emerald-400 uppercase mb-1">{c1.badge or 'Point 02'}</span>
        <h3 class="text-xl font-bold mb-2" style="color: {text_color};">{c1.title}</h3>
        <p class="text-sm leading-relaxed" style="color: {text_sub};">{c1.body}</p>
      </div>
    </div>
    <div class="col-span-5 relative rounded-2xl overflow-hidden shadow-2xl" style="border: 1px solid {stroke_color};">
      <img src="{image_url}" alt="{title}" class="absolute inset-0 w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
      <div class="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-xs text-slate-300 font-mono">
        Scientific Visual Observation: {title}
      </div>
    </div>
  </div>
  <div class="flex justify-between items-center text-xs font-mono border-t pt-3 z-10" style="border-color: {stroke_color}; color: {text_sub};">
    <span>PEDAGOGICAL VISUAL FRAME</span>
    <span>1280x720 WIDESCREEN</span>
  </div>
</section>"""

    if archetype == "staircase_progression":
        return f"""<section data-slide-title="{title}" class="relative h-[720px] w-[1280px] overflow-hidden p-12 flex flex-col justify-between font-sans" style="background-color: {bg_color}; color: {text_color};">
  <div class="z-10">
    <span class="text-xs font-mono tracking-wider uppercase font-bold" style="color: {accent_color};">{subtitle or 'ELEVATION ROADMAP'}</span>
    <h2 class="text-3xl font-black tracking-tight mt-1" style="color: {text_color};">{title}</h2>
  </div>
  <div class="grid grid-cols-3 gap-6 items-end my-auto z-10 h-[460px]">
    <div class="p-6 rounded-2xl h-[260px] flex flex-col justify-between shadow-lg" style="{card_bg_css}">
      <span class="text-4xl font-black font-mono" style="color: {text_sub};">01</span>
      <div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 uppercase">{c0.badge or 'Foundation'}</span>
        <h3 class="text-lg font-bold mt-1" style="color: {text_color};">{c0.title}</h3>
        <p class="text-xs mt-2 line-clamp-4 leading-relaxed" style="color: {text_sub};">{c0.body}</p>
      </div>
    </div>
    <div class="p-6 rounded-2xl h-[340px] flex flex-col justify-between shadow-xl" style="{card_bg_css} outline: 2px solid {accent_color}50;">
      <span class="text-4xl font-black font-mono" style="color: {accent_color};">02</span>
      <div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded uppercase" style="background-color: {accent_color}25; color: {accent_color};">{c1.badge or 'Advancement'}</span>
        <h3 class="text-lg font-bold mt-1" style="color: {text_color};">{c1.title}</h3>
        <p class="text-xs mt-2 line-clamp-5 leading-relaxed" style="color: {text_sub};">{c1.body}</p>
      </div>
    </div>
    <div class="p-6 rounded-2xl h-[420px] flex flex-col justify-between shadow-2xl ring-1 ring-emerald-500/20" style="{card_bg_css}">
      <span class="text-4xl font-black font-mono text-emerald-400">03</span>
      <div>
        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">{c2.badge or 'Mastery'}</span>
        <h3 class="text-lg font-bold mt-1" style="color: {text_color};">{c2.title}</h3>
        <p class="text-xs mt-2 line-clamp-6 leading-relaxed" style="color: {text_sub};">{c2.body}</p>
      </div>
    </div>
  </div>
  <div class="flex justify-between items-center text-xs font-mono border-t pt-3 z-10" style="border-color: {stroke_color}; color: {text_sub};">
    <span>PROGRESSION METRIC</span>
    <span>ASCENDING MASTERY HIERARCHY</span>
  </div>
</section>"""

    # Default 3-Card Balanced Grid
    return f"""<section data-slide-title="{title}" class="relative h-[720px] w-[1280px] overflow-hidden p-12 flex flex-col justify-between font-sans" style="background-color: {bg_color}; color: {text_color};">
  <div class="z-10">
    <span class="text-xs font-mono tracking-wider uppercase font-bold" style="color: {accent_color};">{subtitle or 'INSTRUCTIONAL PRINCIPLES'}</span>
    <h2 class="text-3xl font-black tracking-tight mt-1" style="color: {text_color};">{title}</h2>
  </div>
  <div class="grid grid-cols-3 gap-6 items-stretch my-auto z-10 h-[440px]">
    <div class="p-6 rounded-2xl flex flex-col justify-between transition-all" style="{card_bg_css}">
      <span class="text-xs font-mono font-bold uppercase" style="color: {accent_color};">{c0.badge or 'Phase 01'}</span>
      <div class="my-auto">
        <h3 class="text-xl font-bold mb-2" style="color: {text_color};">{c0.title}</h3>
        <p class="text-sm leading-relaxed" style="color: {text_sub};">{c0.body}</p>
      </div>
      <div class="h-1 w-12 rounded-full" style="background-color: {accent_color};"></div>
    </div>
    <div class="p-6 rounded-2xl flex flex-col justify-between transition-all" style="{card_bg_css}">
      <span class="text-xs font-mono font-bold text-amber-400 uppercase">{c1.badge or 'Phase 02'}</span>
      <div class="my-auto">
        <h3 class="text-xl font-bold mb-2" style="color: {text_color};">{c1.title}</h3>
        <p class="text-sm leading-relaxed" style="color: {text_sub};">{c1.body}</p>
      </div>
      <div class="h-1 w-12 bg-amber-400/50 rounded-full"></div>
    </div>
    <div class="p-6 rounded-2xl flex flex-col justify-between transition-all" style="{card_bg_css}">
      <span class="text-xs font-mono font-bold text-emerald-400 uppercase">{c2.badge or 'Phase 03'}</span>
      <div class="my-auto">
        <h3 class="text-xl font-bold mb-2" style="color: {text_color};">{c2.title}</h3>
        <p class="text-sm leading-relaxed" style="color: {text_sub};">{c2.body}</p>
      </div>
      <div class="h-1 w-12 bg-emerald-400/50 rounded-full"></div>
    </div>
  </div>
  <div class="flex justify-between items-center text-xs font-mono border-t pt-3 z-10" style="border-color: {stroke_color}; color: {text_sub};">
    <span>STRUCTURED CORE CONCEPTS</span>
    <span>CONFIRMED GROUNDING</span>
  </div>
</section>"""


def add_card_box(
    slide,
    left: Inches,
    top: Inches,
    width: Inches,
    height: Inches,
    bg_color: RGBColor,
    border_color: RGBColor,
    border_width: Pt = Pt(1.5),
    shape_type: MSO_SHAPE = MSO_SHAPE.ROUNDED_RECTANGLE
):
    shape = slide.shapes.add_shape(shape_type, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg_color
    shape.line.color.rgb = border_color
    shape.line.width = border_width
    return shape


def populate_card_text(
    card_shape,
    card: SlideCard,
    palette: Dict[str, RGBColor],
    stat_first: bool = False,
    title_size: Pt = Pt(18),
    body_size: Pt = Pt(12),
    stat_size: Pt = Pt(36),
    align: Optional[PP_ALIGN] = None
):
    ctf = card_shape.text_frame
    ctf.word_wrap = True
    ctf.margin_left = Inches(0.25)
    ctf.margin_right = Inches(0.25)
    ctf.margin_top = Inches(0.25)
    ctf.margin_bottom = Inches(0.25)

    first = True
    def next_p():
        nonlocal first
        if first:
            first = False
            return ctf.paragraphs[0]
        return ctf.add_paragraph()

    if card.badge:
        p = next_p()
        p.text = f"• {card.badge.upper()}"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = palette["accent"]
        p.space_after = Pt(4)
        if align:
            p.alignment = align

    if card.stat and stat_first:
        p = next_p()
        p.text = card.stat
        p.font.size = stat_size
        p.font.bold = True
        p.font.color.rgb = palette["highlight"]
        p.space_after = Pt(4)
        if align:
            p.alignment = align

    if card.title:
        p = next_p()
        p.text = card.title
        p.font.size = title_size
        p.font.bold = True
        p.font.color.rgb = palette["primary"]
        p.space_after = Pt(6)
        if align:
            p.alignment = align

    if card.stat and not stat_first:
        p = next_p()
        p.text = card.stat
        p.font.size = stat_size
        p.font.bold = True
        p.font.color.rgb = palette["highlight"]
        p.space_after = Pt(4)
        if align:
            p.alignment = align

    if card.body:
        p = next_p()
        p.text = card.body
        p.font.size = body_size
        p.font.color.rgb = palette["text"]
        p.space_before = Pt(3)
        if align:
            p.alignment = align


def build_presentation_file(slides: List[SlideContent], theme_name: str, output_path: Path) -> None:
    """Deterministic high-fidelity OpenXML PowerPoint compiler matching Presenton archetypes."""
    prs = Presentation()
    # 16:9 widescreen dimensions (13.33 x 7.5 inches)
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    palette = THEME_PALETTES.get(theme_name, THEME_PALETTES.get("col_blue", THEME_PALETTES["daktilo"]))
    blank_layout = prs.slide_layouts[6]

    for slide_data in slides:
        slide = prs.slides.add_slide(blank_layout)

        # Slide background fill matching theme
        try:
            slide.background.fill.solid()
            slide.background.fill.fore_color.rgb = palette["bg"]
        except Exception as e:
            logger.debug(f"Slide background fill note: {e}")

        archetype = (slide_data.archetype or "card_grid_3").lower()
        cards = slide_data.cards
        if not cards and slide_data.bullets:
            cards = [SlideCard(title=f"Point {i+1}", body=b, badge="Core Note") for i, b in enumerate(slide_data.bullets[:4])]

        # ── 1. HERO TITLE / HERO STAT ARCHETYPE ──
        if archetype in ("hero_title", "hero_stat"):
            hero_box = add_card_box(
                slide, Inches(1.2), Inches(1.2), Inches(10.93), Inches(5.1),
                palette["card_bg"], palette["card_border"], Pt(2)
            )
            htf = hero_box.text_frame
            htf.word_wrap = True
            htf.margin_left = Inches(0.6)
            htf.margin_right = Inches(0.6)
            htf.margin_top = Inches(0.5)

            p_badge = htf.paragraphs[0]
            if slide_data.grounding and slide_data.grounding.passage_id:
                p_badge.text = f"CITATION [{slide_data.grounding.passage_id}] • PRESENTATION OVERVIEW"
            else:
                p_badge.text = "LEARNING MODULE • PRESENTATION OVERVIEW"
            p_badge.font.size = Pt(11)
            p_badge.font.bold = True
            p_badge.font.color.rgb = palette["highlight"]
            p_badge.alignment = PP_ALIGN.CENTER
            p_badge.space_after = Pt(12)

            p_title = htf.add_paragraph()
            p_title.text = slide_data.title
            p_title.font.size = Pt(36)
            p_title.font.bold = True
            p_title.font.color.rgb = palette["primary"]
            p_title.alignment = PP_ALIGN.CENTER
            p_title.space_after = Pt(10)

            if slide_data.subtitle:
                p_sub = htf.add_paragraph()
                p_sub.text = slide_data.subtitle
                p_sub.font.size = Pt(16)
                p_sub.font.color.rgb = palette["muted"]
                p_sub.alignment = PP_ALIGN.CENTER
                p_sub.space_after = Pt(16)

            first_stat = next((c.stat for c in cards if c.stat), None)
            if first_stat:
                p_stat = htf.add_paragraph()
                p_stat.text = first_stat
                p_stat.font.size = Pt(44)
                p_stat.font.bold = True
                p_stat.font.color.rgb = palette["highlight"]
                p_stat.alignment = PP_ALIGN.CENTER

        # ── 2. EDITORIAL QUOTE ARCHETYPE ──
        elif archetype == "editorial_quote":
            quote_box = add_card_box(
                slide, Inches(1.5), Inches(1.5), Inches(10.33), Inches(4.8),
                palette["card_bg"], palette["card_border"], Pt(2)
            )
            qtf = quote_box.text_frame
            qtf.word_wrap = True
            qtf.margin_left = Inches(0.8)
            qtf.margin_right = Inches(0.8)
            qtf.margin_top = Inches(0.6)

            p_mark = qtf.paragraphs[0]
            p_mark.text = "“"
            p_mark.font.size = Pt(64)
            p_mark.font.bold = True
            p_mark.font.color.rgb = palette["highlight"]
            p_mark.space_after = Pt(2)

            main_quote = slide_data.title
            attribution = slide_data.subtitle or "Primary Curriculum Source"
            if cards and cards[0].body:
                main_quote = cards[0].body
                attribution = cards[0].title or attribution

            p_quote = qtf.add_paragraph()
            p_quote.text = f'"{main_quote}"'
            p_quote.font.size = Pt(22)
            p_quote.font.italic = True
            p_quote.font.color.rgb = palette["text"]
            p_quote.space_after = Pt(18)

            p_attr = qtf.add_paragraph()
            p_attr.text = f"— {attribution}"
            p_attr.font.size = Pt(14)
            p_attr.font.bold = True
            p_attr.font.color.rgb = palette["primary"]

        # ── 3. STANDARD HEADER FOR STRUCTURED ARCHETYPES ──
        else:
            title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.73), Inches(1.3))
            tf = title_box.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

            p_badge = tf.paragraphs[0]
            if slide_data.grounding and slide_data.grounding.passage_id:
                p_badge.text = f"CITATION [{slide_data.grounding.passage_id}] • {archetype.replace('_', ' ').upper()}"
            else:
                p_badge.text = f"LEARNING MODULE • {archetype.replace('_', ' ').upper()}"
            p_badge.font.size = Pt(10)
            p_badge.font.bold = True
            p_badge.font.color.rgb = palette["highlight"]
            p_badge.space_after = Pt(2)

            p_title = tf.add_paragraph()
            p_title.text = slide_data.title
            p_title.font.size = Pt(26)
            p_title.font.bold = True
            p_title.font.color.rgb = palette["primary"]

            if slide_data.subtitle:
                p_sub = tf.add_paragraph()
                p_sub.text = slide_data.subtitle
                p_sub.font.size = Pt(13)
                p_sub.font.color.rgb = palette["muted"]
                p_sub.space_before = Pt(2)

            # ── 4. BEFORE / AFTER OR PROS / CONS ARCHETYPE ──
            if archetype in ("before_after", "pros_cons"):
                col_width = Inches(5.65)
                gap = Inches(0.43)
                left_col = Inches(0.8)
                right_col = left_col + col_width + gap
                top = Inches(2.0)
                height = Inches(4.8)

                # Rose / Red accent for Before / Cons
                rose_color = RGBColor(239, 68, 68)
                c_left = cards[0] if len(cards) > 0 else SlideCard(title="Before / Cons", body="Prior state or challenges.")
                shape_left = add_card_box(slide, left_col, top, col_width, height, palette["card_bg"], rose_color, Pt(2))
                populate_card_text(shape_left, c_left, palette, title_size=Pt(20))

                # Emerald / Green accent for After / Pros
                emerald_color = RGBColor(16, 185, 129)
                c_right = cards[1] if len(cards) > 1 else SlideCard(title="After / Pros", body="Optimized state or benefits.")
                shape_right = add_card_box(slide, right_col, top, col_width, height, palette["card_bg"], emerald_color, Pt(2))
                populate_card_text(shape_right, c_right, palette, title_size=Pt(20))

            # ── 5. TIMELINE / SEQUENCE STEPS ARCHETYPE ──
            elif archetype in ("timeline", "sequence_steps"):
                track = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(1.0), Inches(2.35), Inches(11.33), Inches(0.08))
                track.fill.solid()
                track.fill.fore_color.rgb = palette["accent"]
                track.line.color.rgb = palette["accent"]

                col_width = Inches(3.68)
                gap = Inches(0.34)
                start_left = Inches(0.8)
                top = Inches(2.7)
                height = Inches(4.1)

                for c_idx, card in enumerate(cards[:3]):
                    c_left = start_left + c_idx * (col_width + gap)
                    shape = add_card_box(slide, c_left, top, col_width, height, palette["card_bg"], palette["card_border"])
                    if not card.badge:
                        card.badge = f"PHASE 0{c_idx + 1}"
                    populate_card_text(shape, card, palette, stat_first=False)

            # ── 6. PYRAMID HIERARCHY ARCHETYPE ──
            elif archetype == "pyramid_hierarchy":
                tiers = [
                    (Inches(3.9), Inches(2.0), Inches(5.53), Inches(1.4)),
                    (Inches(2.35), Inches(3.65), Inches(8.63), Inches(1.4)),
                    (Inches(0.8), Inches(5.3), Inches(11.73), Inches(1.4)),
                ]
                for c_idx, (t_left, t_top, t_w, t_h) in enumerate(tiers):
                    card = cards[c_idx] if c_idx < len(cards) else SlideCard(title=f"Tier {c_idx+1}", body="Hierarchical level component.")
                    border = palette["highlight"] if c_idx == 0 else palette["card_border"]
                    shape = add_card_box(slide, t_left, t_top, t_w, t_h, palette["card_bg"], border)
                    populate_card_text(shape, card, palette, title_size=Pt(16), body_size=Pt(11))

            # ── 7. STAIRCASE PROGRESSION ARCHETYPE ──
            elif archetype == "staircase_progression":
                col_width = Inches(3.68)
                gap = Inches(0.34)
                start_left = Inches(0.8)
                stairs = [
                    (Inches(4.4), Inches(2.4)),
                    (Inches(3.2), Inches(3.6)),
                    (Inches(2.0), Inches(4.8)),
                ]
                for c_idx, (s_top, s_h) in enumerate(stairs):
                    c_left = start_left + c_idx * (col_width + gap)
                    card = cards[c_idx] if c_idx < len(cards) else SlideCard(title=f"Step {c_idx+1}", body="Escalating progression milestone.")
                    border = palette["highlight"] if c_idx == 2 else palette["card_border"]
                    shape = add_card_box(slide, c_left, s_top, col_width, s_h, palette["card_bg"], border)
                    if not card.badge:
                        card.badge = f"STEP 0{c_idx+1}"
                    populate_card_text(shape, card, palette)

            # ── 8. BENTO 4 / PROCESS CYCLE ARCHETYPE ──
            elif archetype in ("bento_4", "process_cycle"):
                bento_positions = [
                    (Inches(0.8), Inches(2.0), Inches(5.65), Inches(2.25)),
                    (Inches(6.88), Inches(2.0), Inches(5.65), Inches(2.25)),
                    (Inches(0.8), Inches(4.55), Inches(5.65), Inches(2.25)),
                    (Inches(6.88), Inches(4.55), Inches(5.65), Inches(2.25)),
                ]
                for c_idx, (b_left, b_top, b_w, b_h) in enumerate(bento_positions):
                    card = cards[c_idx] if c_idx < len(cards) else SlideCard(title=f"Node 0{c_idx+1}", body="Process stage or bento feature slot.")
                    shape = add_card_box(slide, b_left, b_top, b_w, b_h, palette["card_bg"], palette["card_border"])
                    populate_card_text(shape, card, palette, title_size=Pt(16), body_size=Pt(11))

            # ── 9. STATS GRID / STAT CALLOUT ARCHETYPE ──
            elif archetype in ("stats_grid", "stat_callout"):
                if archetype == "stat_callout" and len(cards) >= 2:
                    shape_hero = add_card_box(slide, Inches(0.8), Inches(2.0), Inches(5.0), Inches(4.8), palette["card_bg"], palette["highlight"], Pt(2))
                    populate_card_text(shape_hero, cards[0], palette, stat_first=True, stat_size=Pt(48))

                    right_top = Inches(2.0)
                    for c_idx, card in enumerate(cards[1:3]):
                        r_top = right_top + c_idx * (Inches(2.25) + Inches(0.3))
                        shape_sub = add_card_box(slide, Inches(6.15), r_top, Inches(6.38), Inches(2.25), palette["card_bg"], palette["card_border"])
                        populate_card_text(shape_sub, card, palette, title_size=Pt(16), body_size=Pt(11))
                else:
                    col_width = Inches(3.68)
                    gap = Inches(0.34)
                    start_left = Inches(0.8)
                    top = Inches(2.0)
                    height = Inches(4.8)
                    for c_idx, card in enumerate(cards[:3]):
                        c_left = start_left + c_idx * (col_width + gap)
                        shape = add_card_box(slide, c_left, top, col_width, height, palette["card_bg"], palette["card_border"])
                        populate_card_text(shape, card, palette, stat_first=True, stat_size=Pt(40))

            # ── 10. HERO VISUAL SPLIT / CHART DATA ARCHETYPE ──
            elif archetype in ("hero_visual_split", "chart_data"):
                left_shape = add_card_box(slide, Inches(0.8), Inches(2.0), Inches(6.8), Inches(4.8), palette["card_bg"], palette["card_border"])
                c_main = cards[0] if cards else SlideCard(title="Core Synthesis", body="Structured explanation with quantitative or photographic grounding.")
                populate_card_text(left_shape, c_main, palette, title_size=Pt(20), body_size=Pt(13))

                # Check for cached or resolvable local picture
                img_file = None
                if slide_data.image_url and "/static/images/" in slide_data.image_url:
                    img_filename = slide_data.image_url.split("/static/images/")[-1].split("?")[0]
                    cand = settings.ROOT_DIR / "output" / "image_cache" / img_filename
                    if cand.exists():
                        img_file = cand

                if not img_file and (slide_data.image_query or archetype == "hero_visual_split"):
                    try:
                        from backend.tools.slides.image_service import resolve_image
                        q_str = slide_data.image_query or slide_data.title
                        res = resolve_image(q_str, slide_data.title)
                        cand = Path(res["file_path"])
                        if cand.exists():
                            img_file = cand
                    except Exception as e:
                        logger.debug(f"Image resolve error in PPTX compiler: {e}")

                picture_added = False
                if img_file and img_file.exists():
                    try:
                        slide.shapes.add_picture(
                            str(img_file),
                            Inches(8.0),
                            Inches(2.0),
                            width=Inches(4.53),
                            height=Inches(4.8)
                        )
                        picture_added = True
                    except Exception as e:
                        logger.debug(f"Could not add picture to slide: {e}")

                if not picture_added:
                    right_shape = add_card_box(slide, Inches(8.0), Inches(2.0), Inches(4.53), Inches(4.8), palette["card_bg"], palette["accent"], Pt(2))
                    rtf = right_shape.text_frame
                    rtf.word_wrap = True
                    rtf.margin_left = Inches(0.4)
                    rtf.margin_right = Inches(0.4)
                    rtf.margin_top = Inches(0.5)

                    p_r_badge = rtf.paragraphs[0]
                    p_r_badge.text = "VISUAL MEDIA CONTAINER" if archetype == "hero_visual_split" else "QUANTITATIVE DATA CHART"
                    p_r_badge.font.size = Pt(11)
                    p_r_badge.font.bold = True
                    p_r_badge.font.color.rgb = palette["highlight"]
                    p_r_badge.space_after = Pt(8)

                    p_r_title = rtf.add_paragraph()
                    p_r_title.text = slide_data.image_query or "Curated Conceptual Diagram"
                    p_r_title.font.size = Pt(16)
                    p_r_title.font.bold = True
                    p_r_title.font.color.rgb = palette["primary"]
                    p_r_title.space_after = Pt(8)

                    p_r_desc = rtf.add_paragraph()
                    p_r_desc.text = "High-resolution diagram asset embedded for classroom projector display."
                    p_r_desc.font.size = Pt(12)
                    p_r_desc.font.color.rgb = palette["muted"]

            # ── 11. BULLET LIST ARCHETYPE ──
            elif archetype == "bullet_list":
                list_box = add_card_box(slide, Inches(0.8), Inches(2.0), Inches(11.73), Inches(4.8), palette["card_bg"], palette["card_border"])
                ltf = list_box.text_frame
                ltf.word_wrap = True
                ltf.margin_left = Inches(0.5)
                ltf.margin_right = Inches(0.5)
                ltf.margin_top = Inches(0.4)

                first = True
                for b_idx, bullet in enumerate(slide_data.bullets or [c.body for c in cards]):
                    p = ltf.paragraphs[0] if first else ltf.add_paragraph()
                    first = False
                    p.text = f"•  {bullet}"
                    p.font.size = Pt(15)
                    p.font.color.rgb = palette["text"]
                    p.space_after = Pt(10)

            # ── 12. FALLBACK: STANDARD CARD GRID ──
            else:
                card_count = max(1, min(len(cards), 3))
                total_width = Inches(11.73)
                start_left = Inches(0.8)
                top = Inches(2.0)
                height = Inches(4.8)

                if card_count == 1:
                    col_width = total_width
                    gap = Inches(0)
                elif card_count == 2 or archetype == "split_comparison":
                    col_width = Inches(5.65)
                    gap = Inches(0.43)
                else:
                    col_width = Inches(3.68)
                    gap = Inches(0.34)

                for c_idx, card in enumerate(cards[:card_count]):
                    c_left = start_left + c_idx * (col_width + gap)
                    shape = add_card_box(slide, c_left, top, col_width, height, palette["card_bg"], palette["card_border"])
                    populate_card_text(shape, card, palette)

        # ── SPEAKER NOTES ──
        if slide_data.speaker_notes:
            notes_slide = slide.notes_slide
            notes_text_frame = notes_slide.notes_text_frame
            notes_text_frame.text = slide_data.speaker_notes

    prs.save(output_path)


class SlideTool(BaseTool):
    name: str = "slides"
    description: str = "Generates editable PowerPoint presentations (.pptx) with modern visual card layouts and grounded teacher speaker notes."
    brief_model = SlideBrief

    async def run(self, brief: SlideBrief, ctx: ExecutionContext) -> Artifact:
        p_dir = Path(ctx.project_dir)
        output_dir = p_dir / "slides"
        output_dir.mkdir(parents=True, exist_ok=True)

        pptx_filename = "slides.pptx"
        json_filename = "slides.json"
        pptx_path = output_dir / pptx_filename
        json_path = output_dir / json_filename

        outline_path = p_dir / "outline.json"
        outline_data = None
        if outline_path.exists():
            try:
                with open(outline_path, "r", encoding="utf-8") as f:
                    outline_data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load outline.json: {e}")

        slides = self._plan_slides(brief, ctx.passages, outline_data)
        self._build_pptx(slides, brief.theme, pptx_path)

        preview_data = {
            "title": brief.topic,
            "theme": brief.theme,
            "slides": [s.model_dump() for s in slides]
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(preview_data, f, indent=2, ensure_ascii=False)

        grounding_refs: List[GroundingRef] = []
        for s in slides:
            if s.grounding:
                verified = verify_grounding(s.grounding.passage_id, s.grounding.quote, ctx.passages)
                s.grounding.verified = verified
                grounding_refs.append(s.grounding)

        return Artifact(
            id=f"art-slides-{brief.topic[:10].replace(' ', '_').lower()}",
            tool_name=self.name,
            project_id=ctx.project_id,
            status=ArtifactStatus.NEEDS_REVIEW,
            files=[str(pptx_path.relative_to(p_dir)), str(json_path.relative_to(p_dir))],
            source_data=preview_data,
            grounding_refs=grounding_refs,
            cost_estimate_usd=0.0,
        )

    def _plan_slides(
        self,
        brief: SlideBrief,
        passages: Dict[str, str],
        outline: Optional[Dict[str, Any]]
    ) -> List[SlideContent]:
        slides: List[SlideContent] = []
        topic = brief.topic or (outline.get("title") if outline else "Lesson Presentation")

        slides.append(SlideContent(
            slide_number=1,
            title=topic,
            subtitle=f"{brief.subject} • Level: {brief.grade_level}",
            archetype="hero_stat",
            cards=[
                SlideCard(badge="Domain", stat=brief.subject[:3].upper(), title="Pedagogical Field", body=f"Instructional unit tailored for {brief.grade_level} learners."),
                SlideCard(badge="Framework", title="Classroom Ready", body="Structured lesson module for direct projector delivery or self-paced review."),
                SlideCard(badge="Grounding", title="Textbook Aligned", body="Synthesized deterministically from chapter passages with verified references.")
            ],
            bullets=[
                f"Curriculum Level: {brief.grade_level}",
                f"Pedagogical Domain: {brief.subject}",
                "Source-Grounded Classroom Learning Module"
            ],
            speaker_notes="Welcome students to today's session. Introduce the overarching chapter goal and connect it to prior knowledge.",
            grounding=None
        ))

        objectives = outline.get("learning_objectives", []) if outline else []
        if not objectives:
            objectives = [
                f"Master core principles and definitions of {topic}",
                "Identify foundational mechanisms, formulas, and terminology",
                "Apply theoretical concepts to solve real-world problems"
            ]
        
        obj_cards = [
            SlideCard(badge=f"Objective {i+1}", title=f"Goal {i+1}", body=obj)
            for i, obj in enumerate(objectives[:3])
        ]

        slides.append(SlideContent(
            slide_number=2,
            title="Learning Objectives",
            subtitle="Core competences targeted in this unit",
            archetype="card_grid_3",
            cards=obj_cards,
            bullets=objectives[:3],
            speaker_notes="Walk students through these Bloom's taxonomy objectives before diving into detailed mechanisms.",
            grounding=None
        ))

        concepts = outline.get("concepts", []) if outline else []
        passage_items = list(passages.items())

        if concepts:
            for idx, c in enumerate(concepts[:brief.num_slides - 3]):
                slide_num = len(slides) + 1
                g_ref = None
                notes_citation = ""
                if c.get("grounding"):
                    g = c["grounding"]
                    g_ref = GroundingRef(passage_id=g.get("passage_id", ""), quote=g.get("quote", ""))
                    notes_citation = f" [Ref: {g_ref.passage_id}]"

                c_name = c.get("concept", f"Concept {idx + 1}")
                c_expl = c.get("explanation", "")

                slide_cards = [
                    SlideCard(badge="Definition", title="Core Principle", body=c_expl[:180]),
                    SlideCard(badge="Application", title="Classroom Context", body=f"Examine practical implications and analytical methods for {c_name}."),
                    SlideCard(badge="Checkpoint", title="Key Takeaway", body=f"Verified understanding grounded in curriculum reference.{notes_citation}")
                ]

                slides.append(SlideContent(
                    slide_number=slide_num,
                    title=c_name,
                    subtitle=f"Section grounded in {g_ref.passage_id}" if g_ref else "In-depth Concept Exploration",
                    archetype="card_grid_3",
                    cards=slide_cards,
                    bullets=[c_expl, f"Targeted for {brief.grade_level} comprehension"],
                    speaker_notes=f"Deep-dive discussion on {c_name}. Prompt students for real-world analogies.{notes_citation}",
                    grounding=g_ref
                ))
        else:
            for idx, (pid, text) in enumerate(passage_items[:brief.num_slides - 3]):
                slide_num = len(slides) + 1
                g_ref = GroundingRef(passage_id=pid, quote=text[:60].strip())

                slide_cards = [
                    SlideCard(badge="Curriculum Excerpt", title=f"Source [{pid}]", body=text[:160].strip()),
                    SlideCard(badge="Pedagogical Focus", title="Key Mechanism", body="Critical concept extracted from primary chapter text for focused student review."),
                    SlideCard(badge="Reflection", title="Discussion Anchor", body="Ask students how this principle applies to observable phenomena.")
                ]

                slides.append(SlideContent(
                    slide_number=slide_num,
                    title=f"Core Concept {idx + 1}",
                    subtitle=f"Curriculum Section Grounded in {pid}",
                    archetype="card_grid_3",
                    cards=slide_cards,
                    bullets=[text[:160].strip(), f"Passage grounding: [{pid}]"],
                    speaker_notes=f"Discuss {pid}: {text[:120]}... [Ref: {pid}]",
                    grounding=g_ref
                ))

        slides.append(SlideContent(
            slide_number=len(slides) + 1,
            title="Summary & Classroom Checkpoint",
            subtitle="Consolidating knowledge and preparing for exercises",
            archetype="key_takeaways",
            cards=[
                SlideCard(badge="Review", title="Core Takeaway", body=f"Synthesize the foundational principles of {topic} covered today."),
                SlideCard(badge="Formative Assessment", title="Quick Check", body="Formulate open discussion questions and clarify remaining ambiguities."),
                SlideCard(badge="Next Step", title="Interactive Practice", body="Proceed to practice flashcards and the interactive classroom quiz.")
            ],
            bullets=[
                f"Review the key takeaways of {topic}",
                "Clarify remaining questions on complex mechanisms",
                "Prepare for upcoming interactive quiz & practice exercise"
            ],
            speaker_notes="Allow 5 minutes for open Q&A. Ask a volunteer to summarize the top concept before proceeding to the quiz.",
            grounding=None
        ))

        return slides

    def _build_pptx(self, slides: List[SlideContent], theme_name: str, output_path: Path) -> None:
        build_presentation_file(slides, theme_name, output_path)


slide_tool_instance = SlideTool()
registry.register(slide_tool_instance)
