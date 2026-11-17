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
from backend.tools.slides.slide_tool import SlideContent, build_presentation_file

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



