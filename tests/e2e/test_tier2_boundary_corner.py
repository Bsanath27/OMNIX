"""Tier 2: Boundary Value Analysis & Corner Cases (Failure Tolerance).

Opaque-box tests validating behavior under extreme inputs, edge values,
null/empty states, malformed media, and error cascades.
"""

import json
from pathlib import Path
from typing import Any, Callable, Dict, List

import pytest
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.tools.slides.slide_tool import SlideContent, build_presentation_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def test_t2_empty_and_none_blocks_handling(
    client: TestClient,
    temp_project: Callable[[str], str]
):
    """BVA 1: Slides with empty blocks [], explicit None, or omitted blocks persist without schema corruption."""
    project_id = temp_project("T2 Empty Blocks Handling")

    # Case A: blocks is empty list []
    slide_empty_blocks = {
        "slide_number": 1,
        "title": "Empty Blocks Slide",
        "archetype": "hero_title",
        "cards": [{"title": "Card 1", "body": "Body 1"}],
        "blocks": [],
    }

    # Case B: blocks is None / null
    slide_none_blocks = {
        "slide_number": 2,
        "title": "None Blocks Slide",
        "archetype": "card_grid_3",
        "cards": [{"title": "Card 2", "body": "Body 2"}],
        "blocks": None,
    }

    # Case C: blocks omitted entirely
    slide_omitted_blocks = {
        "slide_number": 3,
        "title": "Omitted Blocks Slide",
        "archetype": "hero_title",
        "cards": [{"title": "Card 3", "body": "Body 3"}],
    }

    put_payload = {
        "slides": [slide_empty_blocks, slide_none_blocks, slide_omitted_blocks],
        "theme": "indigo",
    }

    res = client.put(f"/api/projects/{project_id}/slides", json=put_payload)
    assert res.status_code == 200, f"PUT failed with varied blocks: {res.text}"

    # Verify JSON on disk
    json_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.json"
    assert json_path.exists()
    saved = json.loads(json_path.read_text(encoding="utf-8"))["slides"]
    assert len(saved) == 3
    assert saved[0]["blocks"] == []
    assert saved[1]["blocks"] is None
    assert saved[2]["blocks"] is None

    # Verify PPTX compiles cleanly without failure
    pptx_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.pptx"
    assert pptx_path.exists()
    assert pptx_path.stat().st_size > 1000


def test_t2_extreme_text_length_and_wrapping(
    client: TestClient,
    temp_project: Callable[[str], str],
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
    pptx_inspector: Callable[[Path], Dict[str, Any]]
):
    """BVA 2: Extreme text lengths (350+ char titles, 700+ char card bodies) wrap safely without crashing."""
    project_id = temp_project("T2 Extreme Text Lengths")

    extreme_title = "Quantum Field Theory in Curved Spacetime: " + ("Rigorous Mathematical Foundations and " * 10)
    assert len(extreme_title) > 350

    extreme_card_body = (
        "In the presence of dynamic gravitational horizons, particle creation occurs via the Bogoliubov transformation "
        "between in-states and out-states, demonstrating that the vacuum state is observer-dependent. " * 5
    )
    assert len(extreme_card_body) > 700

    slide_extreme = {
        "slide_number": 1,
        "title": extreme_title,
        "subtitle": "Extreme text wrapping validation across presentation engines",
        "cards": [
            {"title": "Hawking-Unruh Effect", "body": extreme_card_body},
            {"title": "Secondary Horizon", "body": "Standard card body for contrast."},
        ],
        "bullets": [f"Bullet item {i}: {extreme_card_body[:60]}" for i in range(12)],
    }

    # 1. Test Node template rendering
    result = node_renderer("landmark", "photo_backdrop_with_intro_and_staggered_cards_1941", slide_extreme)
    html = result.get("html", "")
    assert html, "HTML rendering must succeed for extreme text"
    assert "Bogoliubov transformation" in html

    # 2. Test API persistence and PPTX compilation
    res = client.put(f"/api/projects/{project_id}/slides", json={"slides": [slide_extreme], "theme": "noir"})
    assert res.status_code == 200

    pptx_path = settings.PROJECTS_DIR / project_id / "slides" / "slides.pptx"
    assert pptx_path.exists()
    inspection = pptx_inspector(pptx_path)
    assert inspection["slide_count"] == 1
    assert "Bogoliubov" in inspection["slides"][0]["text_content"]


def test_t2_zero_cards_minimal_slide(
    tmp_path: Path,
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
):
    """BVA 3: Slide containing only a title with 0 cards and 0 bullets hydrates safely without index errors."""
    minimal_slide = {
        "slide_number": 1,
        "title": "Minimal Slide Title Only",
        "subtitle": "Zero cards and zero bullets",
        "cards": [],
        "bullets": [],
    }

    # Node renderer must not encounter division-by-zero (e.g. cardIdx % cards.length)
    result = node_renderer("landmark", "photo_backdrop_with_intro_and_staggered_cards_1941", minimal_slide)
    html = result.get("html", "")
    assert html, "Minimal slide must produce valid HTML fragment"
    assert "Minimal Slide Title Only" in html

    # Also verify PPTX build
    temp_pptx = tmp_path / "temp_e2e_minimal.pptx"
    slide_obj = SlideContent(**minimal_slide)
    build_presentation_file([slide_obj], "daktilo", temp_pptx)
    assert temp_pptx.exists()


