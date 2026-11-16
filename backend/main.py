from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path
from backend.core.config import settings
from backend.api import doctor, projects, tools
# Ensure tools are imported and registered
import backend.tools.ingestion  # noqa
import backend.tools.slides  # noqa

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

