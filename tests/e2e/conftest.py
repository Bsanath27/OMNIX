"""Shared fixtures and opaque-box test utilities for OMNIX E2E test suite."""

import json
import shutil
import subprocess
from pathlib import Path
from typing import Any, Callable, Dict, Generator, List

import pytest
from pptx import Presentation
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.main import app

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


@pytest.fixture(scope="session")
def client() -> Generator[TestClient, None, None]:
    """FastAPI TestClient fixture configured for opaque HTTP requests."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def temp_project(client: TestClient) -> Generator[Callable[[str], str], None, None]:
    """Factory fixture to create isolated projects and clean them up after test run."""
    created_ids: List[str] = []

    def _create(name: str = "E2E Test Workspace") -> str:
        res = client.post("/api/projects", data={"name": name})
        assert res.status_code == 200, f"Project creation failed: {res.text}"
        project_id = res.json()["project_id"]
        created_ids.append(project_id)
        return project_id

    yield _create

    # Teardown: remove created project folders
    for pid in created_ids:
        project_dir = settings.PROJECTS_DIR / pid
        if project_dir.exists():
            shutil.rmtree(project_dir, ignore_errors=True)


@pytest.fixture(scope="session")
def node_renderer() -> Callable[[str, str, Dict[str, Any]], Dict[str, Any]]:
    """Helper to execute the server-side Node layout renderer via subprocess."""
    renderer_script = PROJECT_ROOT / "backend" / "tools" / "slides" / "render_layout_html.mjs"

    def _render(template_id: str, layout_id: str, slide_dict: Dict[str, Any]) -> Dict[str, Any]:
        payload = {
            "template_id": template_id,
            "layout_id": layout_id,
            "slide": slide_dict,
        }
        proc = subprocess.run(
            ["node", str(renderer_script)],
            input=json.dumps(payload),
            text=True,
            capture_output=True,
            timeout=15,
            cwd=str(PROJECT_ROOT),
        )
        if proc.returncode != 0:
            raise RuntimeError(
                f"render_layout_html.mjs failed (exit {proc.returncode}):\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}"
            )
        return json.loads(proc.stdout)

    return _render


@pytest.fixture(scope="session")
def pptx_inspector() -> Callable[[Path], Dict[str, Any]]:
    """Helper to inspect PPTX presentation structure, dimensions, notes, and shapes."""

    def _inspect(pptx_path: Path) -> Dict[str, Any]:
        assert pptx_path.exists(), f"PPTX file not found: {pptx_path}"
        prs = Presentation(str(pptx_path))
        slides_info = []
        for s in prs.slides:
            texts: List[str] = []
            for shape in s.shapes:
                if shape.has_text_frame and shape.text_frame:
                    texts.append(shape.text_frame.text)
            has_pic = any(shape.shape_type == 13 for shape in s.shapes)  # 13 is MSO_SHAPE_TYPE.PICTURE
            notes = ""
            if s.notes_slide and s.notes_slide.notes_text_frame:
                notes = s.notes_slide.notes_text_frame.text
            slides_info.append({
                "shape_count": len(s.shapes),
                "text_content": " \n ".join(texts),
                "has_notes": bool(notes.strip()),
                "notes_text": notes,
                "has_picture": has_pic,
            })

        return {
            "slide_count": len(prs.slides),
            "width_inches": round(prs.slide_width.inches, 2),
            "height_inches": round(prs.slide_height.inches, 2),
            "is_widescreen_16_9": (prs.slide_width.inches > 13.0 and prs.slide_height.inches > 7.0),
            "slides": slides_info,
        }

    return _inspect


@pytest.fixture
def mock_curriculum_passages() -> Dict[str, str]:
    """Authoritative scientific grounding passages for physics lecture topics."""
    return {
        "P01-S01": (
            "Wave optics (physical optics) considers light propagation as electromagnetic wavefronts "
            "where phenomena like interference, diffraction, and polarization cannot be explained by ray optics."
        ),
        "P01-S02": (
            "Huygens' Principle states that each point on a primary wavefront serves as a source of spherical "
            "secondary wavelets that spread out in the forward direction at the speed of the wave."
        ),
        "P01-S03": (
            "Young's Double Slit experiment demonstrates spatial coherence and interference, producing alternate "
            "bright and dark fringes with uniform fringe spacing beta = (lambda * D) / d."
        ),
        "P01-S04": (
            "Fraunhofer single slit diffraction occurs when an aperture width is comparable to the wavelength of light, "
            "yielding a broad central maximum flanked by secondary maxima of rapidly decreasing intensity."
        ),
        "P01-S05": (
            "Brewster's Law establishes that reflected light is fully plane-polarized with electric field oscillations "
            "perpendicular to the plane of incidence when the reflection angle satisfies tan(theta_p) = n2 / n1."
        ),
    }


@pytest.fixture
def wave_optics_deck() -> List[Dict[str, Any]]:
    """5-Slide Realistic Wave Optics Lecture Deck matching SlideContent & Block schemas."""
    return [
        {
            "slide_number": 1,
            "title": "Wave Nature of Light & Huygens' Principle",
            "subtitle": "Wavefront geometry and envelope propagation",
            "archetype": "hero_title",
            "cards": [
                {
                    "badge": "Core Axiom",
                    "title": "Secondary Wavelets",
                    "body": "Every point on a primary wavefront acts as a source of spherical secondary wavelets.",
                }
            ],
            "bullets": [
                "Light propagates as continuous electromagnetic wavefronts",
                "Constructive tangent envelopes define subsequent wavefront positions",
            ],
            "speaker_notes": "Introduce Christian Huygens and compare historical wave vs corpuscular models.",
            "blocks": [
                {"id": "blk-1a", "type": "header", "title": "Wave Nature of Light & Huygens' Principle", "order": 0},
                {
                    "id": "blk-1b",
                    "type": "card",
                    "badge": "Core Axiom",
                    "title": "Secondary Wavelets",
                    "body": "Every point on a primary wavefront acts as a source of spherical secondary wavelets.",
                    "order": 1,
                },
            ],
        },
        {
            "slide_number": 2,
            "title": "Young's Double Slit Interference",
            "subtitle": "Spatial coherence and fringe pattern formation",
            "archetype": "before_after",
            "cards": [
                {
                    "badge": "Constructive",
                    "title": "Bright Fringes (Maxima)",
                    "body": "Path difference is an integer multiple of wavelength: d sin(theta) = n * lambda.",
                },
                {
                    "badge": "Destructive",
                    "title": "Dark Fringes (Minima)",
                    "body": "Path difference is a half-integer multiple of wavelength: d sin(theta) = (n + 0.5) * lambda.",
                },
            ],
            "bullets": [
                "Monochromatic source requirement for stable interference",
                "Fringe width beta = (lambda * D) / d",
            ],
            "speaker_notes": "Derive fringe spacing beta on the blackboard emphasizing dependence on slit separation d.",
            "blocks": [
                {"id": "blk-2a", "type": "header", "title": "Young's Double Slit Interference", "order": 0},
                {
                    "id": "blk-2b",
                    "type": "card",
                    "badge": "Constructive",
                    "title": "Bright Fringes (Maxima)",
                    "body": "Path difference is an integer multiple: d sin(theta) = n * lambda.",
                    "order": 1,
                },
                {
                    "id": "blk-2c",
                    "type": "card",
                    "badge": "Destructive",
                    "title": "Dark Fringes (Minima)",
                    "body": "Path difference is a half-integer multiple: d sin(theta) = (n + 0.5) * lambda.",
                    "order": 2,
                },
            ],
        },
        {
            "slide_number": 3,
            "title": "Single Slit Fraunhofer Diffraction",
            "subtitle": "Aperture wave bending and intensity distribution",
            "archetype": "timeline",
            "cards": [
                {
                    "badge": "Central Peak",
                    "title": "Primary Maximum",
                    "body": "Angular width 2*lambda/a containing over 85% of total transmitted energy.",
                },
                {
                    "badge": "First Minimum",
                    "title": "Aperture Boundary",
                    "body": "First destructive condition where a sin(theta) = lambda.",
                },
                {
                    "badge": "Secondary Maxima",
                    "title": "Subsidiary Rings",
                    "body": "Rapidly diminishing intensity peaks at higher angular deviations.",
                },
            ],
            "bullets": [
                "Diffraction becomes significant when aperture size approaches wavelength order",
                "Fourier transform relationship between aperture transmission and diffraction pattern",
            ],
            "speaker_notes": "Contrast interference (discrete few coherent sources) with diffraction (infinite continuous sources).",
            "blocks": [
                {"id": "blk-3a", "type": "header", "title": "Single Slit Fraunhofer Diffraction", "order": 0},
                {
                    "id": "blk-3b",
                    "type": "card",
                    "badge": "Central Peak",
                    "title": "Primary Maximum",
                    "body": "Angular width 2*lambda/a containing over 85% of total transmitted energy.",
                    "order": 1,
                },
                {
                    "id": "blk-3c",
                    "type": "card",
                    "badge": "First Minimum",
                    "title": "Aperture Boundary",
                    "body": "First destructive condition where a sin(theta) = lambda.",
                    "order": 2,
                },
                {
                    "id": "blk-3d",
                    "type": "card",
                    "badge": "Secondary Maxima",
                    "title": "Subsidiary Rings",
                    "body": "Rapidly diminishing intensity peaks at higher angular deviations.",
                    "order": 3,
                },
            ],
        },
        {
            "slide_number": 4,
            "title": "Wave Polarization and Brewster's Law",
            "subtitle": "Transverse nature of electromagnetic light waves",
            "archetype": "hero_visual_split",
            "image_query": "wave polarization electric field vector diagram",
            "image_url": "/static/images/polarization_schematic.png",
            "cards": [
                {
                    "badge": "Polarizing Angle",
                    "title": "Brewster's Condition",
                    "body": "Reflected ray is completely plane-polarized when tan(theta_p) = n2 / n1.",
                }
            ],
            "bullets": [
                "Direct experimental proof that light waves are transverse, not longitudinal",
                "Reflected and refracted rays form a 90-degree angle at Brewster angle",
            ],
            "speaker_notes": "Demonstrate Polaroid filter rotation and discuss glare reduction in sunglasses.",
            "blocks": [
                {"id": "blk-4a", "type": "header", "title": "Wave Polarization and Brewster's Law", "order": 0},
                {
                    "id": "blk-4b",
                    "type": "card",
                    "badge": "Polarizing Angle",
                    "title": "Brewster's Condition",
                    "body": "Reflected ray is completely plane-polarized when tan(theta_p) = n2 / n1.",
                    "order": 1,
                },
                {
                    "id": "blk-4c",
                    "type": "image",
                    "imageUrl": "/static/images/polarization_schematic.png",
                    "order": 2,
                },
            ],
        },
        {
            "slide_number": 5,
            "title": "Diffraction Grating Spectrometry",
            "subtitle": "High-resolution spectral dispersion metrics",
            "archetype": "stats_grid",
            "cards": [
                {
                    "stat": "600 lines/mm",
                    "title": "Grating Density",
                    "body": "Standard laboratory diffraction grating ruling density.",
                },
                {
                    "stat": "0.1 nm",
                    "title": "Spectral Resolution",
                    "body": "Resolving power resolving Sodium doublet D1 and D2 lines.",
                },
                {
                    "stat": "99.2%",
                    "title": "Diffraction Efficiency",
                    "body": "Blazed grating peak efficiency at design wavelength.",
                },
            ],
            "bullets": [
                "Grating equation: (a + b) sin(theta) = n * lambda",
                "Chromatic resolving power R = lambda / delta_lambda = N * n",
            ],
            "speaker_notes": "Summarize Wave Optics unit: Wavefronts, Interference, Diffraction, Polarization.",
            "blocks": [
                {"id": "blk-5a", "type": "header", "title": "Diffraction Grating Spectrometry", "order": 0},
                {
                    "id": "blk-5b",
                    "type": "metric",
                    "title": "Grating Density",
                    "body": "600 lines/mm standard density.",
                    "order": 1,
                },
                {
                    "id": "blk-5c",
                    "type": "metric",
                    "title": "Spectral Resolution",
                    "body": "0.1 nm resolution.",
                    "order": 2,
                },
                {
                    "id": "blk-5d",
                    "type": "metric",
                    "title": "Diffraction Efficiency",
                    "body": "99.2% peak efficiency.",
                    "order": 3,
                },
            ],
        },
    ]
