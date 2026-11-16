import asyncio
from pathlib import Path
from starlette.testclient import TestClient

from backend.core.config import settings
from backend.core.models import ArtifactStatus
from backend.core.registry import ExecutionContext
from backend.main import app
from backend.tools.ingestion.grounding import build_passages, save_passages_to_json
from backend.tools.quizzes.quiz_tool import QuizBrief, QuizTool


def test_quiz_tool_direct_execution():
    tool = QuizTool()

    p_id = "test-quiz-proj"
    p_dir = settings.PROJECTS_DIR / p_id
    p_dir.mkdir(parents=True, exist_ok=True)

    passages_map = {
        "P01-S01": "Mitochondria is defined as the powerhouse of the cell generating adenosine triphosphate (ATP).",
        "P01-S02": "Ribosomes refer to cellular machines that synthesize proteins from amino acids.",
        "P01-S03": "The nucleus contains genetic material organized into linear DNA chromosomes."
    }

    ctx = ExecutionContext(
        project_id=p_id,
        project_dir=str(p_dir),
        passages=passages_map
    )

    brief = QuizBrief(
        topic="Cell Biology",
        subject="Biology",
        grade_level="Grade 10",
        num_questions=3,
        quiz_types=["multiple_choice", "flashcard", "true_false"],
        difficulty="intermediate"
    )

    artifact = asyncio.run(tool.run(brief, ctx))

    assert artifact.tool_name == "quizzes"
    assert artifact.status == ArtifactStatus.NEEDS_REVIEW
    assert len(artifact.files) == 2

    # Verify JSON file
    json_path = p_dir / artifact.files[0]
    assert json_path.exists()
    assert len(artifact.source_data["items"]) >= 3

    # Verify HTML player file
    html_path = p_dir / artifact.files[1]
    assert html_path.exists()
    html_content = html_path.read_text(encoding="utf-8")
    assert "<!DOCTYPE html>" in html_content
    assert "Cell Biology" in html_content
    assert "handleAnswer" in html_content

    print("Quiz direct execution PASSED!")


def test_quiz_tool_api():
    client = TestClient(app)

    # 1. Create project
    create_res = client.post("/api/projects", data={"name": "Genetics & Heredity"})
    assert create_res.status_code == 200
    p_id = create_res.json()["project_id"]

    # 2. Add passages
    p_dir = settings.PROJECTS_DIR / p_id
    raw_chunks = [
        {"page": 1, "paragraph_index": 1, "text": "Alleles are alternative forms of a gene that account for variations in inherited traits."},
        {"page": 1, "paragraph_index": 2, "text": "Phenotype refers to the observable physical properties of an organism."},
    ]
    passages = build_passages(raw_chunks)
    save_passages_to_json(passages, p_dir / "passages.json")

    # 3. Call tool run endpoint
    run_res = client.post(
        f"/api/tools/quizzes/run?project_id={p_id}",
        json={
            "topic": "Genetics & Heredity",
            "subject": "Biology",
            "grade_level": "Grade 11",
            "num_questions": 2,
            "quiz_types": ["flashcard", "multiple_choice"]
        }
    )
    assert run_res.status_code == 200
    data = run_res.json()
    assert data["tool_name"] == "quizzes"
    assert len(data["files"]) == 2
    print("Quiz API integration PASSED!")


if __name__ == "__main__":
    test_quiz_tool_direct_execution()
    test_quiz_tool_api()
