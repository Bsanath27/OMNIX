import json
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient
from backend.core.config import settings
from backend.core.models import ChapterOutline
from backend.main import app
from backend.tools.ingestion.grounding import save_passages_to_json, build_passages
from backend.tools.outline.outline_tool import (
    extract_chapter_outline,
    generate_offline_fallback_outline,
)


def test_offline_outline_generator():
    passages_map = {
        "P01-S01": "Chapter 3: Thermodynamics and Heat Transfer",
        "P01-S02": "Temperature is defined as the measure of the average kinetic energy of the particles in an object.",
        "P01-S03": "Heat refers to thermal energy transferred between systems due to a temperature difference.",
        "P01-S04": "The First Law of Thermodynamics is defined as the law of conservation of energy.",
        "P01-S05": "Entropy means the degree of disorder or randomness in a closed thermodynamic system.",
    }

    outline = generate_offline_fallback_outline(
        project_id="test-p1",
        passages_map=passages_map,
        title="Thermodynamics",
        subject="Physics",
        grade_level="Grade 11"
    )

    assert isinstance(outline, ChapterOutline)
    assert outline.title == "Thermodynamics"
    assert outline.subject == "Physics"
    assert len(outline.learning_objectives) >= 3
    assert len(outline.concepts) > 0 or len(outline.vocabulary) > 0
    assert len(outline.suggested_scenes) > 0

    # Ensure groundings are present and point to valid passage IDs
    for item in outline.vocabulary:
        if item.grounding:
            assert item.grounding.passage_id in passages_map


def test_extract_chapter_outline_integration():
    client = TestClient(app)

    # 1. Create a project via API
    resp = client.post("/api/projects", data={"name": "Photosynthesis Chapter"})
    assert resp.status_code == 200
    project_id = resp.json()["project_id"]

    # 2. Add passages.json
    project_dir = settings.PROJECTS_DIR / project_id
    raw_chunks = [
        {"page": 1, "paragraph_index": 1, "text": "Photosynthesis and Cellular Respiration"},
        {"page": 1, "paragraph_index": 2, "text": "Chlorophyll is defined as the green pigment found in chloroplasts that absorbs sunlight."},
        {"page": 1, "paragraph_index": 3, "text": "Stomata refers to microscopic openings on leaves for gas exchange."},
        {"page": 2, "paragraph_index": 1, "text": "Glucose is synthesized during the Calvin cycle from carbon dioxide and water."},
    ]
    passages = build_passages(raw_chunks)
    save_passages_to_json(passages, project_dir / "passages.json")

    # 3. Request outline generation via API
    outline_resp = client.post(
        f"/api/projects/{project_id}/outline",
        json={"subject": "Biology", "grade_level": "Grade 10", "prefer_offline": True}
    )
    assert outline_resp.status_code == 200
    outline_data = outline_resp.json()

    assert outline_data["subject"] == "Biology"
    assert len(outline_data["learning_objectives"]) >= 3
    assert (project_dir / "outline.json").exists()

    # 4. Fetch the outline via GET endpoint
    get_resp = client.get(f"/api/projects/{project_id}/outline")
    assert get_resp.status_code == 200
    assert get_resp.json()["subject"] == "Biology"


if __name__ == "__main__":
    test_offline_outline_generator()
    print("test_offline_outline_generator PASSED!")
    test_extract_chapter_outline_integration()
    print("test_extract_chapter_outline_integration PASSED!")
