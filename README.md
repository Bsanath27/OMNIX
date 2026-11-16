# OMNIX: Open Multimodal Network for Immersive eXperiences

OMNIX is a server-hosted web application developed for the **IIT Madras / Commonwealth of Learning (COL)** Training of Trainers (ToT) programme.

OMNIX empowers educators to transform any textbook chapter (PDF, DOCX, or typed topic) into a complete, classroom-ready multimodal learning package—including:
- **Editable Presentation Decks** (`.pptx`)
- **Interactive Diagrams & Mindmaps** (Mermaid / Markmap)
- **Narrated Explainer Videos** (Manim STEM animation + Kokoro TTS sync + hosted I2V b-roll)
- **Interactive Classroom Quizzes** (H5P-compatible)
- **Curated Interactive Simulations** (PhET interactive science simulations)
- **Self-Contained Offline Classroom Packages** (`index.html` viewer bundle)

---

## Architecture Overview

OMNIX operates as a modern client-server web application:
- **Frontend:** React, TypeScript, Vite, and Tailwind CSS.
- **Backend:** FastAPI (Python 3.11+), SQLite job queue, and capability-isolated tool registry.
- **Rendering Engines:**
  - Slides: `python-pptx` deterministic template engine.
  - Video: Manim Community Edition (parameterized STEM template registry) + `kokoro-onnx` neural voiceover.
  - Diagrams: Client-side SVG DOM rendering via `mermaid.js` and `markmap.js`.
  - Quizzes: Pure-Python H5P builder (`H5P.MultiChoice`, `H5P.Dialogcards`).

---

## Directory Layout

```
OMNIX/
├── backend/                  # FastAPI backend service
│   ├── core/                 # Config, models, registry, and job queue
│   ├── api/                  # REST API routes (projects, tools, doctor)
│   └── tools/                # Capability tool engines (ingestion, slides, video, etc.)
├── frontend/                 # React + Vite + Tailwind web app
├── data/
│   ├── projects/             # Local workspace projects and generated artifacts
│   └── golden_chapters/      # Pre-cached reference chapters for offline resilience
├── docs/                     # Product Requirements Document (PRD v0.5)
├── tickets/                  # MuonTickets swarm coordination board
└── pyproject.toml            # Backend dependencies
```

---

## Quickstart

### 1. Backend Setup
```bash
# Using Python 3.11+
python3 -m venv .venv
source .venv/bin/activate
pip install -e .

# Run development server
uvicorn backend.main:app --reload --port 8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to open the OMNIX chapter dashboard.

