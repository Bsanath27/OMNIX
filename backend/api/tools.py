from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import re
import subprocess
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
from backend.core.config import settings
from backend.core.registry import registry, ExecutionContext
from backend.core.models import Artifact, ToolBrief, ProjectManifest
from backend.tools.ingestion.grounding import load_passages_from_json
from backend.core.llm import call_llm, get_active_llm_provider, clean_topic_string, safe_json_loads

router = APIRouter(prefix="/api/tools", tags=["Tools"])


class CapabilityRoutingRequest(BaseModel):
    prompt: str
    preferred_capability: Optional[str] = "all"
    project_id: Optional[str] = None


class CapabilityRoutingResponse(BaseModel):
    capability: str  # 'slides' | 'quizzes' | 'video' | 'diagrams'
    topic: str
    title: str
    explanation: str
    parameters: Dict[str, Any] = {}


@router.post("/route", response_model=CapabilityRoutingResponse)
async def route_capability_prompt(req: CapabilityRoutingRequest):
    """
    Main LLM capability routing engine:
    Analyzes natural language teacher prompt and automatically decides whether
    to invoke Slides, Quizzes, Video, or Diagrams, extracting clean topic and parameters.
    """
    raw_prompt = req.prompt.strip()
    preferred = (req.preferred_capability or "all").lower().strip()

    # If user explicitly locked onto a capability pill, respect it directly
    if preferred in ["slides", "quizzes", "video", "diagrams"]:
        topic = clean_topic_string(raw_prompt, fallback=raw_prompt or "Lesson Module")
        return CapabilityRoutingResponse(
            capability=preferred,
            topic=topic,
            title=topic,
            explanation=f"Explicitly selected {preferred} capability.",
            parameters={"n_slides": 6} if preferred == "slides" else {}
        )

    # Fast keyword heuristics to avoid LLM latency if obvious keywords exist
    lower_prompt = raw_prompt.lower()

    # Check for Quiz keywords
    if any(k in lower_prompt for k in ["quiz", "mcq", "multiple choice", "exam", "assessment", "flashcard", "practice questions"]):
        topic = re.sub(r'\b(quiz|mcqs?|tests?|exams?|assessments?|flashcards?|questions?|make|create|generate|a|an|the)\b', '', lower_prompt, flags=re.IGNORECASE).strip()
        topic = clean_topic_string(topic, fallback=raw_prompt)
        return CapabilityRoutingResponse(
            capability="quizzes",
            topic=topic or "Curriculum Assessment",
            title=f"Quiz: {(topic or 'Curriculum Assessment').title()}",
            explanation="Detected assessment/quiz keywords.",
            parameters={"num_questions": 5, "difficulty": "intermediate"}
        )

    # Check for Video / Animation keywords
    if any(k in lower_prompt for k in ["video", "animation", "manim", "narrated", "simulate", "motion explainer"]):
        topic = re.sub(r'\b(video|animation|manim|narrated|explainer|make|create|generate|a|an|the)\b', '', lower_prompt, flags=re.IGNORECASE).strip()
        topic = clean_topic_string(topic, fallback=raw_prompt)
        return CapabilityRoutingResponse(
            capability="video",
            topic=topic or "STEM Video Explainer",
            title=f"Video: {(topic or 'STEM Video Explainer').title()}",
            explanation="Detected video/animation explainer keywords.",
            parameters={}
        )

    # Check for Diagram / Mindmap keywords
    if any(k in lower_prompt for k in ["diagram", "mindmap", "flowchart", "mermaid", "concept map", "hierarchy"]):
        topic = re.sub(r'\b(diagram|mindmap|flowchart|mermaid|concept map|hierarchy|make|create|generate|a|an|the)\b', '', lower_prompt, flags=re.IGNORECASE).strip()
        topic = clean_topic_string(topic, fallback=raw_prompt)
        return CapabilityRoutingResponse(
            capability="diagrams",
            topic=topic or "Concept Mindmap",
            title=f"Diagram: {(topic or 'Concept Mindmap').title()}",
            explanation="Detected visual diagram/mindmap keywords.",
            parameters={}
        )

    # If LLM is configured, call LLM to intelligently analyze nuances
    llm_provider = get_active_llm_provider()
    if llm_provider != "none" and raw_prompt:
        try:
            system_prompt = (
                "You are the master routing intelligence for OMNIX, an educator platform.\n"
                "Analyze the teacher's lesson prompt and choose the most effective delivery engine:\n"
                "- 'slides': For presentations, slide decks, lectures, visual overviews, pitch decks, talk outlines, or general topic explanations.\n"
                "- 'quizzes': For assessments, tests, multiple-choice questions (MCQs), flashcards, practice questions.\n"
                "- 'video': For explainer animations, video lessons, Manim animations, narrated STEM walkthroughs.\n"
                "- 'diagrams': For mindmaps, conceptual flowcharts, visual relationship maps.\n\n"
                "Rules:\n"
                "1. Default to 'slides' if the prompt is a general educational topic without explicit quiz or video keywords.\n"
                "2. Extract a clean, concise topic title (strip imperative prefixes).\n"
                "3. Return ONLY a valid JSON object matching:\n"
                "{\n"
                '  "capability": "slides" | "quizzes" | "video" | "diagrams",\n'
                '  "topic": "Clean Concept Topic",\n'
                '  "title": "Engaging Lesson Title",\n'
                '  "explanation": "Brief reason for this choice",\n'
                '  "parameters": {"n_slides": 6, "grade_level": "Grade 10"}\n'
                "}"
            )
            response_str = await call_llm(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Classify and route this educational prompt: '{raw_prompt}'"}
                ],
                json_mode=True,
                temperature=0.1,
                max_tokens=256
            )
            if response_str:
                data = safe_json_loads(response_str)
                cap = str(data.get("capability", "slides")).lower()
                if cap not in ["slides", "quizzes", "video", "diagrams"]:
                    cap = "slides"
                topic = data.get("topic") or clean_topic_string(raw_prompt)
                title = data.get("title") or topic
                explanation = data.get("explanation") or "Routed via AI intent classification."
                params = data.get("parameters") or {}
                return CapabilityRoutingResponse(
                    capability=cap,
                    topic=topic,
                    title=title,
                    explanation=explanation,
                    parameters=params
                )
        except Exception:
            pass

    # Fallback default: slides (primary pedagogical format)
    clean_topic = clean_topic_string(raw_prompt, fallback=raw_prompt or "Classroom Presentation")
    return CapabilityRoutingResponse(
        capability="slides",
        topic=clean_topic,
        title=clean_topic,
        explanation="Defaulted to presentation slides for comprehensive topic explanation.",
        parameters={"n_slides": 6}
    )


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
    project_id: Optional[str] = None


