"""Tier 4: Real-World Application Scenarios (Persona & Curriculum Workloads).

Opaque-box tests validating full pedagogical scenarios:
- Complete Wave Optics 5-slide lecture generation and export
- Teacher in-place canvas editing & drag-and-drop reordering session
- End-to-end Studio Pro interactive block synthesis and PPTX export
- Multi-template master design pack rendering across catalog
"""

import json
from pathlib import Path
from typing import Any, Callable, Dict, List

import pytest
from pptx import Presentation
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.tools.ingestion.grounding import build_passages, save_passages_to_json
from backend.tools.slides.slide_tool import SlideContent, build_presentation_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_t4_real_world_wave_optics_lecture(
    client: TestClient,
    temp_project: Callable[[str], str],
    wave_optics_deck: List[Dict[str, Any]],
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Scenario 1: Complete 5-Slide Wave Optics Lecture Generation and Multi-Format Validation."""
    project_id = temp_project("T4 Wave Optics Lecture")
    p_dir = settings.PROJECTS_DIR / project_id

    # 1. Grounding passages setup
    raw_chunks = [
        {"page": 1, "paragraph_index": 1, "text": "Huygens' Principle states that every point on a wavefront is a wavelet source."},
        {"page": 1, "paragraph_index": 2, "text": "Young's Double Slit experiment demonstrates spatial fringe interference."},
        {"page": 2, "paragraph_index": 1, "text": "Single slit Fraunhofer diffraction produces a wide central maximum."},
        {"page": 2, "paragraph_index": 2, "text": "Brewster's angle polarizes reflected light completely when tan(theta_p) = n2/n1."},
        {"page": 3, "paragraph_index": 1, "text": "Diffraction gratings disperse multi-wavelength light into sharp spectral lines."},
    ]
    passages = build_passages(raw_chunks)
    save_passages_to_json(passages, p_dir / "passages.json")

    # 2. Persist 5-slide deck via PUT /api/projects/{id}/slides
    res = client.put(f"/api/projects/{project_id}/slides", json={"slides": wave_optics_deck, "theme": "indigo"})
    assert res.status_code == 200, f"Failed to persist wave optics deck: {res.text}"

    # 3. Verify disk persistence: slides.json
    json_path = p_dir / "slides" / "slides.json"
    assert json_path.exists(), "slides.json not found on disk"
    saved_data = json.loads(json_path.read_text(encoding="utf-8"))
    slides = saved_data.get("slides", [])
    assert len(slides) == 5, f"Expected 5 slides, got {len(slides)}"

    # 4. Verify disk persistence: slides.pptx
    pptx_path = p_dir / "slides" / "slides.pptx"
    assert pptx_path.exists(), "slides.pptx not found on disk"
    inspection = pptx_inspector(pptx_path)
    assert inspection["slide_count"] == 5
    assert inspection["is_widescreen_16_9"] is True
    assert inspection["width_inches"] > 13.0
    assert inspection["height_inches"] > 7.0

    # Verify speaker notes exist on all slides
    for s_idx, s_info in enumerate(inspection["slides"]):
        assert s_info["has_notes"] is True, f"Slide {s_idx + 1} missing speaker notes"

    # Verify Slide 4 has picture shape (polarization diagram)
    assert inspection["slides"][3]["has_picture"] is True, "Slide 4 should contain an embedded picture shape"

    # 5. Hydrate Slide 1 with server layout renderer
    render_res = node_renderer("landmark", "photo_backdrop_with_intro_and_staggered_cards_1941", wave_optics_deck[0])
    html = render_res.get("html", "")
    assert "Wave Nature of Light" in html
    assert "LOCATION & CONNECTIVITY" not in html


def test_t4_teacher_editing_session_workflow(
    client: TestClient,
    temp_project: Callable[[str], str],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Scenario 2: Teacher persona workflow with AI card refinement, in-place text edits, DnD reorder, and export."""
    project_id = temp_project("T4 Teacher Editing Session")
    p_dir = settings.PROJECTS_DIR / project_id

    # Step 1: Initial lecture draft on Thermodynamics
    initial_slides = [
        {
            "slide_number": 1,
            "title": "Thermodynamics & Heat Engines",
            "subtitle": "Energy conservation and second law limitations",
            "archetype": "hero_title",
            "cards": [{"title": "Overview", "body": "Heat engines convert thermal energy into mechanical work."}],
            "speaker_notes": "Introduce Sadi Carnot and industrial revolution heat engines.",
        },
        {
            "slide_number": 2,
            "title": "Carnot Cycle Phases and Reversibility",
            "subtitle": "Idealized four-stage thermodynamic cycle",
            "archetype": "card_grid_3",
            "cards": [
                {"badge": "Stage 1", "title": "Isothermal Expansion", "body": "Gas absorbs heat from hot reservoir at constant temperature Th."},
                {"badge": "Stage 2", "title": "Adiabatic Expansion", "body": "Gas expands without heat exchange, cooling to sink temperature Tc."},
                {"badge": "Stage 3", "title": "Isothermal Compression", "body": "Gas rejects heat to cold reservoir at constant temperature Tc."},
                {"badge": "Stage 4", "title": "Adiabatic Compression", "body": "Work is done on the gas to restore initial state at Th."},
            ],
            "speaker_notes": "Draw the Carnot cycle P-V and T-S state diagrams.",
        },
    ]

    client.put(f"/api/projects/{project_id}/slides", json={"slides": initial_slides, "theme": "academic_clean"})

    # Step 2: Teacher refines Stage 1 card body using /api/projects/{id}/slides/refine-card
    refine_res = client.post(
        f"/api/projects/{project_id}/slides/refine-card",
        json={"slide": initial_slides[1], "card_index": 0, "instruction": "make_concise"}
    )
    assert refine_res.status_code == 200
    refined_body = refine_res.json()["suggested_card"]["body"]
    assert len(refined_body) > 0

    # Step 3: Teacher performs live in-place edits on Slide 1 & applies refined card on Slide 2
    updated_slides = [
        {
            "slide_number": 1,
            "title": "Carnot Engine & Maximum Theoretical Efficiency Limit",
            "subtitle": "Advanced Pedagogical Thermodynamics Lecture",
            "archetype": "hero_title",
            "cards": [{"title": "Carnot Theorem", "body": "No engine operating between two reservoirs is more efficient than a Carnot engine."}],
            "speaker_notes": "Derived from the Clausius inequality and Kelvin-Planck statement of Second Law.",
            "blocks": [
                {"id": "blk-title", "type": "header", "title": "Carnot Engine & Maximum Theoretical Efficiency Limit", "order": 0},
                {"id": "blk-card", "type": "card", "title": "Carnot Theorem", "body": "No engine is more efficient than a Carnot engine.", "order": 1},
            ],
        },
        {
            "slide_number": 2,
            "title": "Carnot Cycle Phases and Reversibility",
            "subtitle": "Idealized four-stage thermodynamic cycle",
            "archetype": "card_grid_3",
            # Step 4: Teacher uses DnD to move Stage 2 before Stage 1 (reordered sequence)
            "cards": [
                {"badge": "Stage 2", "title": "Adiabatic Expansion", "body": initial_slides[1]["cards"][1]["body"]},
                {"badge": "Stage 1", "title": "Isothermal Expansion (Refined)", "body": refined_body},
                initial_slides[1]["cards"][2],
                initial_slides[1]["cards"][3],
            ],
            "speaker_notes": "Draw the Carnot cycle P-V and T-S state diagrams.",
            "blocks": [
                {"id": "blk-stg2", "type": "card", "title": "Adiabatic Expansion", "order": 0},
                {"id": "blk-stg1", "type": "card", "title": "Isothermal Expansion (Refined)", "body": refined_body, "order": 1},
            ],
        },
    ]

    # Step 5: Save with theme changed to 'noir'
    save_res = client.put(f"/api/projects/{project_id}/slides", json={"slides": updated_slides, "theme": "noir"})
    assert save_res.status_code == 200

    # Step 6: Verify exported PPTX reflects teacher edits
    pptx_path = p_dir / "slides" / "slides.pptx"
    inspection = pptx_inspector(pptx_path)
    assert inspection["slide_count"] == 2
    assert "Theoretical Efficiency Limit" in inspection["slides"][0]["text_content"]
    assert "Isothermal Expansion (Refined)" in inspection["slides"][1]["text_content"]


def test_t4_end_to_end_studio_pro_export(
    client: TestClient,
    temp_project: Callable[[str], str],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Scenario 3: End-to-end Studio Pro interactive block synthesis, live persistence, and PPTX compilation."""
    project_id = temp_project("T4 Studio Pro Export")
    p_dir = settings.PROJECTS_DIR / project_id

    # Create Studio Pro blocks deck
    pro_slides = [
        {
            "slide_number": 1,
            "title": "Quantum Entanglement and Bell Inequalities",
            "subtitle": "EPR Paradox and Quantum Information",
            "archetype": "hero_visual_split",
            "blocks": [
                {"id": "b1", "type": "header", "title": "Quantum Entanglement and Bell Inequalities", "order": 0},
                {"id": "b2", "type": "card", "title": "EPR Paradox (1935)", "body": "Einstein, Podolsky, and Rosen questioned quantum completeness.", "order": 1},
                {"id": "b3", "type": "card", "title": "Bell's Theorem (1964)", "body": "No local hidden variable theory can reproduce all quantum predictions.", "order": 2},
                {"id": "b4", "type": "metric", "title": "CHSH Bound", "body": "2*sqrt(2) approx 2.828", "order": 3},
            ],
            "cards": [
                {"title": "EPR Paradox (1935)", "body": "Einstein, Podolsky, and Rosen questioned quantum completeness."},
                {"title": "Bell's Theorem (1964)", "body": "No local hidden variable theory can reproduce all quantum predictions."},
            ],
            "speaker_notes": "Present Alain Aspect and John Clauser's experimental verification of Bell inequality violations.",
        },
        {
            "slide_number": 2,
            "title": "Quantum Teleportation Protocol",
            "subtitle": "State transfer via classical communication and shared entanglement",
            "archetype": "timeline",
            "blocks": [
                {"id": "b5", "type": "header", "title": "Quantum Teleportation Protocol", "order": 0},
                {"id": "b6", "type": "card", "title": "Step 1: Entangled Pair Generation", "body": "Alice and Bob share an EPR pair in Bell state |phi+>.", "order": 1},
                {"id": "b7", "type": "card", "title": "Step 2: Bell State Measurement", "body": "Alice performs joint measurement on unknown qubit and her EPR qubit.", "order": 2},
                {"id": "b8", "type": "card", "title": "Step 3: Classical Bit Transmission", "body": "Alice sends 2 classical bits to Bob over classical channel.", "order": 3},
                {"id": "b9", "type": "card", "title": "Step 4: Unitary Reconstruction", "body": "Bob applies Pauli correction (I, X, Z, or XZ) to reconstruct qubit.", "order": 4},
            ],
            "cards": [
                {"title": "Step 1: Entangled Pair", "body": "Alice and Bob share an EPR pair."},
                {"title": "Step 2: Bell Measurement", "body": "Alice measures unknown qubit with EPR qubit."},
                {"title": "Step 3: Classical Transmission", "body": "Alice transmits 2 classical bits."},
                {"title": "Step 4: Unitary Correction", "body": "Bob applies Pauli operator to recover state."},
            ],
            "speaker_notes": "Emphasize no-cloning theorem is strictly preserved: Alice's original state is destroyed during measurement.",
        },
    ]

    res = client.put(f"/api/projects/{project_id}/slides", json={"slides": pro_slides, "theme": "indigo"})
    assert res.status_code == 200

    # Verify files created on disk
    pptx_path = p_dir / "slides" / "slides.pptx"
    assert pptx_path.exists()
    assert pptx_path.stat().st_size > 15_000

    json_path = p_dir / "slides" / "slides.json"
    assert json_path.exists()
    saved = json.loads(json_path.read_text(encoding="utf-8"))["slides"]
    assert len(saved) == 2
    assert len(saved[0]["blocks"]) == 4
    assert len(saved[1]["blocks"]) == 5

    # Inspect compiled PPTX
    inspection = pptx_inspector(pptx_path)
    assert inspection["slide_count"] == 2
    assert "EPR Paradox" in inspection["slides"][0]["text_content"] or "Quantum Entanglement" in inspection["slides"][0]["text_content"]
    assert "Unitary" in inspection["slides"][1]["text_content"] or "Teleportation" in inspection["slides"][1]["text_content"]


def test_t4_multi_template_pack_rendering(
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]]
):
    """Scenario 4: Multi-Template Design Pack Switcher rendering across 5 key master packs."""
    template_packs = ["landmark", "editorial", "modern", "dynamic", "civic"]

    test_slide = {
        "slide_number": 1,
        "title": "Special Theory of Relativity",
        "subtitle": "Lorentz Transformations and Invariant Spacetime Intervals",
        "cards": [
            {
                "title": "Time Dilation",
                "body": "Moving clocks run slower by Lorentz gamma factor: delta_t = gamma * delta_t0.",
            },
            {
                "title": "Length Contraction",
                "body": "Proper length contracts along direction of motion: L = L0 / gamma.",
            },
        ],
        "bullets": [
            "Speed of light c is invariant in all inertial frames",
            "Minkowski metric interval ds^2 = c^2 dt^2 - dx^2 - dy^2 - dz^2",
        ],
    }

    catalog_dir = PROJECT_ROOT / "backend" / "templates" / "catalog"

    for tpl_name in template_packs:
        tpl_dir = catalog_dir / tpl_name
        tpl_json = tpl_dir / "template.json"
        assert tpl_json.exists(), f"Template JSON missing for {tpl_name}: {tpl_json}"

        # Parse template to verify structure
        data = json.loads(tpl_json.read_text(encoding="utf-8"))
        assert "layouts" in data
        assert len(data["layouts"]) > 0

        # Render layout HTML using node_renderer
        first_layout_id = data["layouts"][0]["id"]
        res = node_renderer(tpl_name, first_layout_id, test_slide)
        html = res.get("html", "")
        assert len(html) > 500, f"Rendered HTML for {tpl_name} unexpectedly small ({len(html)} chars)"
        assert "Special Theory of Relativity" in html, f"Slide title missing in {tpl_name} rendering"
        assert "LOCATION & CONNECTIVITY" not in html, f"Boilerplate detected in {tpl_name} template"
