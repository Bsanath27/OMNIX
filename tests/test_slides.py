import asyncio
from pathlib import Path
from pptx import Presentation
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.core.models import ArtifactStatus
from backend.core.registry import ExecutionContext
from backend.main import app
from backend.tools.ingestion.grounding import build_passages, save_passages_to_json
from backend.tools.slides.slide_tool import SlideBrief, SlideTool


def test_slide_tool_direct_execution():
    tool = SlideTool()

    # Create dummy project dir
    p_id = "test-slide-proj"
    p_dir = settings.PROJECTS_DIR / p_id
    p_dir.mkdir(parents=True, exist_ok=True)

    passages_map = {
        "P01-S01": "Electromagnetism is the interaction between electric charges and magnetic fields.",
        "P01-S02": "Faraday's Law states that a changing magnetic flux induces an electromotive force.",
        "P01-S03": "Lenz's Law states that the induced current opposes the change in magnetic flux that produced it."
    }

    ctx = ExecutionContext(
        project_id=p_id,
        project_dir=str(p_dir),
        passages=passages_map
    )

    brief = SlideBrief(
        topic="Electromagnetic Induction",
        subject="Physics",
        grade_level="Grade 12",
        num_slides=5,
        theme="col_blue",
        include_speaker_notes=True,
        include_passage_citations=True
    )

    artifact = asyncio.run(tool.run(brief, ctx))

    assert artifact.tool_name == "slides"
    assert artifact.status == ArtifactStatus.NEEDS_REVIEW
    assert len(artifact.files) == 2

    # Verify pptx file
    pptx_path = p_dir / artifact.files[0]
    assert pptx_path.exists()
    prs = Presentation(pptx_path)
    assert len(prs.slides) >= 4

    # Verify speaker notes
    notes_found = False
    for s in prs.slides:
        if s.notes_slide and s.notes_slide.notes_text_frame.text:
            notes_found = True
            break
    assert notes_found is True

    # Verify json preview
    json_path = p_dir / artifact.files[1]
    assert json_path.exists()
    assert len(artifact.source_data["slides"]) >= 4

    print("Slide direct execution PASSED!")


def test_slide_tool_api():
    client = TestClient(app)

    # 1. Create project
    create_res = client.post("/api/projects", data={"name": "Wave Optics"})
    assert create_res.status_code == 200
    p_id = create_res.json()["project_id"]

    # 2. Add passages
    p_dir = settings.PROJECTS_DIR / p_id
    raw_chunks = [
        {"page": 1, "paragraph_index": 1, "text": "Huygens Principle states that every point on a wavefront acts as a source of secondary wavelets."},
        {"page": 1, "paragraph_index": 2, "text": "Diffraction is defined as the bending of light waves around obstacles or narrow apertures."},
    ]
    passages = build_passages(raw_chunks)
    save_passages_to_json(passages, p_dir / "passages.json")

    # 3. Call tool run endpoint
    run_res = client.post(
        f"/api/tools/slides/run?project_id={p_id}",
        json={
            "topic": "Wave Optics",
            "subject": "Physics",
            "grade_level": "Grade 12",
            "num_slides": 4,
            "theme": "academic_clean"
        }
    )
    assert run_res.status_code == 200
    data = run_res.json()
    assert data["tool_name"] == "slides"
    assert len(data["files"]) == 2
    print("Slide API integration PASSED!")


def test_suggest_slide_edits_and_refine_card():
    client = TestClient(app)
    create_res = client.post("/api/projects", data={"name": "Thermodynamics"})
    assert create_res.status_code == 200
    p_id = create_res.json()["project_id"]

    test_slide = {
        "slide_number": 2,
        "title": "Carnot Cycle Process and Phases",
        "archetype": "card_grid_3",
        "cards": [
            {"badge": "Phase 1", "title": "Isothermal Expansion", "body": "Gas absorbs heat from high temp reservoir at constant temperature."},
            {"badge": "Phase 2", "title": "Adiabatic Expansion", "body": "Gas expands without heat exchange, reducing temperature to cold sink."},
        ],
        "bullets": ["Four-stage thermodynamic ideal cycle", "Maximum theoretical efficiency limit"],
        "speaker_notes": "Guide students through the P-V diagram quadrants."
    }

    # Test suggest-edits with layout optimization
    res1 = client.post(
        f"/api/projects/{p_id}/slides/suggest-edits",
        json={"slide": test_slide, "instruction": "suggest_layout"}
    )
    assert res1.status_code == 200
    sug_data = res1.json()
    assert "suggested_slide" in sug_data
    assert "explanation" in sug_data
    # Should recommend process_cycle or timeline due to 'Process and Phases' in title
    assert sug_data["suggested_slide"]["archetype"] in ["process_cycle", "timeline", "sequence_steps"]

    # Test refine-card endpoint
    res2 = client.post(
        f"/api/projects/{p_id}/slides/refine-card",
        json={"slide": test_slide, "card_index": 0, "instruction": "make_concise"}
    )
    assert res2.status_code == 200
    card_data = res2.json()
    assert "suggested_card" in card_data
    assert card_data["card_index"] == 0
    assert len(card_data["suggested_card"]["body"]) > 0


if __name__ == "__main__":
    test_slide_tool_direct_execution()
    test_slide_tool_api()
    test_suggest_slide_edits_and_refine_card()
