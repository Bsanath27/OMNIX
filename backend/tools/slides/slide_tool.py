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


THEME_PALETTES = {
    "academic_clean": {
        "bg": RGBColor(255, 255, 255),
        "card_bg": RGBColor(248, 250, 252),        # Slate 50
        "card_border": RGBColor(226, 232, 240),    # Slate 200
        "primary": RGBColor(30, 58, 138),          # Blue 900
        "accent": RGBColor(14, 116, 144),          # Cyan 700
        "highlight": RGBColor(255, 92, 0),         # Solar Orange #FF5C00
        "text": RGBColor(30, 41, 59),              # Slate 800
        "muted": RGBColor(100, 116, 139),          # Slate 500
    },
    "midnight_tech": {
        "bg": RGBColor(15, 23, 42),               # Slate 900
        "card_bg": RGBColor(30, 41, 59),           # Slate 800
        "card_border": RGBColor(51, 65, 85),       # Slate 700
        "primary": RGBColor(56, 189, 248),        # Sky 400
        "accent": RGBColor(168, 85, 247),         # Purple 500
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(241, 245, 249),          # Slate 100
        "muted": RGBColor(148, 163, 184),         # Slate 400
    },
    "col_blue": {
        "bg": RGBColor(250, 247, 242),            # Warm Creme Paper (#FAF7F2)
        "card_bg": RGBColor(255, 255, 255),       # Pure White Surface
        "card_border": RGBColor(232, 226, 216),   # Subtle Sand Border
        "primary": RGBColor(3, 105, 161),         # COL Sky Blue
        "accent": RGBColor(37, 99, 235),          # Cobalt Blue
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(24, 24, 27),             # Charcoal
        "muted": RGBColor(113, 109, 100),         # Muted Sand
    },
    "solar_obsidian": {
        "bg": RGBColor(21, 20, 19),               # Deep Obsidian (#151413)
        "card_bg": RGBColor(35, 33, 31),          # Card Surface (#23211F)
        "card_border": RGBColor(56, 53, 49),      # Subtle Border
        "primary": RGBColor(255, 92, 0),          # Solar Orange
        "accent": RGBColor(249, 115, 22),         # Amber Orange
        "highlight": RGBColor(251, 146, 60),      # Bright Amber
        "text": RGBColor(245, 242, 235),          # Warm White
        "muted": RGBColor(156, 163, 175),         # Slate 400
    },
    "verdant": {
        "bg": RGBColor(246, 250, 247),            # Crisp Light Green tint
        "card_bg": RGBColor(255, 255, 255),       # Pure White Surface
        "card_border": RGBColor(209, 231, 214),   # Soft Sage Border
        "primary": RGBColor(21, 128, 61),         # Forest Green (#15803D)
        "accent": RGBColor(16, 185, 129),         # Emerald
        "highlight": RGBColor(255, 92, 0),        # Solar Orange Accent
        "text": RGBColor(20, 35, 25),             # Dark Spruce
        "muted": RGBColor(107, 125, 112),         # Muted Sage
    },
    "nova": {
        "bg": RGBColor(11, 19, 43),               # Deep Navy Void
        "card_bg": RGBColor(28, 37, 65),          # Luminous Blue Card
        "card_border": RGBColor(58, 80, 107),     # Electric Indigo Border
        "primary": RGBColor(72, 202, 228),        # Cyan Glow
        "accent": RGBColor(0, 180, 216),          # Bright Cyan
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(240, 248, 255),          # Crisp White
        "muted": RGBColor(141, 153, 174),         # Slate
    },
    "pulse": {
        "bg": RGBColor(248, 250, 252),            # Clinical Light
        "card_bg": RGBColor(255, 255, 255),       # Pure White
        "card_border": RGBColor(226, 232, 240),   # Light Border
        "primary": RGBColor(2, 132, 199),         # Sky 600
        "accent": RGBColor(14, 165, 233),         # Sky 500
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(15, 23, 42),             # Slate 900
        "muted": RGBColor(100, 116, 139),         # Slate 500
    },
    "signal": {
        "bg": RGBColor(24, 23, 21),               # Warm Carbon
        "card_bg": RGBColor(38, 35, 32),          # Surface
        "card_border": RGBColor(60, 56, 50),      # Border
        "primary": RGBColor(255, 92, 0),          # Solar Orange
        "accent": RGBColor(245, 158, 11),         # Amber 500
        "highlight": RGBColor(251, 191, 36),      # Amber 400
        "text": RGBColor(250, 248, 245),          # White
        "muted": RGBColor(160, 155, 145),         # Muted Sand
    },
    "dynamic": {
        "bg": RGBColor(17, 19, 24),               # Dark Slate Matrix
        "card_bg": RGBColor(28, 31, 38),          # Card Surface
        "card_border": RGBColor(45, 50, 62),      # Card Border
        "primary": RGBColor(249, 115, 22),        # Orange 500
        "accent": RGBColor(234, 88, 12),          # Deep Orange
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(248, 250, 252),          # Slate 50
        "muted": RGBColor(148, 163, 184),         # Slate 400
    },
    "executive": {
        "bg": RGBColor(15, 14, 23),               # Deep Violet Black
        "card_bg": RGBColor(30, 27, 46),          # Violet Card
        "card_border": RGBColor(46, 42, 74),      # Violet Border
        "primary": RGBColor(167, 139, 250),       # Lavender Purple
        "accent": RGBColor(192, 132, 252),        # Light Violet
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(245, 243, 255),          # Pale Lavender
        "muted": RGBColor(147, 139, 170),         # Muted Violet
    },
    "general": {
        "bg": RGBColor(255, 255, 255),
        "card_bg": RGBColor(249, 250, 251),       # Gray 50
        "card_border": RGBColor(229, 231, 235),   # Gray 200
        "primary": RGBColor(37, 99, 235),         # Blue 600
        "accent": RGBColor(79, 70, 229),          # Indigo 600
        "highlight": RGBColor(255, 92, 0),        # Solar Orange
        "text": RGBColor(17, 24, 39),             # Gray 900
        "muted": RGBColor(107, 114, 128),         # Gray 500
    },
    "standard": {
        "bg": RGBColor(255, 255, 255),
        "card_bg": RGBColor(248, 250, 252),       # Slate 50
        "card_border": RGBColor(226, 232, 240),   # Slate 200
        "primary": RGBColor(15, 23, 42),          # Slate 900
        "accent": RGBColor(71, 85, 105),          # Slate 600
        "highlight": RGBColor(14, 165, 233),      # Sky 500
        "text": RGBColor(30, 41, 59),             # Slate 800
        "muted": RGBColor(100, 116, 139),         # Slate 500
    },
    "momentum": {
        "bg": RGBColor(19, 20, 22),                # Deep Carbon #131416
        "card_bg": RGBColor(30, 32, 37),           # Carbon Card #1E2025
        "card_border": RGBColor(39, 42, 48),       # Border #272A30
        "primary": RGBColor(56, 189, 248),         # Sky Blue #38BDF8
        "accent": RGBColor(14, 165, 233),          # Sky 500
        "highlight": RGBColor(255, 92, 0),         # Solar Orange
        "text": RGBColor(241, 245, 249),           # Slate 100
        "muted": RGBColor(148, 163, 184),          # Slate 400
    },
    "swift": {
        "bg": RGBColor(248, 250, 252),
        "card_bg": RGBColor(255, 255, 255),
        "card_border": RGBColor(226, 232, 240),
        "primary": RGBColor(37, 99, 235),          # Electric Blue
        "accent": RGBColor(59, 130, 246),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(15, 23, 42),
        "muted": RGBColor(100, 116, 139),
    },
    "mosaic": {
        "bg": RGBColor(250, 248, 245),             # Warm Sand
        "card_bg": RGBColor(255, 255, 255),
        "card_border": RGBColor(229, 223, 213),
        "primary": RGBColor(154, 52, 18),          # Terracotta
        "accent": RGBColor(234, 88, 12),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(28, 25, 23),
        "muted": RGBColor(120, 113, 108),
    },
    "editorial": {
        "bg": RGBColor(253, 251, 247),             # Warm Ivory
        "card_bg": RGBColor(255, 255, 255),
        "card_border": RGBColor(231, 225, 215),
        "primary": RGBColor(28, 25, 23),           # Deep Warm Charcoal
        "accent": RGBColor(68, 64, 60),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(28, 25, 23),
        "muted": RGBColor(120, 113, 108),
    },
    "civic": {
        "bg": RGBColor(240, 244, 248),             # Steel Blue Tint
        "card_bg": RGBColor(255, 255, 255),
        "card_border": RGBColor(214, 224, 234),
        "primary": RGBColor(30, 64, 175),          # Civic Blue
        "accent": RGBColor(59, 130, 246),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(30, 41, 59),
        "muted": RGBColor(100, 116, 139),
    },
    "landmark": {
        "bg": RGBColor(20, 24, 30),                # Architectural Dark Slate
        "card_bg": RGBColor(28, 34, 43),
        "card_border": RGBColor(35, 43, 53),
        "primary": RGBColor(226, 232, 240),
        "accent": RGBColor(148, 163, 184),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(248, 250, 252),
        "muted": RGBColor(100, 116, 139),
    },
    "modern": {
        "bg": RGBColor(255, 255, 255),
        "card_bg": RGBColor(248, 250, 252),
        "card_border": RGBColor(226, 232, 240),
        "primary": RGBColor(15, 23, 42),
        "accent": RGBColor(59, 130, 246),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(15, 23, 42),
        "muted": RGBColor(100, 116, 139),
    },
    "horizon": {
        "bg": RGBColor(14, 21, 37),                # Dusk Navy
        "card_bg": RGBColor(23, 33, 54),
        "card_border": RGBColor(30, 41, 59),
        "primary": RGBColor(96, 165, 250),         # Horizon Blue
        "accent": RGBColor(56, 189, 248),
        "highlight": RGBColor(255, 92, 0),
        "text": RGBColor(248, 250, 252),
        "muted": RGBColor(148, 163, 184),
    }
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
    archetype: str = "card_grid_3"  # "hero_stat", "card_grid_3", "split_comparison", "timeline", "hero_visual_split", etc.
    cards: List[SlideCard] = Field(default_factory=list)
    bullets: List[str] = Field(default_factory=list)
    speaker_notes: str = ""
    grounding: Optional[GroundingRef] = None
    image_query: Optional[str] = None
    image_url: Optional[str] = None
    chart_data: Optional[List[Dict[str, Any]]] = None


class SlideBrief(ToolBrief):
    """Configuration for slide deck synthesis."""
    num_slides: int = Field(default=6, ge=3, le=20, description="Target number of slides")
    theme: str = Field(default="col_blue", description="Theme name: col_blue, academic_clean, midnight_tech")
    include_speaker_notes: bool = Field(default=True, description="Embed teaching notes for educator")
    include_passage_citations: bool = Field(default=True, description="Include [Pxx-Sxx] grounding citations")


def build_presentation_file(slides: List[SlideContent], theme_name: str, output_path: Path) -> None:
    """Deterministic OpenXML PowerPoint compiler using container card layouts."""
    prs = Presentation()
    # 16:9 widescreen dimensions (13.33 x 7.5 inches)
    prs.slide_width = Inches(13.33)
    prs.slide_height = Inches(7.5)

    palette = THEME_PALETTES.get(theme_name, THEME_PALETTES["col_blue"])
    blank_layout = prs.slide_layouts[6]  # Blank slide

    for slide_data in slides:
        slide = prs.slides.add_slide(blank_layout)

        # 1. Slide Header Area (Title & Subtitle)
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.5), Inches(11.73), Inches(1.3))
        tf = title_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Top Badge / Citation indicator
        p_badge = tf.paragraphs[0]
        if slide_data.grounding and slide_data.grounding.passage_id:
            p_badge.text = f"CITATION [{slide_data.grounding.passage_id}] • {slide_data.archetype.replace('_', ' ').upper()}"
        else:
            p_badge.text = f"LEARNING MODULE • {slide_data.archetype.replace('_', ' ').upper()}"
        p_badge.font.size = Pt(10)
        p_badge.font.bold = True
        p_badge.font.color.rgb = palette["highlight"]
        p_badge.space_after = Pt(2)

        # Main Title
        p_title = tf.add_paragraph()
        p_title.text = slide_data.title
        p_title.font.size = Pt(28)
        p_title.font.bold = True
        p_title.font.color.rgb = palette["primary"]

        # Subtitle
        if slide_data.subtitle:
            p_sub = tf.add_paragraph()
            p_sub.text = slide_data.subtitle
            p_sub.font.size = Pt(14)
            p_sub.font.color.rgb = palette["muted"]
            p_sub.space_before = Pt(2)

        # 2. Main Content Container Cards
        cards = slide_data.cards
        if not cards and slide_data.bullets:
            # Fallback: convert bullets to cards
            cards = [SlideCard(title=f"Point {i+1}", body=b, badge="Core Note") for i, b in enumerate(slide_data.bullets[:3])]

        card_count = len(cards)
        content_top = Inches(2.0)
        content_height = Inches(4.8)
        total_width = Inches(11.73)
        start_left = Inches(0.8)

        if card_count > 0:
            if card_count == 1:
                col_width = total_width
                gap = Inches(0)
            elif card_count == 2 or slide_data.archetype == "split_comparison":
                col_width = Inches(5.65)
                gap = Inches(0.43)
            else:
                # 3 or more cards horizontal grid
                col_width = Inches(3.68)
                gap = Inches(0.34)

            for c_idx, card in enumerate(cards[:3]):
                c_left = start_left + c_idx * (col_width + gap)

                # Draw Card Background Container
                card_shape = slide.shapes.add_shape(
                    MSO_SHAPE.ROUNDED_RECTANGLE, c_left, content_top, col_width, content_height
                )
                card_shape.fill.solid()
                card_shape.fill.fore_color.rgb = palette["card_bg"]
                card_shape.line.color.rgb = palette["card_border"]
                card_shape.line.width = Pt(1.5)

                # Card Text Frame
                ctf = card_shape.text_frame
                ctf.word_wrap = True
                ctf.margin_left = Inches(0.3)
                ctf.margin_right = Inches(0.3)
                ctf.margin_top = Inches(0.3)
                ctf.margin_bottom = Inches(0.3)

                first_para = True

                # Optional Card Badge / Chip
                if card.badge:
                    p = ctf.paragraphs[0] if first_para else ctf.add_paragraph()
                    first_para = False
                    p.text = f"• {card.badge.upper()}"
                    p.font.size = Pt(10)
                    p.font.bold = True
                    p.font.color.rgb = palette["accent"]
                    p.space_after = Pt(4)

                # Optional Hero Stat Callout
                if card.stat:
                    p = ctf.paragraphs[0] if first_para else ctf.add_paragraph()
                    first_para = False
                    p.text = card.stat
                    p.font.size = Pt(36)
                    p.font.bold = True
                    p.font.color.rgb = palette["highlight"]
                    p.space_after = Pt(4)

                # Card Title
                if card.title:
                    p = ctf.paragraphs[0] if first_para else ctf.add_paragraph()
                    first_para = False
                    p.text = card.title
                    p.font.size = Pt(18)
                    p.font.bold = True
                    p.font.color.rgb = palette["primary"]
                    p.space_after = Pt(8)

                # Card Body
                if card.body:
                    p = ctf.paragraphs[0] if first_para else ctf.add_paragraph()
                    first_para = False
                    p.text = card.body
                    p.font.size = Pt(13)
                    p.font.color.rgb = palette["text"]
                    p.space_before = Pt(4)

        # 3. Speaker Notes
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

        # Load project outline if available
        outline_path = p_dir / "outline.json"
        outline_data = None
        if outline_path.exists():
            try:
                with open(outline_path, "r", encoding="utf-8") as f:
                    outline_data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load outline.json: {e}")

        # Plan slides with layout archetypes
        slides = self._plan_slides(brief, ctx.passages, outline_data)

        # Build PowerPoint via deterministic compiler
        self._build_pptx(slides, brief.theme, pptx_path)

        # Build JSON preview
        preview_data = {
            "title": brief.topic,
            "theme": brief.theme,
            "slides": [s.model_dump() for s in slides]
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(preview_data, f, indent=2, ensure_ascii=False)

        # Grounding references
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

        # 1. Hero / Title Slide
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

        # 2. Learning Objectives Slide (3-Card Grid)
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

        # 3. Content Slides from Outline Concepts or Passages
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

                # Split Comparison or 3-Card layout archetype
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
            # Fallback to passage text directly
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

        # 4. Summary & Checkpoint Slide
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


# Register slide tool
slide_tool_instance = SlideTool()
registry.register(slide_tool_instance)
