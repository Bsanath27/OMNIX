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


def test_multi_archetype_pptx_compiler():
    from backend.tools.slides.slide_tool import SlideContent, SlideCard, build_presentation_file, THEME_PALETTES
    import tempfile

    # Ensure 38 Presenton themes are supported
    assert "daktilo" in THEME_PALETTES
    assert "noir" in THEME_PALETTES
    assert "cornflower" in THEME_PALETTES
    assert "indigo" in THEME_PALETTES
    assert "orbit" in THEME_PALETTES
    assert "cosmos" in THEME_PALETTES
    assert "velvet" in THEME_PALETTES
    assert len(THEME_PALETTES) >= 38

    # Test all smart archetypes
    test_slides = [
        SlideContent(
            slide_number=1,
            title="Introduction to Quantum Optics",
            subtitle="Pedagogical Chapter Overview",
            archetype="hero_title",
            cards=[SlideCard(stat="100%", title="Photonic Coherence", body="Pure state vector alignment.")]
        ),
        SlideContent(
            slide_number=2,
            title="Classical vs Quantum Electrodynamics",
            subtitle="Direct Paradigm Contrast",
            archetype="before_after",
            cards=[
                SlideCard(title="Classical Limits", body="Continuous wave approximation."),
                SlideCard(title="Quantum Fock States", body="Discrete photon field quantization.")
            ]
        ),
        SlideContent(
            slide_number=3,
            title="Quantum Measurement Pipeline",
            subtitle="Sequential stages",
            archetype="timeline",
            cards=[
                SlideCard(title="Laser Preparation", body="Coherent state pulse injection."),
                SlideCard(title="Beam Splitting", body="Interferometric phase shifting."),
                SlideCard(title="Single Photon Detection", body="Avalanche photodiode readout.")
            ]
        ),
        SlideContent(
            slide_number=4,
            title="Theoretical Abstraction Pyramid",
            subtitle="Foundational to applied layers",
            archetype="pyramid_hierarchy",
            cards=[
                SlideCard(title="Peak: Quantum Computing", body="Shor and Grover algorithm execution."),
                SlideCard(title="Middle: Cavity QED", body="Jaynes-Cummings atom-photon coupling."),
                SlideCard(title="Base: Maxwell-Bloch Equations", body="Fundamental electromagnetic equations.")
            ]
        ),
        SlideContent(
            slide_number=5,
            title="Experimental Staircase",
            subtitle="Scaling fidelity milestones",
            archetype="staircase_progression",
            cards=[
                SlideCard(title="Bench Setup", body="Initial optical alignment."),
                SlideCard(title="Cryogenic Cooling", body="Thermal noise suppression."),
                SlideCard(title="Coherent Control", body="99.9% 2-qubit gate fidelity.")
            ]
        ),
        SlideContent(
            slide_number=6,
            title="Foundational Maxim",
            subtitle="Richard Feynman",
            archetype="editorial_quote",
            cards=[
                SlideCard(title="Richard Feynman", body="I think I can safely say that nobody understands quantum mechanics.")
            ]
        ),
        SlideContent(
            slide_number=7,
            title="Core Performance Metrics",
            subtitle="Quantitative Benchmarks",
            archetype="stats_grid",
            cards=[
                SlideCard(stat="99.8%", title="Fidelity", body="Gate operations."),
                SlideCard(stat="120 µs", title="T2 Time", body="Dephasing coherence."),
                SlideCard(stat="10 mK", title="Temperature", body="Dilution fridge baseline.")
            ]
        ),
        SlideContent(
            slide_number=8,
            title="Architecture Bento",
            subtitle="Modular subsystems",
            archetype="bento_4",
            cards=[
                SlideCard(title="Module Alpha", body="Cryogenic routing."),
                SlideCard(title="Module Beta", body="Microwave pulse synthesis."),
                SlideCard(title="Module Gamma", body="Readout amplification."),
                SlideCard(title="Module Delta", body="FPGA feedback logic.")
            ]
        ),
        SlideContent(
            slide_number=9,
            title="Visual Apparatus Inspection",
            subtitle="Split schematic diagram",
            archetype="hero_visual_split",
            image_query="Cryogenic dilution refrigerator wiring schematic",
            cards=[SlideCard(title="Cryostat Setup", body="Continuous helium-3/helium-4 phase separation cooling.")]
        )
    ]

    with tempfile.NamedTemporaryFile(suffix=".pptx", delete=False) as f:
        out_path = Path(f.name)

    try:
        build_presentation_file(test_slides, "noir", out_path)
        assert out_path.exists()
        prs = Presentation(out_path)
        assert len(prs.slides) == 9
        # Verify custom slide width/height
        assert prs.slide_width.inches > 13.0
        assert prs.slide_height.inches > 7.0
    finally:
        if out_path.exists():
            out_path.unlink()


if __name__ == "__main__":
    test_slide_tool_direct_execution()
    test_slide_tool_api()
    test_suggest_slide_edits_and_refine_card()
    test_multi_archetype_pptx_compiler()
