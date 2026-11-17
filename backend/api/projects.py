import json
import uuid
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
from backend.tools.slides.slide_tool import SlideContent, SlideCard, build_presentation_file

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
    original_slide: Dict[str, Any]
    suggested_slide: Dict[str, Any]
    explanation: str


@router.post("/{project_id}/slides/suggest-edits", response_model=SuggestSlideEditsResponse)
async def suggest_slide_edits(project_id: str, req: SuggestSlideEditsRequest) -> SuggestSlideEditsResponse:
    """Intelligently generate suggestions for refining slide content (zero login, offline-friendly)."""
    import copy
    slide = copy.deepcopy(req.slide)
    original = copy.deepcopy(req.slide)
    inst = req.instruction.lower()
    custom = req.custom_prompt or ""
    explanation = ""

    bullets = slide.get("bullets", []) or []
    cards = slide.get("cards", []) or []
    speaker_notes = slide.get("speaker_notes", "") or ""
    title = slide.get("title", "Slide")

    if inst == "make_concise":
        # Condense bullets to essential high-impact keywords
        new_bullets = []
        for b in bullets:
            # Strip wordy prefixes
            cleaned = b.replace("According to ", "").replace("It is important to note that ", "").replace("Students should understand that ", "")
            words = cleaned.split()
            if len(words) > 10:
                cleaned = " ".join(words[:10]) + "..."
            new_bullets.append(cleaned)
        slide["bullets"] = new_bullets
        
        # Condense cards
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

    else:
        # Custom revision prompt
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
        original_slide=original,
        suggested_slide=slide,
        explanation=explanation
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


@router.post("/{project_id}/slides/generate-outline", response_model=GenerateSlideOutlineResponse)
async def generate_slide_outline(project_id: str, req: GenerateSlideOutlineRequest):
    manifest = load_manifest(project_id)
    p_dir = get_project_dir(project_id)

    passages_path = p_dir / "passages.json"
    passages: Dict[str, str] = {}
    if passages_path.exists():
        passages = load_passages_from_json(passages_path)

    topic = (req.prompt or "").strip() or manifest.name
    count = max(3, min(12, req.num_slides))

    outlines: List[SlideOutlineItem] = []

    # Slide 1: Introduction
    intro_content = f"### {topic}\n- Curriculum Context: Fundamental Postulates & Core Definitions\n- Pedagogical Scope: Classroom instruction and guided inquiries\n- Verified Grounding: Textbook references linked throughout"
    outlines.append(SlideOutlineItem(
        id=str(uuid.uuid4())[:8],
        slide_number=1,
        title=topic,
        content=intro_content,
        bullets=[
            "Curriculum Context: Fundamental Postulates & Core Definitions",
            "Pedagogical Scope: Classroom instruction and guided inquiries",
            "Verified Grounding: Textbook references linked throughout"
        ]
    ))

    # Concept slides
    passage_items = list(passages.items())
    for i in range(2, count):
        if passage_items and (i - 2) < len(passage_items):
            pid, text = passage_items[i - 2]
            title = f"Core Principle: Part {i-1}"
            first_sentence = text.split(".")[0] if "." in text else text[:80]
            b1 = f"Primary Mechanism: {first_sentence} [Ref: {pid}]"
            b2 = "Observable Phenomenon: Experimental verification and physical evidence."
            b3 = "Instructional Focus: Critical conceptual model for student mastery."
        else:
            title = f"Analytical Mechanism {i-1}"
            b1 = f"Theoretical Foundation: Key postulates defining {topic} in practice."
            b2 = "Mathematical Representation: Governing relations and vector dynamics."
            b3 = "Practical Demonstration: Thought experiment illustrating key constraints."

        content = f"### {title}\n- {b1}\n- {b2}\n- {b3}"
        outlines.append(SlideOutlineItem(
            id=str(uuid.uuid4())[:8],
            slide_number=i,
            title=title,
            content=content,
            bullets=[b1, b2, b3]
        ))

    # Final Slide: Summary & Checkpoint
    summary_title = "Summary & Classroom Checkpoint"
    s1 = f"Core Consolidation: Review of governing mechanisms of {topic}."
    s2 = "Common Misconceptions: Explicit contrast between physical intuition and theoretical proof."
    s3 = "Formative Assessment: 3-question peer discussion and self-reflection exercise."
    summary_content = f"### {summary_title}\n- {s1}\n- {s2}\n- {s3}"
    outlines.append(SlideOutlineItem(
        id=str(uuid.uuid4())[:8],
        slide_number=count,
        title=summary_title,
        content=summary_content,
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

    slides_data: List[SlideContent] = []
    raw_slides_for_json: List[Dict[str, Any]] = []

    for idx, item in enumerate(req.outlines):
        title = item.get("title", f"Slide {idx + 1}")
        bullets = item.get("bullets", [])
        if not bullets and item.get("content"):
            lines = item["content"].split("\n")
            bullets = [line.lstrip("- *#").strip() for line in lines if line.strip() and not line.strip().startswith("#")]

        archetype = "hero_stat" if idx == 0 else "card_grid_3"
        cards = []
        for c_idx, b in enumerate(bullets[:3]):
            cards.append(SlideCard(
                badge=f"Concept {c_idx + 1}",
                title=f"Principle {c_idx + 1}",
                body=b
            ))
        if not cards:
            cards.append(SlideCard(badge="Postulate", title="Core Concept", body="Classroom instructional focal point."))

        slide_obj = SlideContent(
            slide_number=idx + 1,
            title=title,
            subtitle="Curriculum Unit · Grade 11 Physics",
            archetype=archetype,
            cards=cards,
            bullets=bullets,
            speaker_notes=f"Guide learners through {title}. Connect to chapter textbook passages before moving to next slide."
        )
        slides_data.append(slide_obj)
        raw_slides_for_json.append(slide_obj.model_dump())

    # Build PPTX
    theme_name = req.theme
    if theme_name in ("solar", "solar_obsidian"):
        theme_name = "solar_obsidian"
    elif theme_name == "midnight":
        theme_name = "midnight_tech"
    elif theme_name == "academic":
        theme_name = "academic_clean"
    else:
        theme_name = "col_blue"

    build_presentation_file(slides_data, theme_name, pptx_path)

    preview_data = {
        "title": manifest.name,
        "theme": req.theme,
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




