import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_video_plan_endpoint():
    """Verify POST /api/video/plan returns structured pedagogical scenes."""
    response = client.post(
        "/api/video/plan",
        json={
            "topic": "Newton's Third Law",
            "level": "normal",
            "style": "diffusion",
            "target_duration": 60,
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "title" in data
    assert "summary" in data
    assert "scenes" in data
    assert len(data["scenes"]) >= 4
    for scene in data["scenes"]:
        assert "id" in scene
        assert "title" in scene
        assert "narration" in scene
        assert "visual_concept" in scene
        assert "duration_seconds" in scene
        assert scene["duration_seconds"] > 0


def test_video_regenerate_scene_endpoint():
    """Verify POST /api/video/regenerate-scene returns updated scene beat."""
    sample_scene = {
        "id": 1,
        "title": "Action and Reaction",
        "narration": "Every action has an equal and opposite reaction.",
        "visual_concept": "Two ice skaters pushing off each other.",
        "diffusion_prompt": "Cinematic visual of two skaters pushing away on pristine ice, 8k.",
        "animation_type": "diffusion",
        "duration_seconds": 10.0,
        "status": "pending",
    }
    response = client.post(
        "/api/video/regenerate-scene",
        json={
            "scene": sample_scene,
            "feedback": "Make it a rocket launch example with fire exhaust plumes.",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == 1
    assert data["status"] == "approved"
    assert "narration" in data
    assert "visual_concept" in data
