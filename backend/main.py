from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from backend.core.config import settings
from backend.api import doctor, projects, tools, video
# Ensure tools are imported and registered
import backend.tools.ingestion  # noqa
import backend.tools.slides  # noqa
import backend.tools.quizzes  # noqa

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="OMNIX: Multimodal educational package generation platform"
)

# CORS configuration for React frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routers
app.include_router(doctor.router)
app.include_router(projects.router)
app.include_router(tools.router)
app.include_router(video.router)

# Mount local image cache directory
image_cache_dir = settings.ROOT_DIR / "output" / "image_cache"
image_cache_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/images", StaticFiles(directory=image_cache_dir), name="static_images")

# Mount local video directory
video_dir = settings.ROOT_DIR / "output" / "videos"
video_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static/videos", StaticFiles(directory=video_dir), name="static_videos")

# Mount Presenton 16-theme template catalog static assets
templates_catalog_dir = settings.ROOT_DIR / "backend" / "templates" / "catalog"
if templates_catalog_dir.exists():
    app.mount("/static/templates", StaticFiles(directory=templates_catalog_dir), name="static_templates")
    app.mount("/templates", StaticFiles(directory=templates_catalog_dir), name="templates_direct")


@app.get("/api/templates/catalog")
async def list_templates_catalog():
    """List all 16 official Presenton template design systems with layout counts."""
    import json
    templates_dir = settings.ROOT_DIR / "backend" / "templates" / "catalog"
    if not templates_dir.exists():
        return {"templates": []}

    results = []
    for tpath in sorted(templates_dir.iterdir()):
        if tpath.is_dir() and (tpath / "template.json").exists():
            try:
                with open(tpath / "template.json", "r", encoding="utf-8") as f:
                    data = json.load(f)
                layouts = data.get("layouts", [])
                results.append({
                    "id": tpath.name,
                    "name": data.get("name") or tpath.name.capitalize(),
                    "description": data.get("description", ""),
                    "layout_count": len(layouts),
                    "theme": data.get("theme", {}),
                    "fonts": data.get("fonts", {}),
                    "thumbnail": f"/templates/{tpath.name}/static/thumbnail.png"
                })
            except Exception as e:
                continue
    return {"templates": results, "total_layouts": sum(r["layout_count"] for r in results)}


@app.get("/api/templates/catalog/{template_id}")
async def get_template_details(template_id: str):
    """Get full template definition including all 20-35 layouts and components."""
    import json
    from fastapi import HTTPException
    template_file = settings.ROOT_DIR / "backend" / "templates" / "catalog" / template_id / "template.json"
    if not template_file.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")
    with open(template_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data


@app.get("/api/images/resolve")
async def resolve_image_endpoint(query: str, title: str = ""):
    """Resolve educational diagram or image from cache, Wikimedia, or DuckDuckGo."""
    from backend.tools.slides.image_service import resolve_image_async
    return await resolve_image_async(query, title)


@app.post("/api/images/generate")
async def generate_image_endpoint(payload: dict):
    """Generate style-tailored AI visual (scientific, 3d, vector, photorealistic)."""
    from backend.tools.slides.image_service import generate_ai_image_async
    prompt = payload.get("prompt", "")
    style = payload.get("style", "scientific")
    title = payload.get("title", "")
    return await generate_ai_image_async(prompt, style, title)


@app.post("/v1/images/generations")
async def openai_compatible_images_endpoint(payload: dict):
    """OpenAI-compatible image generation route for slide generator and external tools."""
    import time
    import base64
    from pathlib import Path
    from backend.tools.slides.image_service import generate_ai_image_async

    prompt = payload.get("prompt", "Educational illustration")
    size_str = str(payload.get("size", "1024x1024"))
    try:
        parts = size_str.lower().split("x")
        width = int(parts[0]) if len(parts) >= 2 else 1024
        height = int(parts[1]) if len(parts) >= 2 else 768
    except Exception:
        width, height = 1024, 768

    result = await generate_ai_image_async(
        prompt=prompt,
        style="scientific",
        title=prompt[:60],
        width=width,
        height=height,
    )

    file_path = result.get("file_path")
    b64_str = ""
    if file_path and Path(file_path).exists():
        with open(file_path, "rb") as f:
            b64_str = base64.b64encode(f.read()).decode("utf-8")

    img_url = f"http://host.docker.internal:8000{result.get('url')}"

    return {
        "created": int(time.time()),
        "data": [
            {
                "url": img_url,
                "b64_json": b64_str,
                "revised_prompt": prompt,
            }
        ],
    }


@app.get("/api/health")
async def health_check():
    """Basic health check endpoint."""
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION
    }


# Mount frontend distribution if built
frontend_dist = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Allow API routes to pass through
        if full_path.startswith("api/"):
            return None
        index_file = frontend_dist / "index.html"
        return FileResponse(index_file)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=settings.DEBUG)

