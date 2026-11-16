from typing import List, Dict, Any
from pathlib import Path
import json
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