@router.post("/slides/create")
@router.post("/presenton/create-presentation")
async def create_presenton_presentation(req: PresentonCreateRequest):
    """Creates a presentation on the local Presenton engine and attaches it as an artifact to a project manifest."""
    import httpx
    import subprocess
    from backend.api.projects import load_manifest, save_manifest, create_project
    from backend.core.models import Artifact, ArtifactStatus

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

                # Attach or auto-provision project manifest
                target_project_id = req.project_id
                manifest = None
                if target_project_id:
                    try:
                        manifest = load_manifest(target_project_id)
                    except Exception:
                        manifest = None

                if not manifest:
                    title_name = content[:40].strip() or "Slide Presentation"
                    manifest = await create_project(title_name)
                    target_project_id = manifest.project_id

                art_id = f"art-slides-{presentation_id[:8]}"
                if not manifest.artifacts:
                    manifest.artifacts = {}

                manifest.artifacts[art_id] = Artifact(
                    id=art_id,
                    tool_name="slides",
                    project_id=target_project_id,
                    status=ArtifactStatus.APPROVED,
                    files=[f"http://localhost:5001/presentation?id={presentation_id}"],
                    source_data={
                        "title": content,
                        "presentation_id": presentation_id,
                        "presenton_url": f"http://localhost:5001/presentation?id={presentation_id}",
                        "outline_url": f"http://localhost:5001/outline?id={presentation_id}",
                        "n_slides": req.n_slides or 7
                    }
                )
                save_manifest(manifest)

                return {
                    "success": True,
                    "presentation_id": presentation_id,
                    "project_id": target_project_id,
                    "url": f"http://localhost:5001/outline?id={presentation_id}"
                }
            else:
                return {"success": False, "error": resp.text}
    except Exception as e:
        return {"success": False, "error": str(e)}



