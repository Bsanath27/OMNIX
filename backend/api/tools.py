from typing import List, Dict, Any, Optional
from pathlib import Path
import json
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from backend.core.config import settings
from backend.core.registry import registry, ExecutionContext
from backend.core.models import Artifact, ToolBrief, ProjectManifest
from backend.tools.ingestion.grounding import load_passages_from_json

router = APIRouter(prefix="/api/tools", tags=["Tools"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_tools() -> List[Dict[str, Any]]:
    """Return all registered capability tools with their input JSON schemas."""
    return registry.list_tools()


@router.post("/{tool_name}/run", response_model=Artifact)
async def run_tool(
    tool_name: str,
    brief: Dict[str, Any],
    project_id: str = Query(..., description="Project ID")
) -> Artifact:
    """Execute a capability tool for a given project."""
    tool = registry.get(tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    project_dir = settings.PROJECTS_DIR / project_id
    if not project_dir.exists():
        raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found")

    passages_path = project_dir / "passages.json"
    passages = load_passages_from_json(passages_path) if passages_path.exists() else {}

    ctx = ExecutionContext(
        project_id=project_id,
        project_dir=str(project_dir),
        passages=passages,
    )

    # Validate brief using tool's brief_model
    typed_brief = tool.brief_model(**brief)
    artifact = await tool.run(typed_brief, ctx)

    # Save artifact to project manifest
    manifest_path = project_dir / "manifest.json"
    if manifest_path.exists():
        try:
            with open(manifest_path, "r", encoding="utf-8") as f:
                manifest_data = json.load(f)
            manifest = ProjectManifest(**manifest_data)
            manifest.artifacts[artifact.id] = artifact
            with open(manifest_path, "w", encoding="utf-8") as f:
                json.dump(manifest.model_dump(mode="json"), f, indent=2)
        except Exception:
            pass

    return artifact


@router.get("/presenton/status")
async def get_presenton_status():
    """Check Presenton container health and start if stopped."""
    import httpx
    import subprocess

    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            res = await client.get("http://localhost:5001")
            if res.status_code == 200:
                return {"status": "running", "url": "http://localhost:5001"}
    except Exception:
        pass

    try:
        subprocess.run(["docker", "start", "presenton"], capture_output=True, timeout=5)
        return {"status": "starting", "url": "http://localhost:5001"}
    except Exception as e:
        return {"status": "offline", "error": str(e), "url": "http://localhost:5001"}


class PresentonCreateRequest(BaseModel):
    content: str
    n_slides: Optional[int] = 7
    language: Optional[str] = "en-US"
    generation_mode: Optional[str] = "standard"


@router.post("/slides/create")
@router.post("/presenton/create-presentation")
async def create_presenton_presentation(req: PresentonCreateRequest):
    """Creates a presentation on the local Presenton engine and returns the id and direct outline/theme url."""
    import httpx
    import subprocess

    # Ensure container is alive
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            await client.get("http://localhost:5001")
    except Exception:
        try:
            subprocess.run(["docker", "start", "presenton"], capture_output=True, timeout=5)
        except Exception:
            pass

    content = req.content.strip() if req.content else "Classroom Presentation"

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "http://localhost:5001/api/v1/ppt/presentation/create",
                json={
                    "content": content,
                    "version": "v2-standard",
                    "n_slides": req.n_slides or 7,
                    "language": req.language or "en-US",
                    "generation_mode": req.generation_mode or "standard",
                    "include_title_slide": True,
                    "include_table_of_contents": False,
                    "instructions": (
                        "Structure this as a classroom lesson, not a business pitch. "
                        "Start with a learning objective slide ('By the end of this, learners will be able to...'). "
                        "Include a concept explanation slide with an analogy or real-world example. "
                        "Add a worked example or step-by-step demonstration slide. "
                        "Include a common misconception or 'Did you know?' slide if relevant. "
                        "End with a summary and 1-2 reflection questions. "
                        "Use plain, direct academic language. Avoid business jargon (ROI, stakeholders, leverage, pipeline). "
                        "Do not include presenter bios, company overviews, or sales calls-to-action."
                    ),
                }
            )
            if resp.status_code == 200:
                data = resp.json()
                presentation_id = data.get("id")
                return {
                    "success": True,
                    "presentation_id": presentation_id,
                    "url": f"http://localhost:5001/outline?id={presentation_id}"
                }
            else:
                return {"success": False, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}



