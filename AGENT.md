# AGENT.md — OMNIX Autonomous Agent Operating Guide

Welcome, Agent. This file is your operational handbook for developing and maintaining **OMNIX** (Open Multimodal Network for Immersive eXperiences).

---

## 1. Project Mission & Context

* **Client / Program:** IIT Madras & Commonwealth of Learning (COL) Training of Trainers (ToT) programme.
* **Target Audience:** Master trainers and educators transforming textbook chapters into classroom packages.
* **Architecture Style:** Server-hosted Web Application (React frontend + FastAPI backend). Zero client-side installation on educator laptops.
* **Canonical Specification:** `docs/OMNIX Product Requirements Document (v0.5 draft).docx`.

---

## 2. Inviolable Architectural Principles

Whenever you design, refactor, or generate code in OMNIX, you **must adhere to these 6 rules**:

1. **No Free-Form Code Generation in Production:**
   * LLMs must never generate unconstrained Python scripts for rendering outputs.
   * Production paths rely on strict Pydantic JSON schemas and deterministic renderers (`python-pptx`, Manim template registry, pure-Python H5P builders).
2. **Models Never Render Text Directly:**
   * Generative image models frequently hallucinate or garble typography.
   * All labels, titles, equations, and annotations must be overlaid deterministically using layout code (Pango/Cairo `Text()`, SVG overlays, or HTML/CSS).
3. **Deterministic Grounding (Zero Vector-DB Overhead):**
   * Every factual slide bullet, quiz item, and narration sentence must cite a deterministic `passage_id` (e.g., `P01-S02`) stored in `projects/<id>/passages.json`.
   * Unmatched or unsupported claims must be flagged as `"Not from chapter"` in the review interface.
4. **Hardened Manim Video Pipeline:**
   * Use the **STEM Scene Template Registry** (`CoordinateGraphScene`, `KinematicsScene`, `ProcessFlowScene`, `ReactionScene`).
   * **Audio-First Synchronization:** Always generate `kokoro-onnx` audio first, measure duration, and dynamically inject `self.wait(max(0.5, audio_duration - animation_runtime))`.
   * **Domain Boundary:** Never force Manim to draw biological anatomy or organic cellular structures. Route biology to 2D image overlays (F4) or 3D models (F10).
   * **Universal Draft Mode:** Always render intermediate previews at 480p / 15fps (<30s). Final 1080p is reserved for background batch assembly.
5. **Strict License & Dependency Hygiene:**
   * Only permissive OSI-approved licenses (MIT, Apache-2.0, BSD-3) may be included in the core application.
   * **Avoid GPL/AGPL contamination:** Do not copy code from Piper TTS, Lumi H5P Node library, or Chemanim (hybrid OpenGL/Cairo conflicts).
   * **Zero-PyTorch Core:** Run local TTS strictly via `kokoro-onnx` (ONNX Runtime on CPU), avoiding multi-gigabyte PyTorch weight bloat.
6. **Moodle Scope Boundary:**
   * Moodle `.mbz` course backup archives and LTI dynamic links are deferred for post-January discussion.
   * The package export format is a standalone offline classroom bundle (`index.html` + media assets) playable in any browser.

---

## 3. Repository Architecture

```
OMNIX/
├── backend/                  # FastAPI backend application
│   ├── core/                 # Config, Pydantic schemas, ToolRegistry, and models
│   │   ├── config.py         # Settings & environment variables
│   │   ├── models.py         # Strongly-typed data contracts
│   │   └── registry.py       # BaseTool contract & central tool registry
│   ├── api/                  # REST API routers
│   │   ├── doctor.py         # /api/doctor system capability diagnostics
│   │   ├── projects.py       # /api/projects CRUD and chapter file upload
│   │   └── tools.py          # /api/tools capability runner
│   ├── tools/                # Capability engines
│   │   ├── ingestion/        # Document extraction (pypdf, docx) & passages.json
│   │   ├── slides/           # python-pptx presentation deck generator
│   │   ├── video/            # Manim STEM registry, kokoro-onnx, storyboard
│   │   ├── diagrams/         # Mermaid & markmap syntax generators
│   │   └── quizzes/          # Pure-Python H5P quiz/flashcard builder
│   └── main.py               # Application entrypoint & static frontend mount
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind web app
│   ├── src/
│   │   ├── api.ts            # Type-safe API client
│   │   ├── components/       # ChapterDashboard, DoctorBanner, StoryboardGrid
│   │   └── App.tsx           # Main application layout
│   └── dist/                 # Production web bundle (served by FastAPI)
├── data/
│   ├── projects/             # Local workspace projects and generated artifacts
│   └── golden_chapters/      # Pre-cached reference chapters for offline fail-safe
├── docs/                     # Product Requirements Document (PRD v0.5 draft)
├── tests/                    # Backend unit & integration test suites
├── tickets/                  # MuonTickets file-based ticket board
└── muontickets/              # Submodule: MuonTickets CLI coordination tool
```

---

## 4. Ticket Management Protocol (MuonTickets)

All development tasks, bug fixes, and feature additions **must be tracked through MuonTickets**. Never commit untracked code changes without an associated ticket.

### Standard Agent Workflow:

```bash
# 1. View current ticket backlog
python3 muontickets/mt.py ls

# 2. Create a new ticket (if starting a new task)
python3 muontickets/mt.py new "<Title>" --priority <p0|p1|p2> --type <code|chore|spec|tests> --effort <s|m|l> --label <label> --goal "<Goal description>"

# 3. Claim the ticket before writing code
python3 muontickets/mt.py claim T-XXXXXX --owner <agent-name>

# 4. Fill Acceptance Criteria in tickets/T-XXXXXX.md
# Update markdown checkboxes: - [ ] -> - [x]

# 5. Log progress comment
python3 muontickets/mt.py comment T-XXXXXX "Implemented feature X and verified tests"

# 6. Submit for review & complete
python3 muontickets/mt.py set-status T-XXXXXX needs_review
python3 muontickets/mt.py done T-XXXXXX

# 7. Validate ticket board integrity
python3 muontickets/mt.py validate
```

---

## 5. Development & Testing Commands

### Backend Operations
```bash
# Set Python path and run tests
PYTHONPATH=. python3 tests/test_ingestion.py
PYTHONPATH=. python3 tests/test_api.py

# Start local FastAPI server
PYTHONPATH=. python3 -m uvicorn backend.main:app --reload --port 8000
```

### Frontend Operations
```bash
cd frontend

# Install dependencies
npm install

# Start Vite dev server with proxy to backend
npm run dev

# Build production bundle (outputs to frontend/dist/ for FastAPI to serve)
npm run build
```

---

## 6. Definition of Done (DoD)

Before marking any ticket `done`:
1. All acceptance criteria checkboxes in `tickets/T-XXXXXX.md` must be checked `[x]`.
2. Unit and integration tests must pass cleanly without warnings or unhandled exceptions.
3. No breaking changes or regressions introduced to existing API endpoints.
4. MuonTickets board must validate clean (`python3 muontickets/mt.py validate`).
