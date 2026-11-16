from pathlib import Path
from typing import Dict, Any
from backend.core.models import Artifact, ArtifactStatus, ToolBrief
from backend.core.registry import BaseTool, ExecutionContext, registry
from backend.tools.ingestion.extractor import extract_document
from backend.tools.ingestion.grounding import build_passages, save_passages_to_json


class IngestionBrief(ToolBrief):
    file_path: str


class IngestionTool(BaseTool):
    name = "document_ingestion"
    description = "Lightweight document parser extracting text into deterministic passages.json"
    brief_model = IngestionBrief

    async def run(self, brief: IngestionBrief, ctx: ExecutionContext) -> Artifact:
        file_path = Path(brief.file_path)
        if not file_path.exists():
            return Artifact(
                id=f"ingest_{ctx.project_id}",
                tool_name=self.name,
                project_id=ctx.project_id,
                status=ArtifactStatus.FAILED,
                error_message=f"File not found: {file_path}"
            )

        raw_chunks = extract_document(file_path)
        passages = build_passages(raw_chunks)

        out_dir = Path(ctx.project_dir)
        out_dir.mkdir(parents=True, exist_ok=True)
        passages_file = out_dir / "passages.json"
        save_passages_to_json(passages, passages_file)

        return Artifact(
            id=f"ingest_{ctx.project_id}",
            tool_name=self.name,
            project_id=ctx.project_id,
            status=ArtifactStatus.APPROVED,
            files=[str(passages_file.name)],
            source_data={
                "passage_count": len(passages),
                "source_file": str(file_path.name)
            }
        )


# Register tool
registry.register(IngestionTool())

