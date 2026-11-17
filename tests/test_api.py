from starlette.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "online"
    assert data["app"] == "OMNIX"
    print("Health test PASSED!")


def test_doctor():
    res = client.get("/api/doctor")
    assert res.status_code == 200
    data = res.json()
    assert "components" in data
    assert "ffmpeg" in data["components"]
    assert "manim" in data["components"]
    print("Doctor test PASSED! System status:", data["status"])


def test_projects_crud():
    # Create project
    create_res = client.post("/api/projects", data={"name": "Physics Chapter 1"})
    assert create_res.status_code == 200
    project = create_res.json()
    p_id = project["project_id"]
    assert project["name"] == "Physics Chapter 1"

    # List projects
    list_res = client.get("/api/projects")
    assert list_res.status_code == 200
    projects = list_res.json()
    assert any(p["project_id"] == p_id for p in projects)

    # Get single project
    get_res = client.get(f"/api/projects/{p_id}")
    assert get_res.status_code == 200
    assert get_res.json()["project_id"] == p_id
    print("Projects API test PASSED!")


def test_tools_list():
    res = client.get("/api/tools")
    assert res.status_code == 200
    tools = res.json()
    assert any(t["name"] == "document_ingestion" for t in tools)
    print("Tools API test PASSED!")


def test_slides_edit_and_download():
    # 1. Create a project
    create_res = client.post("/api/projects", data={"name": "Slide Edit Test"})
    assert create_res.status_code == 200
    p_id = create_res.json()["project_id"]

    # 2. Update slides
    update_res = client.put(
        f"/api/projects/{p_id}/slides",
        json={
            "theme": "col_blue",
            "slides": [
                {
                    "slide_number": 1,
                    "title": "Edited Slide Title",
                    "subtitle": "Edited Subtitle",
                    "archetype": "card_grid_3",
                    "cards": [
                        {"badge": "Card 1", "title": "First Point", "body": "Body text 1"},
                        {"badge": "Card 2", "title": "Second Point", "body": "Body text 2"}
                    ],
                    "bullets": ["Point 1", "Point 2"],
                    "speaker_notes": "Edited speaker notes for teacher"
                }
            ]
        }
    )
    assert update_res.status_code == 200
    artifact = update_res.json()
    assert artifact["tool_name"] == "slides"
    assert artifact["source_data"]["slides"][0]["title"] == "Edited Slide Title"

    # 3. Test download endpoint
    download_res = client.get(f"/api/projects/{p_id}/download/slides/slides.pptx")
    assert download_res.status_code == 200
    assert len(download_res.content) > 1000
    print("Slide edit and download API test PASSED!")


if __name__ == "__main__":
    test_health()
    test_doctor()
    test_projects_crud()
    test_tools_list()

