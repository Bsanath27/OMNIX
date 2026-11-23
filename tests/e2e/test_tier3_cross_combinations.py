"""Tier 3: Cross-Feature Combinations & State Persistence (Pairwise Interactions).

Opaque-box tests validating cross-module integrations:
- Studio mode switching state preservation (Classic <-> Studio Pro)
- Canvas drag-and-drop reorder persistence to backend and PPTX
- In-place text edit debounced synchronization
- Image diagram resolver hydration and PPTX picture embedding pipeline
"""

import json
from pathlib import Path
from typing import Any, Callable, Dict, List

import pytest
from pptx import Presentation
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.tools.slides.slide_tool import SlideCard, SlideContent, build_presentation_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_t3_studio_mode_switch_state_preservation(
    client: TestClient,
    temp_project: Callable[[str], str]
):
    """Pairwise 1: Switching between Classic Studio and Studio Pro preserves slide deck content and state."""
    project_id = temp_project("T3 Studio Switcher State Preservation")

    # Step 1: Initial creation in Classic Studio (title, cards, bullets)
    classic_slide = {
        "slide_number": 1,
        "title": "Quantum Mechanical Wavefunctions",
        "subtitle": "Schrödinger Equation & Probability Density",
        "archetype": "card_grid_3",
        "cards": [
            {"title": "Born Interpretation", "body": "Probability density is given by the squared magnitude |psi|^2."},
            {"title": "Normalization", "body": "Integral of probability density across all space must equal exactly 1."},
        ],
        "bullets": ["Hermitian operators correspond to physical observables", "Eigenvalues represent discrete measurement outcomes"],
        "speaker_notes": "Emphasize Copenhagen interpretation vs many-worlds.",
    }

    res1 = client.put(f"/api/projects/{project_id}/slides", json={"slides": [classic_slide], "theme": "indigo"})
    assert res1.status_code == 200

    # Step 2: Switch to Studio Pro mode: augment slide with interactive blocks
    pro_blocks = [
        {"id": "blk-title", "type": "header", "title": "Quantum Mechanical Wavefunctions", "order": 0},
        {"id": "blk-card-1", "type": "card", "title": "Born Interpretation", "body": "Probability density is given by |psi|^2.", "order": 1},
        {"id": "blk-card-2", "type": "card", "title": "Normalization", "body": "Integral across all space equals 1.", "order": 2},
        {"id": "blk-metric", "type": "metric", "title": "Total Probability", "body": "100%", "order": 3},
    ]

    pro_slide = dict(classic_slide)
    pro_slide["blocks"] = pro_blocks
    # Modify card in Studio Pro
    pro_slide["cards"][0]["body"] = "Updated in Studio Pro: Probability density |psi|^2."

    res2 = client.put(f"/api/projects/{project_id}/slides", json={"slides": [pro_slide], "theme": "indigo"})
    assert res2.status_code == 200

    # Step 3: Switch back to Classic Studio: inspect slides.json and verify both representations co-exist
    json_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.json"
    saved = json.loads(json_path.read_text(encoding="utf-8"))["slides"][0]

    # Verify Classic fields remain intact with updated content
    assert saved["title"] == "Quantum Mechanical Wavefunctions"
    assert "Updated in Studio Pro" in saved["cards"][0]["body"]
    assert len(saved["bullets"]) == 2

    # Verify Pro blocks remain intact
    assert len(saved["blocks"]) == 4
    assert saved["blocks"][3]["type"] == "metric"


