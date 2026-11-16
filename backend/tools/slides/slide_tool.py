import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

from backend.core.config import settings
from backend.core.models import Artifact, ArtifactStatus, GroundingRef, ToolBrief
from backend.core.registry import BaseTool, ExecutionContext, registry
from backend.tools.ingestion.grounding import verify_grounding

logger = logging.getLogger(__name__)


THEME_PALETTES = {
    "academic_clean": {
        "bg": RGBColor(255, 255, 255),
        "primary": RGBColor(30, 58, 138),     # Blue 900
        "accent": RGBColor(14, 116, 144),    # Cyan 700
        "text": RGBColor(30, 41, 59),        # Slate 800
        "muted": RGBColor(100, 116, 139),    # Slate 500
    },
    "midnight_tech": {
        "bg": RGBColor(15, 23, 42),          # Slate 900
        "primary": RGBColor(56, 189, 248),   # Sky 400
        "accent": RGBColor(168, 85, 247),    # Purple 500
        "text": RGBColor(241, 245, 249),     # Slate 100
        "muted": RGBColor(148, 163, 184),    # Slate 400
    },
    "col_blue": {
        "bg": RGBColor(248, 250, 252),       # Slate 50
        "primary": RGBColor(3, 105, 161),    # COL Sky Blue
        "accent": RGBColor(234, 88, 12),     # Amber/Orange 600
        "text": RGBColor(15, 23, 42),
        "muted": RGBColor(71, 85, 105),
    }
}


class SlideContent(BaseModel):
    slide_number: int
    title: str
    subtitle: Optional[str] = None
    bullets: List[str] = Field(default_factory=list)
    speaker_notes: str = ""
    grounding: Optional[GroundingRef] = None


class SlideBrief(ToolBrief):
    """Configuration for slide deck synthesis."""
    num_slides: int = Field(default=6, ge=3, le=20, description="Target number of slides")
    theme: str = Field(default="academic_clean", description="Theme name: academic_clean, midnight_tech, col_blue")
    include_speaker_notes: bool = Field(default=True, description="Embed teaching notes for educator")
    include_passage_citations: bool = Field(default=True, description="Include [Pxx-Sxx] grounding citations")


class SlideTool(BaseTool):
    name: str = "slides"
    description: str = "Generates editable PowerPoint presentations (.pptx) and JSON previews with grounded teacher speaker notes."
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

        # Plan slides
        slides = self._plan_slides(brief, ctx.passages, outline_data)

        # Build PowerPoint
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

        # 1. Title Slide
        slides.append(SlideContent(
            slide_number=1,
            title=topic,
            subtitle=f"{brief.subject} | {brief.grade_level}",
            bullets=[
                f"Curriculum Level: {brief.grade_level}",
                f"Pedagogical Domain: {brief.subject}",
                "Source-Grounded Classroom Learning Module"
            ],
            speaker_notes="Welcome students to today's session. State the core goal of mastering this chapter.",
            grounding=None
        ))

        # 2. Objectives Slide
        objectives = outline.get("learning_objectives", []) if outline else []
        if not objectives:
            objectives = [
                f"Master core principles of {topic}",
                "Identify foundational terminology and formulas",
                "Apply theoretical concepts to practical examples"
            ]
        slides.append(SlideContent(
            slide_number=2,
            title="Learning Objectives",
            subtitle="What we will accomplish in this unit",
            bullets=objectives[:4],
            speaker_notes="Walk students through these Bloom's taxonomy objectives before diving into technical details.",
            grounding=None
        ))

        # 3. Content Slides from Outline or Passages
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

                slides.append(SlideContent(
                    slide_number=slide_num,
                    title=c.get("concept", f"Concept {idx + 1}"),
                    subtitle="Key Concept Exploration",
                    bullets=[
                        c.get("explanation", ""),
                        f"Targeted for {brief.grade_level} comprehension",
                        "Examine core dynamics and relationships"
                    ],
                    speaker_notes=f"Explain {c.get('concept')}. Ask students to reflect on real-world analogies.{notes_citation}",
                    grounding=g_ref
                ))
        else:
            # Fallback to passage text directly
            for idx, (pid, text) in enumerate(passage_items[:brief.num_slides - 3]):
                slide_num = len(slides) + 1
                g_ref = GroundingRef(passage_id=pid, quote=text[:60].strip())
                slides.append(SlideContent(
                    slide_number=slide_num,
                    title=f"Core Concept {idx + 1}",
                    subtitle=f"Section grounded in {pid}",
                    bullets=[
                        text[:160].strip(),
                        "Critical learning point from chapter reading",
                    ],
                    speaker_notes=f"Deep-dive discussion for {pid}: {text[:120]}... [Ref: {pid}]",
                    grounding=g_ref
                ))

        # 4. Summary / Reflection Slide
        slides.append(SlideContent(
            slide_number=len(slides) + 1,
            title="Summary & Classroom Checkpoint",
            subtitle="Consolidating our understanding",
            bullets=[
                f"Review the key takeaways of {topic}",
                "Formulate questions on complex mechanisms",
                "Prepare for upcoming interactive quiz & practice exercise"
            ],
            speaker_notes="Allow 5 minutes for open Q&A and ask a student to summarize the top takeaway.",
            grounding=None
        ))

        return slides

    def _build_pptx(self, slides: List[SlideContent], theme_name: str, output_path: Path) -> None:
        prs = Presentation()
        # Set 16:9 widescreen dimensions (13.33 x 7.5 inches)
        prs.slide_width = Inches(13.33)
        prs.slide_height = Inches(7.5)

        palette = THEME_PALETTES.get(theme_name, THEME_PALETTES["academic_clean"])
        blank_layout = prs.slide_layouts[6]  # Blank slide

        for slide_data in slides:
            slide = prs.slides.add_slide(blank_layout)

            # Title box
            title_box = slide.shapes.add_textbox(Inches(1.0), Inches(0.8), Inches(11.33), Inches(1.2))
            tf = title_box.text_frame
            tf.word_wrap = True
            p = tf.paragraphs[0]
            p.text = slide_data.title
            p.font.size = Pt(36)
            p.font.bold = True
            p.font.color.rgb = palette["primary"]

            # Subtitle
            if slide_data.subtitle:
                p_sub = tf.add_paragraph()
                p_sub.text = slide_data.subtitle
                p_sub.font.size = Pt(18)
                p_sub.font.color.rgb = palette["muted"]

            # Bullets box
            if slide_data.bullets:
                body_box = slide.shapes.add_textbox(Inches(1.0), Inches(2.3), Inches(11.33), Inches(4.2))
                btf = body_box.text_frame
                btf.word_wrap = True
                for b_idx, bullet in enumerate(slide_data.bullets):
                    bp = btf.paragraphs[0] if b_idx == 0 else btf.add_paragraph()
                    bp.text = f"•  {bullet}"
                    bp.font.size = Pt(22)
                    bp.font.color.rgb = palette["text"]
                    bp.space_after = Pt(14)

            # Speaker Notes
            if slide_data.speaker_notes:
                notes_slide = slide.notes_slide
                text_frame = notes_slide.notes_text_frame
                text_frame.text = slide_data.speaker_notes

        prs.save(output_path)


# Register slide tool
slide_tool_instance = SlideTool()
registry.register(slide_tool_instance)
