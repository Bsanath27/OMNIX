from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException
from backend.core.registry import registry, ExecutionContext
from backend.core.models import Artifact, ToolBrief

router = APIRouter(prefix="/api/tools", tags=["Tools"])


@router.get("", response_model=List[Dict[str, Any]])
async def list_tools() -> List[Dict[str, Any]]:
    """Return all registered capability tools with their input JSON schemas."""
    return registry.list_tools()


@router.post("/{tool_name}/run", response_model=Artifact)
async def run_tool(tool_name: str, brief: ToolBrief, project_id: str) -> Artifact:
    """Execute a capability tool for a given project."""
    tool = registry.get(tool_name)
    if not tool:
        raise HTTPException(status_code=404, detail=f"Tool '{tool_name}' not found")

    ctx = ExecutionContext(
        project_id=project_id,
        project_dir=f"data/projects/{project_id}"
    )

    return await tool.run(brief, ctx)
