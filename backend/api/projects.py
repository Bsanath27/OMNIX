import json
import uuid
import logging
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from backend.core.config import settings
from backend.core.models import ProjectManifest, Artifact, ChapterOutline, ArtifactStatus
from backend.tools.ingestion.extractor import extract_document
from backend.tools.ingestion.grounding import build_passages, save_passages_to_json, load_passages_from_json
from backend.tools.outline.outline_tool import extract_chapter_outline
from backend.tools.slides.slide_tool import SlideContent, SlideCard, build_presentation_file, generate_default_slide_html
from backend.tools.slides.image_service import resolve_image
from backend.core.llm import call_llm, get_active_llm_provider, clean_topic_string, safe_json_loads

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/projects", tags=["Projects"])


def get_project_dir(project_id: str) -> Path:
    p_dir = settings.PROJECTS_DIR / project_id
    if not p_dir.exists():
        raise HTTPException(status_code=404, detail="Project not found")
    return p_dir


def load_manifest(project_id: str) -> ProjectManifest:
    p_dir = get_project_dir(project_id)
    manifest_path = p_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail="Manifest not found")
    with open(manifest_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ProjectManifest(**data)


def save_manifest(manifest: ProjectManifest) -> None:
    p_dir = settings.PROJECTS_DIR / manifest.project_id
    p_dir.mkdir(parents=True, exist_ok=True)
    with open(p_dir / "manifest.json", "w", encoding="utf-8") as f:
        json.dump(manifest.model_dump(mode="json"), f, indent=2)


@router.post("", response_model=ProjectManifest)
async def create_project(name: str = Form(...)) -> ProjectManifest:
    """Create a new chapter project folder."""
    project_id = str(uuid.uuid4())[:8]
    p_dir = settings.PROJECTS_DIR / project_id
    p_dir.mkdir(parents=True, exist_ok=True)

    manifest = ProjectManifest(
        project_id=project_id,
        name=name
    )
    save_manifest(manifest)
    return manifest


@router.get("", response_model=List[ProjectManifest])
async def list_projects() -> List[ProjectManifest]:
    """List all local projects."""
    projects = []
    if settings.PROJECTS_DIR.exists():
        for p_dir in settings.PROJECTS_DIR.iterdir():
            if p_dir.is_dir() and (p_dir / "manifest.json").exists():
                try:
                    projects.append(load_manifest(p_dir.name))
                except Exception:
                    continue
    return projects


from backend.services.template_renderer import get_template_catalog_info, render_template_layout_html

PRESENTON_API_URL = "http://localhost:5001"

DEFAULT_TEMPLATES_FALLBACK = [
    {
        "id": "verdant",
        "name": "Verdant",
        "description": "Refined, organic layouts with expressive serif typography and flowing green accents for life science and nature concepts.",
        "layout_count": 27,
        "thumbnail": "/templates/verdant/static/thumbnail.png",
        "themeKey": "verdant",
        "tags": ["Life Sciences", "Forest Green", "Organic"]
    },
    {
        "id": "nova",
        "name": "Nova",
        "description": "Futuristic, high-contrast layouts with luminous blue gradients and bold typography for technology and physics.",
        "layout_count": 28,
        "thumbnail": "/templates/nova/static/thumbnail.png",
        "themeKey": "nova",
        "tags": ["Physics", "Tech", "High Contrast"]
    },
    {
        "id": "pulse",
        "name": "Pulse",
        "description": "Clean, clinical layouts with crisp typography, calming blue accents, and structured compositions for healthcare and lab research.",
        "layout_count": 28,
        "thumbnail": "/templates/pulse/static/thumbnail.png",
        "themeKey": "pulse",
        "tags": ["Healthcare", "Clinical", "Clean Blue"]
    },
    {
        "id": "signal",
        "name": "Signal",
        "description": "Bold, warm-toned layouts with strong typography and dynamic framing for high-impact STEM lectures.",
        "layout_count": 24,
        "thumbnail": "/templates/signal/static/thumbnail.png",
        "themeKey": "signal",
        "tags": ["High Impact", "Warm Amber", "Dynamic"]
    },
    {
        "id": "solar_obsidian",
        "name": "Solar Obsidian",
        "description": "Deep obsidian dark surfaces with high-visibility solar orange accents and modern bento cards.",
        "layout_count": 24,
        "thumbnail": "/templates/dynamic/static/thumbnail.png",
        "themeKey": "solar_obsidian",
        "tags": ["Dark Mode", "Bento Cards", "High Contrast"]
    },
    {
        "id": "academic_clean",
        "name": "Academic Clean",
        "description": "Crisp white canvas with classic Oxford blue headings and structured textbook sectioning.",
        "layout_count": 20,
        "thumbnail": "/templates/editorial/static/thumbnail.png",
        "themeKey": "academic_clean",
        "tags": ["Textbook Standard", "Light Canvas", "Oxford Blue"]
    },
    {
        "id": "mosaic",
        "name": "Mosaic",
        "description": "Vibrant, modular layouts with bold color blocking and playful editorial compositions for visual diagrams.",
        "layout_count": 34,
        "thumbnail": "/templates/mosaic/static/thumbnail.png",
        "themeKey": "mosaic",
        "tags": ["Modular", "Color Blocking", "Diagrams"]
    },
    {
        "id": "momentum",
        "name": "Momentum",
        "description": "Polished high-energy layouts for strategy, performance, and quantitative data storytelling.",
        "layout_count": 28,
        "thumbnail": "/templates/momentum/static/thumbnail.png",
        "themeKey": "momentum",
        "tags": ["Data Story", "Quantitative", "Leadership"]
    },
    {
        "id": "modern",
        "name": "Modern",
        "description": "Clean contemporary layouts with generous whitespace and confident typography.",
        "layout_count": 10,
        "thumbnail": "/templates/modern/static/thumbnail.png",
        "themeKey": "modern",
        "tags": ["Whitespace", "Contemporary", "Lecture"]
    },
    {
        "id": "standard",
        "name": "Standard",
        "description": "Balanced, adaptable layouts that keep classroom curriculum organized and easy to follow.",
        "layout_count": 11,
        "thumbnail": "/templates/standard/static/thumbnail.png",
        "themeKey": "standard",
        "tags": ["Classroom", "Textbook Standard", "Clean"]
    },
    {
        "id": "swift",
        "name": "Swift",
        "description": "Bright, energetic layouts with crisp structure and visual momentum for concise, fast-paced recaps.",
        "layout_count": 9,
        "thumbnail": "/templates/swift/static/thumbnail.png",
        "themeKey": "swift",
        "tags": ["Fast Paced", "Revision", "Concise"]
    },
    {
        "id": "general",
        "name": "General",
        "description": "General purpose template best for simple presentations, great spacing, and structured cards.",
        "layout_count": 12,
        "thumbnail": "/templates/general/static/thumbnail.png",
        "themeKey": "general",
        "tags": ["Everyday", "Structured", "Simple"]
    },
    {
        "id": "executive",
        "name": "Executive",
        "description": "Leadership-ready layouts with bold typography, crisp structure, and subtle violet accents.",
        "layout_count": 32,
        "thumbnail": "/templates/executive/static/thumbnail.png",
        "themeKey": "executive",
        "tags": ["Violet", "Deep Contrast", "Executive"]
    },
    {
        "id": "editorial",
        "name": "Editorial",
        "description": "Magazine-inspired layouts with refined typography and polished compositions for narrative insights.",
        "layout_count": 24,
        "thumbnail": "/templates/editorial/static/thumbnail.png",
        "themeKey": "editorial",
        "tags": ["Editorial", "Narrative", "Oxford"]
    },
    {
        "id": "dynamic",
        "name": "Dynamic",
        "description": "Bold high-contrast layouts with dark textured backgrounds and warm accents for story-driven lectures.",
        "layout_count": 32,
        "thumbnail": "/templates/dynamic/static/thumbnail.png",
        "themeKey": "dynamic",
        "tags": ["Dark Mode", "High Contrast", "Solar"]
    },
    {
        "id": "civic",
        "name": "Civic",
        "description": "Modern monochrome layouts with bold typography and structured compositions for research and policy.",
        "layout_count": 29,
        "thumbnail": "/templates/civic/static/thumbnail.png",
        "themeKey": "civic",
        "tags": ["Monochrome", "Academic", "Structured"]
    }
]


@router.get("/slides/templates")
async def get_slide_templates():
    """Retrieve all available slide design templates from local catalog or fallback."""
    templates_dir = settings.ROOT_DIR / "backend" / "templates" / "catalog"
    if templates_dir.exists():
        results = []
        for tpath in sorted(templates_dir.iterdir()):
            if tpath.is_dir() and (tpath / "template.json").exists():
                try:
                    with open(tpath / "template.json", "r", encoding="utf-8") as f:
                        data = json.load(f)
                    results.append({
                        "id": tpath.name,
                        "name": data.get("name", tpath.name.title()),
                        "description": data.get("description", ""),
                        "layout_count": len(data.get("layouts", [])),
                        "thumbnail": f"/templates/{tpath.name}/static/thumbnail.png",
                        "themeKey": tpath.name,
                        "tags": [f"{len(data.get('layouts', []))} Layouts", "Presenton Native"]
                    })
                except Exception:
                    pass
        if results:
            return {"templates": results, "source": "local_catalog"}

    return {"templates": DEFAULT_TEMPLATES_FALLBACK, "source": "presenton_cached"}


@router.get("/{project_id}", response_model=ProjectManifest)
async def get_project(project_id: str) -> ProjectManifest:
    """Get project manifest and artifact status."""
    return load_manifest(project_id)


@router.post("/{project_id}/upload")
async def upload_document(project_id: str, file: UploadFile = File(...)) -> Dict[str, Any]:
    """Upload chapter file (PDF/DOCX/TXT) and extract passages."""
    p_dir = get_project_dir(project_id)
    save_path = p_dir / file.filename

    content = await file.read()
    with open(save_path, "wb") as f:
        f.write(content)

    # Run ingestion
    raw_chunks = extract_document(save_path)
    passages = build_passages(raw_chunks)
    passages_path = p_dir / "passages.json"
    save_passages_to_json(passages, passages_path)

    # Update manifest
    manifest = load_manifest(project_id)
    manifest.source_filename = file.filename
    save_manifest(manifest)

    return {
        "status": "success",
        "filename": file.filename,
        "passages_count": len(passages)
    }


@router.get("/{project_id}/passages")
async def get_project_passages(project_id: str) -> Dict[str, str]:
    """Return passages map for grounding verification and text inspection."""
    p_dir = get_project_dir(project_id)
    return load_passages_from_json(p_dir / "passages.json")


class OutlineRequest(BaseModel):
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    title: Optional[str] = None
    prefer_offline: bool = False


@router.post("/{project_id}/outline", response_model=ChapterOutline)
async def generate_outline(project_id: str, req: OutlineRequest = OutlineRequest()) -> ChapterOutline:
    """Extract structured pedagogical outline from chapter passages."""
    try:
        outline = extract_chapter_outline(
            project_id=project_id,
            subject=req.subject,
            grade_level=req.grade_level,
            title=req.title,
            prefer_offline=req.prefer_offline,
        )
        return outline
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{project_id}/outline", response_model=Optional[ChapterOutline])
async def get_outline(project_id: str) -> Optional[ChapterOutline]:
    """Retrieve saved pedagogical outline for project."""
    p_dir = get_project_dir(project_id)
    outline_path = p_dir / "outline.json"
    if not outline_path.exists():
        raise HTTPException(status_code=404, detail="Outline not yet generated for this project")
    with open(outline_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ChapterOutline(**data)


@router.get("/{project_id}/download/{file_path:path}")
async def download_project_file(project_id: str, file_path: str):
    """Download an artifact file from project workspace."""
    p_dir = get_project_dir(project_id)
    target = p_dir / file_path
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="Requested file not found")
    
    try:
        target.resolve().relative_to(p_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Forbidden file access")
        
    return FileResponse(
        path=target,
        filename=target.name
    )


class EditSlidesRequest(BaseModel):
    artifact_id: Optional[str] = None
    theme: str = "col_blue"
    slides: List[Dict[str, Any]]


@router.put("/{project_id}/slides", response_model=Artifact)
async def update_project_slides(project_id: str, req: EditSlidesRequest) -> Artifact:
    """Update slide content and deterministically recompile the presentation."""
    p_dir = get_project_dir(project_id)
    slides_dir = p_dir / "slides"
    slides_dir.mkdir(parents=True, exist_ok=True)
    pptx_path = slides_dir / "slides.pptx"
    json_path = slides_dir / "slides.json"

    # Validate each slide
    parsed_slides = [SlideContent(**s) for s in req.slides]

    # Rebuild PowerPoint presentation
    build_presentation_file(parsed_slides, req.theme, pptx_path)

    # Save updated JSON
    preview_data = {
        "title": parsed_slides[0].title if parsed_slides else "Presentation",
        "theme": req.theme,
        "slides": [s.model_dump() for s in parsed_slides]
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(preview_data, f, indent=2, ensure_ascii=False)

    # Load manifest and update artifact
    manifest = load_manifest(project_id)
    art_id = req.artifact_id or f"art-slides-{project_id}"
    
    existing_art = manifest.artifacts.get(art_id)
    grounding_refs = existing_art.grounding_refs if existing_art else []
    
    updated_art = Artifact(
        id=art_id,
        tool_name="slides",
        project_id=project_id,
        status=ArtifactStatus.APPROVED,
        files=[str(pptx_path.relative_to(p_dir)), str(json_path.relative_to(p_dir))],
        source_data=preview_data,
        grounding_refs=grounding_refs,
        cost_estimate_usd=0.0
    )
    manifest.artifacts[art_id] = updated_art
    save_manifest(manifest)

    return updated_art


class SuggestSlideEditsRequest(BaseModel):
    slide: Dict[str, Any]
    instruction: str = "make_concise"
    custom_prompt: Optional[str] = None


class SuggestSlideEditsResponse(BaseModel):
    project_id: Optional[str] = None
    original_slide: Dict[str, Any]
    suggested_slide: Dict[str, Any]
    explanation: str


class RefineCardRequest(BaseModel):
    slide: Dict[str, Any]
    card_index: int = 0
    instruction: str = "make_concise"
    custom_prompt: Optional[str] = None


class RefineCardResponse(BaseModel):
    project_id: str
    card_index: int
    original_card: Dict[str, Any]
    suggested_card: Dict[str, Any]
    explanation: str


@router.post("/{project_id}/slides/suggest-edits", response_model=SuggestSlideEditsResponse)
async def suggest_slide_edits(project_id: str, req: SuggestSlideEditsRequest) -> SuggestSlideEditsResponse:
    """Intelligently generate suggestions for refining slide content, archetypes, and visuals via Live LLM."""
    import copy
    slide = copy.deepcopy(req.slide)
    original = copy.deepcopy(req.slide)
    inst = req.instruction.lower()
    custom = req.custom_prompt or ""
    title = slide.get("title", "Slide")

    # 1. LIVE LLM REFINEMENT
    llm_provider = get_active_llm_provider()
    if llm_provider != "none":
        try:
            instruction_text = custom if custom.strip() else {
                "make_concise": "Make the slide text concise, punchy, and clear for high visibility.",
                "add_teacher_tip": "Add a practical, actionable teaching tip into speaker notes.",
                "add_discussion_question": "Add a peer discussion think-pair-share prompt to test student comprehension.",
                "simplify": "Simplify technical jargon into learner-friendly academic terminology.",
                "suggest_layout": "Propose the most effective Presenton Smart Layout archetype (e.g. timeline, before_after, pros_cons, pyramid_hierarchy, circular_hub, chart_data) based on the conceptual structure of the content."
            }.get(inst, f"Refine the slide: {inst}")

            refine_prompt = (
                f"You are an expert curriculum assistant and presentation designer refining an instructional slide.\n"
                f"User Instruction: {instruction_text}\n\n"
                f"Current Slide Data:\n{json.dumps(slide, indent=2)}\n\n"
                f"Rules:\n"
                f"1. Return ONLY a valid JSON object with keys:\n"
                f"   - 'suggested_slide': The refined slide object with updated 'title', 'cards', 'bullets', 'speaker_notes', 'archetype', and 'image_query'.\n"
                f"   - 'explanation': A 1-2 sentence explanation of the refinements made.\n"
                f"2. 'archetype': You MAY propose a different archetype if the conceptual content better fits another layout (e.g., 'timeline' for chronological stages, 'before_after' for problem/solution, 'pyramid_hierarchy' for tiers, 'chart_data' for statistics, 'editorial_quote' for core thesis/axiom, 'circular_hub' for core + pillars). If you change it, explain in 'explanation'.\n"
                f"3. 'image_query': If the focus shifts, provide a tailored 2-4 word scientific/educational image search query.\n"
                f"4. Ensure each card has a punchy 'badge', meaningful 'title' (2-4 words), and clear 'body'.\n"
                f"5. Strictly avoid placeholder words or repetitive boilerplate."
            )

            res_str = await call_llm(
                messages=[
                    {"role": "system", "content": refine_prompt},
                    {"role": "user", "content": "Refine the slide according to the instruction. Respond strictly in JSON."}
                ],
                json_mode=True,
                temperature=0.3,
                max_tokens=2048
            )
            if res_str:
                data = safe_json_loads(res_str)
                if data.get("suggested_slide"):
                    suggested = data["suggested_slide"]
                    # Retain slide_number if omitted by LLM
                    if "slide_number" not in suggested and "slide_number" in original:
                        suggested["slide_number"] = original["slide_number"]
                    return SuggestSlideEditsResponse(
                        project_id=project_id,
                        original_slide=original,
                        suggested_slide=suggested,
                        explanation=data.get("explanation", "Refined slide content and layout using live AI synthesis.")
                    )
        except Exception as e:
            logger.error(f"Live LLM slide refinement failed: {e}. Falling back to rule-based.")

    # 2. RULE-BASED FALLBACK
    bullets = slide.get("bullets", []) or []
    cards = slide.get("cards", []) or []
    speaker_notes = slide.get("speaker_notes", "") or ""

    if inst == "make_concise":
        new_bullets = []
        for b in bullets:
            cleaned = b.replace("According to ", "").replace("It is important to note that ", "").replace("Students should understand that ", "")
            words = cleaned.split()
            if len(words) > 10:
                cleaned = " ".join(words[:10]) + "..."
            new_bullets.append(cleaned)
        slide["bullets"] = new_bullets
        
        for c in cards:
            body = c.get("body", "")
            words = body.split()
            if len(words) > 12:
                c["body"] = " ".join(words[:12]) + "..."
        slide["cards"] = cards
        explanation = "Condensed bullet points and card descriptions into concise, high-impact statements for improved classroom slide visibility."

    elif inst == "add_teacher_tip":
        tip = f"Pedagogical Tip for '{title}': Pause for 30 seconds after presenting this slide. Ask 2 random students to restate the definition in their own words before moving to the next concept."
        if speaker_notes:
            slide["speaker_notes"] = f"{speaker_notes}\n\n[Teaching Tip]: {tip}"
        else:
            slide["speaker_notes"] = f"[Teaching Tip]: {tip}"
        explanation = "Added actionable classroom engagement cues to teacher speaker notes."

    elif inst == "add_discussion_question":
        q_card = {
            "badge": "Peer Discussion Checkpoint",
            "title": f"Think-Pair-Share: {title}",
            "body": "Turn to your neighbor: How does this principle apply in everyday life? Formulate one concrete example together.",
        }
        if cards:
            cards.append(q_card)
            slide["cards"] = cards
        else:
            bullets.append(f"Classroom Checkpoint: How does {title} apply in everyday phenomena? Discuss with a partner.")
            slide["bullets"] = bullets
        explanation = "Inserted an active classroom peer-discussion question into the slide."

    elif inst == "simplify":
        simplified_bullets = []
        for b in bullets:
            simplified = b.replace("utilize", "use").replace("subsequently", "next").replace("phenomenon", "event").replace("demonstrates", "shows")
            simplified_bullets.append(simplified)
        slide["bullets"] = simplified_bullets
        explanation = "Simplified academic vocabulary into learner-friendly language for secondary school students."

    elif inst == "suggest_layout":
        # Rule-based archetype optimization based on content signals
        c_count = len(cards)
        t_lower = title.lower()
        if "vs" in t_lower or "difference" in t_lower or "comparison" in t_lower:
            slide["archetype"] = "before_after" if "before" in t_lower else "split_comparison"
            explanation = "Optimized layout to high-contrast comparison archetype for comparative study."
        elif "process" in t_lower or "cycle" in t_lower or "flow" in t_lower:
            slide["archetype"] = "process_cycle"
            explanation = "Switched to Process Cycle layout for continuous pedagogical mechanisms."
        elif "timeline" in t_lower or "history" in t_lower or "phase" in t_lower or "step" in t_lower:
            slide["archetype"] = "timeline"
            explanation = "Switched to Timeline Track archetype for sequential progression."
        elif "data" in t_lower or "experiment" in t_lower or "rate" in t_lower or "measure" in t_lower:
            slide["archetype"] = "chart_data"
            explanation = "Switched to Data Chart Hero archetype to emphasize empirical findings."
        elif "quote" in t_lower or "axiom" in t_lower or "law" in t_lower:
            slide["archetype"] = "editorial_quote"
            explanation = "Switched to Editorial Quote archetype for impactful core thesis presentation."
        else:
            slide["archetype"] = "hero_visual_split" if c_count <= 2 else "card_grid_3"
            explanation = f"Recommended balanced '{slide['archetype']}' archetype for current card count."

    else:
        added_point = custom.strip() or "Additional pedagogical focal point derived from chapter reading."
        if cards:
            cards.append({
                "badge": "Revision Note",
                "title": "Key Concept Refinement",
                "body": added_point
            })
            slide["cards"] = cards
        else:
            bullets.append(added_point)
            slide["bullets"] = bullets
        explanation = f"Applied custom edit request: '{custom or 'Refined slide structure'}'."

    return SuggestSlideEditsResponse(
        project_id=project_id,
        original_slide=original,
        suggested_slide=slide,
        explanation=explanation
    )


@router.post("/{project_id}/slides/refine-card", response_model=RefineCardResponse)
async def refine_single_card(project_id: str, req: RefineCardRequest) -> RefineCardResponse:
    """Intelligently refine a single card on an active slide via Live LLM."""
    import copy
    slide = req.slide
    cards = slide.get("cards", [])
    c_idx = max(0, min(req.card_index, len(cards) - 1)) if cards else 0
    orig_card = copy.deepcopy(cards[c_idx]) if cards else {"badge": "Point", "title": "Concept", "body": ""}
    instruction = req.custom_prompt.strip() if req.custom_prompt and req.custom_prompt.strip() else req.instruction

    # 1. LIVE LLM CARD REFINEMENT
    llm_provider = get_active_llm_provider()
    if llm_provider != "none":
        try:
            card_prompt = (
                f"You are an expert curriculum author refining a single concept card on an educational slide.\n"
                f"Slide Context: Title: '{slide.get('title')}', Archetype: '{slide.get('archetype', 'card_grid_3')}'.\n"
                f"Target Card Current Content: {json.dumps(orig_card, indent=2)}\n"
                f"Instruction: {instruction}\n\n"
                f"Rules:\n"
                f"1. Return ONLY a valid JSON object with keys:\n"
                f"   - 'suggested_card': {{'badge': '1-2 words', 'title': 'punchy 2-4 words', 'body': '1-2 clear sentences'}}\n"
                f"   - 'explanation': '1 concise sentence'\n"
                f"2. Keep it accurate, pedagogical, and crisp."
            )

            res_str = await call_llm(
                messages=[
                    {"role": "system", "content": card_prompt},
                    {"role": "user", "content": "Refine this card. Return strictly JSON."}
                ],
                json_mode=True,
                temperature=0.3,
                max_tokens=512
            )
            if res_str:
                data = safe_json_loads(res_str)
                if data.get("suggested_card"):
                    return RefineCardResponse(
                        project_id=project_id,
                        card_index=c_idx,
                        original_card=orig_card,
                        suggested_card=data["suggested_card"],
                        explanation=data.get("explanation", "Card refined via live AI.")
                    )
        except Exception as e:
            logger.error(f"Live LLM card refinement failed: {e}. Falling back to rule-based.")

    # 2. RULE-BASED FALLBACK
    s_card = copy.deepcopy(orig_card)
    body = s_card.get("body", "")
    words = body.split()
    if req.instruction == "make_concise":
        s_card["body"] = " ".join(words[:10]) + ("..." if len(words) > 10 else "")
        expl = "Condensed card text for rapid classroom reading."
    elif req.instruction == "simplify":
        s_card["body"] = body.replace("utilize", "use").replace("demonstrates", "shows")
        expl = "Simplified technical vocabulary on card."
    else:
        s_card["body"] = f"{body} ({instruction})"
        expl = f"Updated card based on '{instruction}'."

    return RefineCardResponse(
        project_id=project_id,
        card_index=c_idx,
        original_card=orig_card,
        suggested_card=s_card,
        explanation=expl
    )


class GenerateSlideOutlineRequest(BaseModel):
    prompt: Optional[str] = None
    num_slides: int = 6
    language: str = "en"


class SlideOutlineItem(BaseModel):
    id: str
    slide_number: int
    title: str
    content: str
    bullets: List[str]


class GenerateSlideOutlineResponse(BaseModel):
    project_id: str
    prompt: str
    outlines: List[SlideOutlineItem]


class CompileSlideFromOutlineRequest(BaseModel):
    outlines: List[Dict[str, Any]]
    theme: str = "solar"
    artifact_id: Optional[str] = None
    mode: Optional[str] = "smart_dual"  # "smart_dual", "direct_html", "catalog_template", "cards"
    template_id: Optional[str] = None   # e.g. "editorial", "verdant", "nova", "dynamic"



class GenerateSlideScriptRequest(BaseModel):
    slide_number: Optional[int] = 1
    title: str
    subtitle: Optional[str] = None
    archetype: Optional[str] = None
    cards: Optional[List[Dict[str, Any]]] = None
    bullets: Optional[List[str]] = None
    topic: Optional[str] = None
    grade_level: Optional[str] = "Grade 10"
    subject: Optional[str] = "Science"
    style: Optional[str] = "engaging"


class GenerateSlideScriptResponse(BaseModel):
    slide_number: int
    title: str
    speaker_notes: str
    discussion_prompt: Optional[str] = None
    est_delivery: str




@router.post("/{project_id}/slides/generate-outline", response_model=GenerateSlideOutlineResponse)
async def generate_slide_outline(project_id: str, req: GenerateSlideOutlineRequest):
    manifest = load_manifest(project_id)
    p_dir = get_project_dir(project_id)

    passages_path = p_dir / "passages.json"
    passages: Dict[str, str] = {}
    if passages_path.exists():
        passages = load_passages_from_json(passages_path)

    outline_data = manifest.outline
    subject = outline_data.subject if outline_data and outline_data.subject else "General Science"
    grade = outline_data.grade_level if outline_data and outline_data.grade_level else "Grade 10"
    
    # Strip imperative commands and "slides" prefix
    raw_prompt = (req.prompt or "").strip()
    fallback_topic = outline_data.title if outline_data and outline_data.title else manifest.name
    topic = clean_topic_string(raw_prompt, fallback=fallback_topic)
    count = max(3, min(12, req.num_slides))

    # Detect if user topic relates to the project chapter or is an independent custom inquiry
    project_chapter_text = f"{subject} {manifest.name} {outline_data.title if outline_data else ''}".lower()
    is_related_to_chapter = (
        any(term in topic.lower() for term in ["photosynthesis", "cellular respiration", "bioenergetics", "atp", "chloroplast", "chlorophyll", "calvin cycle", "glycolysis", "respiration"]) or
        any(word in project_chapter_text for word in topic.lower().split() if len(word) > 3)
    )

    outlines: List[SlideOutlineItem] = []

    # 1. LIVE LLM SYNTHESIS (Zero placeholders, rich domain insights)
    llm_provider = get_active_llm_provider()
    if llm_provider != "none":
        try:
            if is_related_to_chapter and passages:
                passage_sample = "\n".join([f"[{pid}]: {text[:160]}" for pid, text in list(passages.items())[:8]])
                concepts_str = ", ".join([c.concept for c in (outline_data.concepts[:6] if outline_data else [])])
                objectives_str = "; ".join(outline_data.learning_objectives[:4] if outline_data else [])
                context_block = (
                    f"Ground the presentation in the course curriculum for {grade} {subject}.\n"
                    f"Available Textbook Passages:\n{passage_sample}\n"
                    f"Key Concepts: {concepts_str}\n"
                    f"Learning Objectives: {objectives_str}\n"
                )
            else:
                context_block = (
                    f"Target Audience / Academic Level: {grade} students.\n"
                    f"Subject Domain: Governed strictly by the user requested topic '{topic}'. Do not mix with unrelated topics.\n"
                )

            system_prompt = (
                f"You are a master curriculum specialist creating an academic presentation outline.\n"
                f"The teacher explicitly requested a presentation on: '{topic}'.\n"
                f"Create a coherent, pedagogical lecture sequence of exactly {count} slides strictly on: '{topic}'.\n\n"
                f"{context_block}\n"
                f"Rules:\n"
                f"1. Output ONLY a valid JSON object with key 'slides': a list of {count} slide objects.\n"
                f"2. Every slide MUST be directly and exclusively about '{topic}'. Do NOT substitute or hallucinate unrelated subjects.\n"
                f"3. Each slide object must have 'title' (specific concept title, NOT 'Slide 1' or 'Introduction') and 'bullets' (list of 3 substantive, concrete points explaining mechanisms, definitions, equations, or demonstrations).\n"
                f"4. Slide 1 must be the overarching topic title & foundational thesis.\n"
                f"5. Intermediate slides must cover key mechanisms, equations, or scientific laws progressively.\n"
                f"6. Final slide must be 'Summary & Classroom Checkpoint' with formative peer questions.\n"
                f"7. NEVER use boilerplate filler words like 'Pedagogical Framework: Tailored for learners' or 'Practical Insight: Real-world application'. Use real domain terminology!"
            )

            user_msg = f"Generate {count} rich slides for '{topic}' in language '{req.language}'. Respond strictly in JSON."
            response_json_str = await call_llm(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_msg}
                ],
                json_mode=True,
                temperature=0.3,
                max_tokens=2048
            )

            if response_json_str:
                data = safe_json_loads(response_json_str)
                raw_slides = data.get("slides") or data.get("outlines") or []
                if isinstance(raw_slides, list) and len(raw_slides) >= 2:
                    for idx, s in enumerate(raw_slides[:count]):
                        s_title = s.get("title", f"{topic}: Unit {idx+1}")
                        s_bullets = s.get("bullets", [])
                        if not s_bullets and s.get("content"):
                            s_bullets = [line.lstrip("- *#").strip() for line in s["content"].split("\n") if line.strip()]
                        if not s_bullets:
                            s_bullets = [f"Core principle of {s_title}", "Empirical observation and mechanism", "Curriculum application"]

                        outlines.append(SlideOutlineItem(
                            id=str(uuid.uuid4())[:8],
                            slide_number=idx + 1,
                            title=s_title,
                            content=f"### {s_title}\n" + "\n".join([f"- {b}" for b in s_bullets]),
                            bullets=s_bullets
                        ))
                    logger.info(f"Successfully synthesized {len(outlines)} slides via {llm_provider}")
        except Exception as e:
            logger.error(f"Failed LLM outline synthesis: {e}")
            outlines = []

    # 2. DETERMINISTIC CONTEXTUAL FALLBACK (Zero boilerplate, derived from real concepts)
    if not outlines:
        concepts = outline_data.concepts if (outline_data and is_related_to_chapter) else []
        vocabulary = outline_data.vocabulary if (outline_data and is_related_to_chapter) else []
        passage_items = list(passages.items()) if is_related_to_chapter else []

        # Slide 1: Primary Foundational Topic
        thesis = f"{topic}: Governing Mechanisms & Laws"
        f1 = f"Foundational inquiry into {topic} within {subject} ({grade})."
        f2 = outline_data.summary[:140] if (outline_data and is_related_to_chapter and outline_data.summary) else f"Core physical laws and experimental principles governing {topic}."
        f3 = f"Grounded in verified curriculum textbook passages ({len(passages)} passages indexed)." if is_related_to_chapter else f"Structured curriculum standards for {grade} learners."
        outlines.append(SlideOutlineItem(
            id=str(uuid.uuid4())[:8],
            slide_number=1,
            title=thesis,
            content=f"### {thesis}\n- {f1}\n- {f2}\n- {f3}",
            bullets=[f1, f2, f3]
        ))

        # Intermediate Concept Slides
        target_intermediate = count - 2
        for i in range(max(1, target_intermediate)):
            slide_num = len(outlines) + 1
            if i < len(concepts):
                c = concepts[i]
                c_title = c.concept or f"Core Principle {i+1}"
                ref = f" [{c.grounding.passage_id}]" if c.grounding and c.grounding.passage_id else ""
                b1 = f"{c.explanation}{ref}"
                v_def = f"Key Term: {vocabulary[i].term} — {vocabulary[i].definition}" if i < len(vocabulary) else "Observed physical phenomena and experimental evidence."
                b3 = "Quantitative relationship and governing theoretical derivation."
                outlines.append(SlideOutlineItem(
                    id=str(uuid.uuid4())[:8],
                    slide_number=slide_num,
                    title=c_title,
                    content=f"### {c_title}\n- {b1}\n- {v_def}\n- {b3}",
                    bullets=[b1, v_def, b3]
                ))
            elif i < len(passage_items):
                pid, text = passage_items[i]
                sentence = text.split(".")[0] if "." in text else text[:70]
                c_title = sentence[:45]
                b1 = f"Curriculum Passage: {sentence}. [{pid}]"
                b2 = text[len(sentence):len(sentence)+120].strip().lstrip(".") or "Supporting empirical observations."
                b3 = "Key takeaway and mathematical relationships."
                outlines.append(SlideOutlineItem(
                    id=str(uuid.uuid4())[:8],
                    slide_number=slide_num,
                    title=c_title,
                    content=f"### {c_title}\n- {b1}\n- {b2}\n- {b3}",
                    bullets=[b1, b2, b3]
                ))
            else:
                c_title = f"{topic}: Key Mechanism {i+1}"
                b1 = f"Theoretical formulation of {topic} principles."
                b2 = "Experimental methodology and observable evidence."
                b3 = "Practical domain calculation and inquiry checkpoint."
                outlines.append(SlideOutlineItem(
                    id=str(uuid.uuid4())[:8],
                    slide_number=slide_num,
                    title=c_title,
                    content=f"### {c_title}\n- {b1}\n- {b2}\n- {b3}",
                    bullets=[b1, b2, b3]
                ))

        # Final Slide: Summary & Formative Check
        summary_title = f"{topic}: Summary & Formative Classroom Check"
        s1 = f"Review of fundamental postulates and definitions for {topic}."
        s2 = "Contrast intuitive physical misconceptions against proven theoretical laws."
        s3 = "Formative Checkpoint: 3-minute peer discussion on domain applications."
        outlines.append(SlideOutlineItem(
            id=str(uuid.uuid4())[:8],
            slide_number=len(outlines) + 1,
            title=summary_title,
            content=f"### {summary_title}\n- {s1}\n- {s2}\n- {s3}",
            bullets=[s1, s2, s3]
        ))

    return GenerateSlideOutlineResponse(
        project_id=project_id,
        prompt=topic,
        outlines=outlines
    )


@router.post("/{project_id}/slides/compile-from-outline", response_model=Artifact)
async def compile_slide_from_outline(project_id: str, req: CompileSlideFromOutlineRequest):
    manifest = load_manifest(project_id)
    p_dir = get_project_dir(project_id)
    output_dir = p_dir / "slides"
    output_dir.mkdir(parents=True, exist_ok=True)

    pptx_path = output_dir / "slides.pptx"
    json_path = output_dir / "slides.json"

    outline_data = manifest.outline
    subject = outline_data.subject if outline_data and outline_data.subject else "General Science"
    grade = outline_data.grade_level if outline_data and outline_data.grade_level else "Grade 10"

    slides_data: List[SlideContent] = []
    raw_slides_for_json: List[Dict[str, Any]] = []

    # Resolve active template & design system
    raw_theme_or_tpl = (req.template_id or req.theme or "editorial").lower()
    tpl_info = get_template_catalog_info(raw_theme_or_tpl)
    if not tpl_info:
        tpl_info = get_template_catalog_info("editorial")
    
    tpl_name = tpl_info["name"] if tpl_info else raw_theme_or_tpl.title()
    tpl_colors = tpl_info["colors"] if tpl_info else {}
    bg_color = tpl_colors.get("background", "#1D242D")
    accent_color = tpl_colors.get("primary", "#155F99")
    card_color = tpl_colors.get("card", "#1DA1F2")
    text_color = tpl_colors.get("background_text") or tpl_colors.get("primary_text") or "#FFFFFF"
    available_layouts = tpl_info["layouts"] if tpl_info else []

    # 1. LIVE LLM SLIDE SYNTHESIS (Template-Driven Layout Selection & Rich Content)
    llm_provider = get_active_llm_provider()
    compiled_by_llm = False
    if llm_provider != "none":
        try:
            outline_summary = []
            for idx, o in enumerate(req.outlines):
                b_list = o.get("bullets", [])
                if not b_list and o.get("content"):
                    lines = o["content"].split("\n")
                    b_list = [line.lstrip("- *#").strip() for line in lines if line.strip() and not line.strip().startswith("#")]
                outline_summary.append({
                    "slide_number": idx + 1,
                    "title": o.get("title", f"Slide {idx + 1}"),
                    "bullets": b_list
                })

            layout_choices_text = "\n".join([f"- '{l['id']}': {l['description']}" for l in available_layouts[:16]])

            compiler_prompt = (
                f"You are a master presentation designer and curriculum author for {grade} learners.\n"
                f"Convert the given approved presentation outline into a complete, presentation-ready slide deck.\n"
                f"You MUST design the slide deck strictly adhering to the '{tpl_name}' ({raw_theme_or_tpl}) design system.\n\n"
                f"DESIGN SYSTEM PALETTE:\n"
                f"- Background Canvas: {bg_color}\n"
                f"- Primary Accent: {accent_color}\n"
                f"- Card / Surface: {card_color}\n"
                f"- Text / Headings: {text_color}\n\n"
                f"AVAILABLE PRESENTON TEMPLATE LAYOUTS IN '{raw_theme_or_tpl}':\n"
                f"{layout_choices_text}\n\n"
                f"For each slide in the outline, synthesize rich, presentation-ready JSON:\n"
                f"1. 'template_layout_id': You MUST select the most fitting layout ID from the available template layouts list above.\n"
                f"   - Slide 1 MUST select a title / cover layout (e.g. 'title_slide_...').\n"
                f"   - Subsequent slides MUST select distinct layouts (two-column list, callouts, cards, process, or metrics).\n"
                f"   - STRICT RULE: NEVER repeat the same layout consecutively! Ensure diverse layout rhythm across the deck.\n"
                f"2. 'archetype': Corresponding Presenton smart archetype for fallback cards canvas ('hero_title', 'hero_visual_split', 'staircase_progression', 'sequence_steps', 'editorial_quote', 'card_grid_3', 'bento_4', 'before_after', 'pros_cons').\n"
                f"3. 'subtitle': A concise academic strand (e.g., '{subject.upper()} · {grade.upper()} · {tpl_name.upper()}').\n"
                f"4. 'standard': Relevant curriculum competency (e.g., '{subject} Core Standard').\n"
                f"5. 'has_visual': Boolean. True ONLY for slides whose archetype visually features an image (like 'hero_visual_split' or 'image_hero_full'). For all other archetypes, set to false.\n"
                f"6. 'image_query': If 'has_visual' is true, provide a concise 2-4 word search query for a scientific illustration, real photograph, or 3D diagram (e.g. 'chloroplast light absorption', 'archimedes principle fluid mechanics'). For non-visual slides, omit or set to null.\n"
                f"7. 'chart_data': (Optional, for comparative/experimental slides): A list of 2-4 points with 'label' and numeric 'value' (e.g. [{{\"label\": \"Blue (450nm)\", \"value\": 92}}, {{\"label\": \"Green (550nm)\", \"value\": 18}}, {{\"label\": \"Red (680nm)\", \"value\": 85}}]).\n"
                f"8. 'cards': A list of 2 or 3 distinct content cards. Each card must have:\n"
                f"   - 'badge': Concise 1-2 word tag (e.g. 'Law 01', 'Mechanism', 'Formula', 'Application').\n"
                f"   - 'title': Short, punchy 2 to 4-word heading (e.g. 'Inertial Mass', 'Normal Contact Force'). NEVER slice sentences or use generic filler!\n"
                f"   - 'body': Clear, substantive explanation (1-2 sentences) of the concept.\n"
                f"9. 'speaker_notes': Authentic, realistic teacher notes (3-4 sentences): how to explain the slide to students, what analogy or chalkboard diagram to use, common student pitfalls to clarify, and a discussion question to ask.\n"
                f"10. 'html_content': (Optional) Bespoke 1280x720 Tailwind HTML section string reflecting {bg_color} background and {text_color} text.\n\n"
                f"Rules:\n"
                f"- Return strictly a valid JSON object with key 'slides': a list of {len(req.outlines)} slide objects.\n"
                f"- NEVER use placeholder text or boilerplate repetition."
            )

            res_str = await call_llm(
                messages=[
                    {"role": "system", "content": compiler_prompt},
                    {"role": "user", "content": f"Outline to compile:\n{json.dumps(outline_summary, indent=2)}\n\nGenerate complete slide specifications strictly in JSON."}
                ],
                json_mode=True,
                temperature=0.3,
                max_tokens=4096
            )
            if res_str:
                data = safe_json_loads(res_str)
                llm_slides = data.get("slides") or []
                if isinstance(llm_slides, list) and len(llm_slides) >= 1:
                    for idx, req_o in enumerate(req.outlines):
                        s = llm_slides[idx] if idx < len(llm_slides) else {}
                        raw_title = s.get("title") or req_o.get("title", f"Slide {idx + 1}")
                        title = raw_title.replace("&", "and").replace("<", "").replace(">", "").strip()
                        raw_cards = s.get("cards") or []
                        cards = []
                        for c_idx, c in enumerate(raw_cards[:3]):
                            cards.append(SlideCard(
                                badge=c.get("badge") or f"Concept {c_idx + 1}",
                                title=c.get("title") or f"Principle {c_idx + 1}",
                                body=c.get("body") or "Instructional mechanism."
                            ))
                        if not cards:
                            b_list = req_o.get("bullets", [])
                            for c_idx, b in enumerate(b_list[:3]):
                                term = b.split(":")[0].strip() if ":" in b else " ".join(b.split()[:3]).rstrip(".,;:-")
                                cards.append(SlideCard(badge=f"Point 0{c_idx+1}", title=term or "Principle", body=b))
                        if not cards:
                            cards = [SlideCard(badge="Core Concept", title="Instructional Principle", body="Classroom curriculum focal point.")]

                        orig_bullets = req_o.get("bullets", [])
                        arch = s.get("archetype") or ("hero_title" if idx == 0 else "card_grid_3")
                        if idx == 0 and arch not in ("hero_title", "hero_stat"):
                            arch = "hero_title"

                        notes = s.get("speaker_notes")
                        if not notes or len(notes) < 20:
                            b0 = orig_bullets[0] if orig_bullets else "the foundational concept"
                            b1 = orig_bullets[1] if len(orig_bullets) > 1 else "key observable mechanics"
                            notes = f"Introduce {title} by drawing students' attention to: {b0}. Contrast common student misconceptions against: {b1}."

                        # Only resolve/generate images for archetypes that explicitly feature a visual layout
                        is_visual = arch in ("hero_visual_split", "image_hero_full") or s.get("has_visual") is True
                        if is_visual:
                            img_query = s.get("image_query") or f"{title} scientific illustration"
                            img_res = resolve_image(img_query, title)
                            img_url = img_res["url"]
                        else:
                            img_query = None
                            img_url = None

                        c_data = s.get("chart_data")

                        slide_dict = {
                            "title": title,
                            "subtitle": s.get("subtitle") or f"{subject} • Level: {grade}",
                            "cards": [c.model_dump() for c in cards],
                            "bullets": orig_bullets,
                            "slide_number": idx + 1
                        }

                        # Render authentic template layout HTML
                        chosen_layout = s.get("template_layout_id")
                        rendered_html, rendered_layout_id = render_template_layout_html(raw_theme_or_tpl, chosen_layout, slide_dict)
                        html_c = rendered_html or s.get("html_content")
                        if not html_c or len(html_c) < 50:
                            html_c = generate_default_slide_html(
                                title=title,
                                archetype=arch,
                                cards=cards,
                                image_url=img_url,
                                subtitle=slide_dict["subtitle"],
                                theme_name=raw_theme_or_tpl
                            )

                        final_layout_id = rendered_layout_id or chosen_layout

                        slide_obj = SlideContent(
                            slide_number=idx + 1,
                            title=title,
                            subtitle=slide_dict["subtitle"],
                            archetype=arch,
                            cards=cards,
                            bullets=orig_bullets,
                            speaker_notes=notes,
                            image_query=img_query,
                            image_url=img_url,
                            chart_data=c_data,
                            html_content=html_c,
                            template_layout_id=final_layout_id
                        )
                        slides_data.append(slide_obj)
                        raw_slides_for_json.append(slide_obj.model_dump())
                    compiled_by_llm = True
                    logger.info(f"Successfully compiled {len(slides_data)} slides via live LLM with template '{raw_theme_or_tpl}'")
        except Exception as e:
            logger.error(f"Live LLM slide compilation failed: {e}. Using intelligent fallback.")
            slides_data = []
            raw_slides_for_json = []

    # 2. INTELLIGENT FALLBACK IF LLM FAILS OR OFFLINE
    if not compiled_by_llm:
        for idx, item in enumerate(req.outlines):
            raw_title = item.get("title", f"Slide {idx + 1}")
            title = raw_title.replace("&", "and").replace("<", "").replace(">", "").strip()
            bullets = item.get("bullets", [])
            if not bullets and item.get("content"):
                lines = item["content"].split("\n")
                bullets = [line.lstrip("- *#").strip() for line in lines if line.strip() and not line.strip().startswith("#")]

            # Non-repetitive Presenton archetype rhythm across the deck
            ARCHETYPE_RHYTHM = [
                "hero_title",
                "hero_visual_split",
                "before_after",
                "sequence_steps",
                "chart_data",
                "pyramid_hierarchy",
                "pros_cons",
                "circular_hub",
                "staircase_progression",
                "stats_grid",
                "process_cycle",
                "editorial_quote",
                "bento_4"
            ]
            archetype = ARCHETYPE_RHYTHM[idx % len(ARCHETYPE_RHYTHM)]
            cards = []
            for c_idx, b in enumerate(bullets[:3]):
                if ":" in b:
                    parts = b.split(":", 1)
                    term = parts[0].strip()
                    desc = parts[1].strip()
                elif " — " in b or " - " in b:
                    sep = " — " if " — " in b else " - "
                    parts = b.split(sep, 1)
                    term = parts[0].strip()
                    desc = parts[1].strip()
                else:
                    words = b.split()
                    term = " ".join(words[:3]).rstrip(".,;:-") if len(words) >= 2 else b
                    desc = b

                cards.append(SlideCard(
                    badge=f"Point 0{c_idx + 1}",
                    title=term,
                    body=desc
                ))
            if not cards:
                cards.append(SlideCard(badge="Core Concept", title="Instructional Principle", body="Classroom curriculum focal point."))

            b0 = bullets[0] if bullets else "the foundational concept"
            b1 = bullets[1] if len(bullets) > 1 else "governing observable mechanics"
            speaker_notes = f"Introduce {title} by drawing students' attention to {b0}. Contrast common student misconceptions against {b1}."

            # Only resolve/generate images for archetypes that explicitly feature a visual layout
            is_visual = archetype in ("hero_visual_split", "image_hero_full")
            if is_visual:
                img_query = f"{title} scientific illustration"
                img_res = resolve_image(img_query, title)
                img_url = img_res["url"]
            else:
                img_query = None
                img_url = None

            slide_dict = {
                "title": title,
                "subtitle": f"{subject} • Level: {grade}",
                "cards": [c.model_dump() for c in cards],
                "bullets": bullets,
                "slide_number": idx + 1
            }

            # Select layout from template catalog
            layout_id = None
            if available_layouts:
                if idx == 0:
                    layout_id = available_layouts[0]["id"]
                else:
                    rem = available_layouts[1:] if len(available_layouts) > 1 else available_layouts
                    layout_id = rem[(idx - 1) % len(rem)]["id"]

            rendered_html, rendered_layout_id = render_template_layout_html(raw_theme_or_tpl, layout_id, slide_dict)
            html_c = rendered_html
            if not html_c or len(html_c) < 50:
                html_c = generate_default_slide_html(
                    title=title,
                    archetype=archetype,
                    cards=cards,
                    image_url=img_url,
                    subtitle=slide_dict["subtitle"],
                    theme_name=raw_theme_or_tpl
                )

            slide_obj = SlideContent(
                slide_number=idx + 1,
                title=title,
                subtitle=slide_dict["subtitle"],
                archetype=archetype,
                cards=cards,
                bullets=bullets,
                speaker_notes=speaker_notes,
                image_query=img_query,
                image_url=img_url,
                html_content=html_c,
                template_layout_id=rendered_layout_id or layout_id
            )
            slides_data.append(slide_obj)
            raw_slides_for_json.append(slide_obj.model_dump())

    # Build PPTX with requested theme
    theme_name = raw_theme_or_tpl
    build_presentation_file(slides_data, theme_name, pptx_path)

    preview_data = {
        "title": manifest.name,
        "theme": theme_name,
        "slides": raw_slides_for_json
    }
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(preview_data, f, indent=2, ensure_ascii=False)

    art_id = req.artifact_id or f"art-slides-{manifest.project_id[:6]}"
    artifact = Artifact(
        id=art_id,
        tool_name="slides",
        project_id=project_id,
        status=ArtifactStatus.APPROVED,
        files=[str(pptx_path.relative_to(p_dir)), str(json_path.relative_to(p_dir))],
        source_data=preview_data,
        grounding_refs=[]
    )

    manifest.artifacts[art_id] = artifact
    save_manifest(manifest)
    return artifact


@router.post("/{project_id}/slides/generate-script", response_model=GenerateSlideScriptResponse)
async def generate_slide_script(project_id: str, req: GenerateSlideScriptRequest):
    manifest = load_manifest(project_id)
    outline_data = manifest.outline
    subject = req.subject or (outline_data.subject if outline_data and outline_data.subject else "Science")
    grade = req.grade_level or (outline_data.grade_level if outline_data and outline_data.grade_level else "Grade 10")

    cards_desc = []
    if req.cards:
        for c in req.cards:
            b = c.get("badge", "")
            t = c.get("title", "")
            body = c.get("body", "")
            cards_desc.append(f"- [{b}] {t}: {body}")
    elif req.bullets:
        for b in req.bullets:
            cards_desc.append(f"- {b}")
    cards_text = "\n".join(cards_desc) if cards_desc else "General slide concept introduction."

    prompt = (
        f"You are a master educator teaching {grade} {subject}.\n"
        f"Write a realistic, professional, spoken teacher narration script for presenting this slide:\n"
        f"Slide {req.slide_number}: '{req.title}'\n"
        f"Layout Archetype: {req.archetype or 'concept overview'}\n"
        f"Cards on screen:\n{cards_text}\n\n"
        f"Requirements:\n"
        f"1. 'speaker_notes': Spoken lecture script (3-5 sentences). Give the teacher natural conversational phrasing: opening hook, concise explanation of the key mechanism shown in the cards, a relatable real-world analogy, and common misconceptions to address.\n"
        f"2. 'discussion_prompt': A thought-provoking 60-second formative question for students.\n"
        f"3. 'est_delivery': Realistic duration (e.g. '2m 30s' or '3m 15s').\n"
        f"Return strictly valid JSON: {{\"speaker_notes\": \"...\", \"discussion_prompt\": \"...\", \"est_delivery\": \"...\"}}"
    )

    llm_resp = await call_llm([
        {"role": "system", "content": "You are a master pedagogical speaker that outputs valid JSON."},
        {"role": "user", "content": prompt}
    ], json_mode=True, temperature=0.3, max_tokens=1024)

    if llm_resp:
        try:
            data = safe_json_loads(llm_resp)
            notes = data.get("speaker_notes")
            if notes:
                disc = data.get("discussion_prompt", "")
                full_notes = notes
                if disc and "Discussion:" not in notes:
                    full_notes += f"\n\nFormative Discussion Prompt: {disc}"
                return GenerateSlideScriptResponse(
                    slide_number=req.slide_number or 1,
                    title=req.title,
                    speaker_notes=full_notes,
                    discussion_prompt=disc,
                    est_delivery=data.get("est_delivery", "3m 00s")
                )
        except Exception as e:
            logger.warning(f"Failed to parse LLM script response: {e}")

    # Fallback if LLM unavailable
    fallback_notes = f"Introduce {req.title}. Guide students through the key observations on this slide, contrast against intuitive misconceptions, and invite questions before proceeding."
    return GenerateSlideScriptResponse(
        slide_number=req.slide_number or 1,
        title=req.title,
        speaker_notes=fallback_notes,
        discussion_prompt="How does this mechanism relate to observations from prior chapters?",
        est_delivery="3m 00s"
    )





