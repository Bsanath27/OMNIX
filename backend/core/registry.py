from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type
from pydantic import BaseModel
from backend.core.models import Artifact, ToolBrief


class ExecutionContext(BaseModel):
    """Context passed to a tool during execution."""
    project_id: str
    project_dir: str
    passages: Dict[str, str] = {}
    dry_run: bool = False

    class Config:
        arbitrary_types_allowed = True


class BaseTool(ABC):
    """Abstract base class for all OMNIX capability tools."""

    name: str
    description: str
    brief_model: Type[ToolBrief] = ToolBrief

    @abstractmethod
    async def run(self, brief: ToolBrief, ctx: ExecutionContext) -> Artifact:
        """Execute the tool capability and return a standardized Artifact."""
        pass

    def get_schema(self) -> Dict[str, Any]:
        """Return the JSON schema of the tool brief for dynamic frontend form generation."""
        return self.brief_model.model_json_schema()


class ToolRegistry:
    """Central registry of capability tools."""

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}

    def register(self, tool: BaseTool) -> None:
        """Register a tool instance."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        """Retrieve a tool by name."""
        return self._tools.get(name)

    def list_tools(self) -> List[Dict[str, Any]]:
        """List all registered tools with metadata and schema."""
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "schema": tool.get_schema()
            }
            for tool in self._tools.values()
        ]


# Global tool registry singleton
registry = ToolRegistry()

