from __future__ import annotations
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class ArtifactStatus(str, Enum):
    DRAFT = "draft"
    GENERATING = "generating"
    NEEDS_REVIEW = "needs_review"
    APPROVED = "approved"
    REPROMPTED = "reprompted"
    FAILED = "failed"


class GroundingRef(BaseModel):
    """Grounding citation reference pointing to a chapter passage."""
    passage_id: str = Field(..., description="ID of source passage (e.g. P01-S02)")
    quote: str = Field(..., description="Exact or overlapping quote from the passage")
    verified: bool = Field(default=False, description="Whether citation was matched against passage text")


class Passage(BaseModel):
    """A deterministic text passage chunk extracted from a chapter."""
    id: str = Field(..., description="Deterministic passage ID (e.g. P01-S01)")
    page_number: int = Field(default=1, description="Page number in original document")
    paragraph_index: int = Field(default=0, description="Sequential paragraph index")
    text: str = Field(..., description="Text content of the passage")


class ConceptItem(BaseModel):
    concept: str
    explanation: str
    grounding: Optional[GroundingRef] = None


class VocabularyItem(BaseModel):
    term: str
    definition: str
    grounding: Optional[GroundingRef] = None


class StoryboardScenePlan(BaseModel):
    scene_number: int
    title: str
    template_type: str = Field(..., description="STEM template class (e.g. CoordinateGraph, ProcessFlow, Kinematics)")
    narration_script: str
    visual_description: str
    key_formulas: List[str] = Field(default_factory=list)
    grounding: Optional[GroundingRef] = None


class ChapterOutline(BaseModel):
    """Structured pedagogical decomposition of an uploaded chapter."""
    title: str
    subject: str = Field(default="Science")
    grade_level: str = Field(default="Grade 9-10")
    summary: str
    learning_objectives: List[str] = Field(default_factory=list)
    concepts: List[ConceptItem] = Field(default_factory=list)
    vocabulary: List[VocabularyItem] = Field(default_factory=list)
    suggested_scenes: List[StoryboardScenePlan] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ToolBrief(BaseModel):
    """Standardized input contract for any OMNIX capability tool."""
    topic: str
    subject: str = "General Science"
    grade_level: str = "Grade 9"
    purpose: str = "Instructional"
    target_format: str = "default"
    parameters: Dict[str, Any] = Field(default_factory=dict)
    outline_ref: Optional[str] = None


class Artifact(BaseModel):
    """Standardized output produced by a tool engine."""
    id: str
    tool_name: str
    project_id: str
    status: ArtifactStatus = ArtifactStatus.NEEDS_REVIEW
    files: List[str] = Field(default_factory=list, description="Relative paths to output files")
    source_data: Dict[str, Any] = Field(default_factory=dict, description="Underlying JSON/script/prompts")
    grounding_refs: List[GroundingRef] = Field(default_factory=list)
    cost_estimate_usd: float = 0.0
    error_message: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ProjectManifest(BaseModel):
    """Manifest describing a chapter project and its generated artifacts."""
    project_id: str
    name: str
    source_filename: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    outline: Optional[ChapterOutline] = None
    artifacts: Dict[str, Artifact] = Field(default_factory=dict)
    schema_version: str = "0.5.0"