def test_t3_canvas_dnd_reorder_persistence(
    client: TestClient,
    temp_project: Callable[[str], str],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Pairwise 2: Drag-and-drop reordering of blocks persists to backend slides.json and PPTX presentation."""
    project_id = temp_project("T3 DnD Reorder Persistence")

    # Initial slide with 4 cards in sequential order [0, 1, 2, 3]
    initial_cards = [
        {"title": "Stage 1: Absorption", "body": "Atom absorbs incident photon and transitions to excited state."},
        {"title": "Stage 2: Spontaneous Emission", "body": "Random decay releasing photon with random phase."},
        {"title": "Stage 3: Stimulated Emission", "body": "Incident photon induces coherent photon emission with identical phase."},
        {"title": "Stage 4: Population Inversion", "body": "More atoms in metastable state than ground state."},
    ]
    initial_blocks = [
        {"id": f"blk-{i}", "type": "card", "title": c["title"], "body": c["body"], "order": i}
        for i, c in enumerate(initial_cards)
    ]

    slide_initial = {
        "slide_number": 1,
        "title": "Laser Amplification Mechanisms",
        "archetype": "timeline",
        "cards": initial_cards,
        "blocks": initial_blocks,
    }

    client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide_initial], "theme": "noir"})

    # Simulate user dragging Stage 4 (Population Inversion) to the beginning:
    # New order: [Stage 4, Stage 1, Stage 2, Stage 3]
    reordered_cards = [initial_cards[3], initial_cards[0], initial_cards[1], initial_cards[2]]
    reordered_blocks = [
        {"id": "blk-3", "type": "card", "title": initial_cards[3]["title"], "body": initial_cards[3]["body"], "order": 0},
        {"id": "blk-0", "type": "card", "title": initial_cards[0]["title"], "body": initial_cards[0]["body"], "order": 1},
        {"id": "blk-1", "type": "card", "title": initial_cards[1]["title"], "body": initial_cards[1]["body"], "order": 2},
        {"id": "blk-2", "type": "card", "title": initial_cards[2]["title"], "body": initial_cards[2]["body"], "order": 3},
    ]

    slide_reordered = {
        "slide_number": 1,
        "title": "Laser Amplification Mechanisms",
        "archetype": "timeline",
        "cards": reordered_cards,
        "blocks": reordered_blocks,
    }

    res = client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide_reordered], "theme": "noir"})
    assert res.status_code == 200

    # 1. Verify slides.json persistence
    json_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.json"
    saved = json.loads(json_path.read_text(encoding="utf-8"))["slides"][0]
    assert saved["cards"][0]["title"] == "Stage 4: Population Inversion"
    assert saved["blocks"][0]["id"] == "blk-3"
    assert saved["blocks"][0]["order"] == 0

    # 2. Verify PPTX reflects reordered card sequence
    pptx_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.pptx"
    inspection = pptx_inspector(pptx_path)
    slide_text = inspection["slides"][0]["text_content"]
    assert "Population Inversion" in slide_text
    assert slide_text.index("Population Inversion") < slide_text.index("Spontaneous Emission")


def test_t3_inplace_text_edit_debounced_sync(
    client: TestClient,
    temp_project: Callable[[str], str],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Pairwise 3: Successive in-place keystroke edits synchronize cleanly without race conditions or loss."""
    project_id = temp_project("T3 In-Place Edit Sync")

    slide = {
        "slide_number": 1,
        "title": "Draft Topic",
        "subtitle": "Draft Subtitle",
        "cards": [{"title": "Concept Alpha", "body": "Original text."}],
        "speaker_notes": "",
    }
    client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide], "theme": "indigo"})

    # Keystroke sync 1: Title updated
    slide["title"] = "Draft Topic - Edited"
    client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide], "theme": "indigo"})

    # Keystroke sync 2: Card body updated
    slide["cards"][0]["body"] = "Refined pedagogical explanation of quantum coherence."
    client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide], "theme": "indigo"})

    # Keystroke sync 3: Final title and speaker notes attached
    slide["title"] = "Quantum Optical Coherence and Density Matrices"
    slide["subtitle"] = "Glauber P-Representation & Pure States"
    slide["speaker_notes"] = "Derive Roy Glauber's P-representation for coherent laser states."
    final_res = client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide], "theme": "indigo"})
    assert final_res.status_code == 200

    # Verify disk state
    json_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.json"
    saved = json.loads(json_path.read_text(encoding="utf-8"))["slides"][0]
    assert saved["title"] == "Quantum Optical Coherence and Density Matrices"
    assert saved["cards"][0]["body"] == "Refined pedagogical explanation of quantum coherence."
    assert "Roy Glauber" in saved["speaker_notes"]

    # Verify PPTX compilation
    pptx_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.pptx"
    inspection = pptx_inspector(pptx_path)
    assert "Roy Glauber" in inspection["slides"][0]["notes_text"]


def test_t3_hydration_with_diagram_resolver(
    client: TestClient,
    temp_project: Callable[[str], str],
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """Pairwise 4: Ingestion concept -> diagram resolver -> template hydration -> PPTX picture embedding."""
    project_id = temp_project("T3 Diagram Hydration Pipeline")

    # 1. Resolve scientific diagram via image resolution API
    resolve_res = client.get("/api/images/resolve?query=michelson+interferometer+schematic&title=Special+Relativity")
    assert resolve_res.status_code == 200
    img_data = resolve_res.json()
    assert "url" in img_data
    resolved_url = img_data["url"]
    assert resolved_url.startswith("/static/images/")

    # 2. Attach resolved image into a hero_visual_split slide
    visual_slide = {
        "slide_number": 1,
        "title": "Michelson-Morley Interferometer Apparatus",
        "subtitle": "Experimental null result for luminiferous aether drift",
        "archetype": "hero_visual_split",
        "image_query": "michelson interferometer schematic",
        "image_url": resolved_url,
        "cards": [
            {
                "title": "Fringe Shift Measurement",
                "body": "Null fringe shift within 0.01 fringe precision ruling out stationary aether hypothesis.",
            }
        ],
        "bullets": [
            "Path difference orthogonal arms with sodium light source",
            "Paved the way for Einstein's postulate of constant speed of light in all inertial frames",
        ],
        "speaker_notes": "Explain how the apparatus was floated on a pool of mercury to rotate smoothly without strain.",
    }

    # 3. Verify server-side template layout hydration
    render_res = node_renderer("landmark", "photo_backdrop_with_intro_and_staggered_cards_1941", visual_slide)
    html = render_res.get("html", "")
    assert html, "Hydrated HTML fragment must not be empty"
    assert "Michelson-Morley Interferometer" in html
    # Ensure static regex replacement did not break the resolved /static/images/ path
    assert "/templates/landmark/static/images/" not in html

    # 4. Persist to project and compile PPTX
    put_res = client.put(f"/api/projects/{project_id}/slides", json={"slides": [visual_slide], "theme": "indigo"})
    assert put_res.status_code == 200

    # 5. Inspect compiled PPTX for embedded picture shape
    pptx_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.pptx"
    inspection = pptx_inspector(pptx_path)
    assert inspection["slide_count"] == 1
    assert inspection["slides"][0]["has_picture"] is True, "PPTX slide must contain an embedded picture shape"