def test_t2_broken_image_url_fallback(
    tmp_path: Path,
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
):
    """BVA 4: Broken, unreachable, or non-existent image URLs do not crash the renderer or compiler."""
    # Test with non-existent or malformed image URLs
    slide_broken_imgs = {
        "slide_number": 1,
        "title": "Fault Tolerance Against Broken Media",
        "subtitle": "Unreachable image sources",
        "image_url": "https://unreachable-domain-404-e2e-nonexistent.xyz/broken.png",
        "cards": [
            {
                "title": "Card with Bad Local Image",
                "body": "Media handler should fall back cleanly.",
                "image_url": "/static/images/does_not_exist_12345.png",
            }
        ],
    }

    result = node_renderer("landmark", "photo_backdrop_with_intro_and_staggered_cards_1941", slide_broken_imgs)
    html = result.get("html", "")
    assert html, "Render output must not be empty on broken image URLs"
    assert "Fault Tolerance" in html

    # Also test PPTX compiler handles missing file path gracefully
    temp_pptx = tmp_path / "temp_e2e_broken_img.pptx"
    slide_obj = SlideContent(**slide_broken_imgs)
    build_presentation_file([slide_obj], "indigo", temp_pptx)
    assert temp_pptx.exists()


def test_t2_invalid_template_or_layout_id(
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]]
):
    """BVA 5: Invalid layout IDs fall back to default layouts, and invalid template IDs raise clean errors."""
    test_slide = {
        "slide_number": 1,
        "title": "Fallback Layout Resolution",
        "cards": [{"title": "C1", "body": "B1"}],
    }

    # 1. Non-existent layout_id in valid template ("landmark"): should fall back to template.layouts[0]
    result = node_renderer("landmark", "completely_fake_layout_id_xyz_999", test_slide)
    assert result.get("layoutId") is not None
    assert result.get("html") is not None
    assert "Fallback Layout Resolution" in result.get("html", "")

    # 2. Non-existent template_id: should fail with descriptive error
    with pytest.raises(RuntimeError) as exc_info:
        node_renderer("totally_nonexistent_template_99999", "layout_1", test_slide)
    assert "Template catalog not found" in str(exc_info.value) or "failed" in str(exc_info.value)


def test_t2_massive_watermark_bounds(
    node_renderer: Callable[[str, str, Dict[str, Any]], Dict[str, Any]]
):
    """BVA 6: Massive watermark indices (e.g. 1000) remain bounded and format without error."""
    large_index_slide = {
        "slide_number": 1000,
        "title": "Massive Watermark Index Bounds",
        "subtitle": "Index 1000 bounds test",
        "cards": [
            {
                "title": "Card 1000",
                "body": "Testing four-digit watermark rendering.",
                "stat": "1000",
            }
        ],
    }

    result = node_renderer(
        "landmark",
        "header_title_and_numbered_card_grid_9312",
        large_index_slide,
    )
    html = result.get("html", "")
    assert html, "HTML should render without crash for massive slide numbers"
    assert "Massive Watermark Index Bounds" in html

    # Multi-digit watermark index must appear in rendered HTML
    assert ">1000</span>" in html

    # Container bounds and overflow styling must be respected to prevent clipping
    assert "overflow:visible" in html or "overflow: visible" in html


def test_t2_invalid_project_id_404(client: TestClient):
    """BVA 7: PUT /api/projects/{non_existent_id}/slides returns HTTP 404."""
    fake_project_id = "non-existent-proj-uuid-99999999"
    res = client.put(f"/api/projects/{fake_project_id}/slides", json={"slides": [], "theme": "indigo"})
    assert res.status_code == 404, f"Expected 404 for missing project, got {res.status_code}: {res.text}"


def test_t2_corrupted_slide_payload_rejected(
    client: TestClient,
    temp_project: Callable[[str], str]
):
    """BVA 8: Corrupted slide payload with invalid data types is rejected with 422 or ValidationError."""
    project_id = temp_project("T2 Corrupted Payload")

    # 1. Test endpoint level schema validation rejection (HTTP 422)
    res_malformed_slides = client.put(
        f"/api/projects/{project_id}/slides",
        json={"slides": "not_a_valid_list_of_slides", "theme": "indigo"},
    )
    assert res_malformed_slides.status_code == 422, f"Expected 422, got: {res_malformed_slides.status_code}"

    res_malformed_theme = client.put(
        f"/api/projects/{project_id}/slides",
        json={"slides": [], "theme": {"nested": "not_a_string"}},
    )
    assert res_malformed_theme.status_code == 422, f"Expected 422, got: {res_malformed_theme.status_code}"

    # 2. Test SlideContent model level rejection when mandatory fields are omitted
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        SlideContent(slide_number="invalid_int", cards="not_a_list")  # type: ignore
