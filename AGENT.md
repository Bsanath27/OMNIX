# AGENT.md — OMNIX Autonomous Agent Operating Guide

Welcome, Agent. This file is your operational handbook for developing and maintaining **OMNIX** (Open Multimodal Network for Immersive eXperiences). Every agent interacting with this codebase must read, internalize, and strictly adhere to these instructions.

---

## 1. Project Mission & Context

* **Client / Program:** IIT Madras & Commonwealth of Learning (COL) Training of Trainers (ToT) programme.
* **Target Audience:** Master trainers and educators transforming textbook chapters into classroom packages.
* **Architecture Style:** Server-hosted Web Application (React frontend + FastAPI backend). Zero client-side installation on educator laptops.
* **Canonical Specification:** `docs/OMNIX Product Requirements Document (v0.5 draft).docx`.

---

## 2. Inviolable Architectural Principles

Whenever you design, refactor, or generate code in OMNIX, you **must adhere to these 8 core rules**:

1. **No Free-Form Code Generation in Production:**
   * LLMs must never generate unconstrained Python scripts for rendering outputs.
   * Production paths rely strictly on verified Pydantic JSON schemas and deterministic renderers (`python-pptx`, Manim template registry, pure-Python H5P builders).
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
7. **Zero Hardcoding Mandate (Config-Driven & Dynamic Everything):**
   * **Never hardcode values at any point:** No hardcoded credentials, ports, hosts, model strings, thresholds, file paths, tool lists, or mock payload data.
   * **Backend Configuration:** All settings must originate from `backend/core/config.py` (`Settings`) reading from environment variables (`.env`).
   * **Dynamic Provider Adapters:** Provider endpoints, model IDs, rate limits, and headers must be defined in configuration or provider adapters, never hardcoded in endpoint handlers.
   * **Dynamic File Paths:** Always resolve paths relative to `settings.DATA_DIR`, `settings.PROJECTS_DIR`, or `project_id`. Never construct absolute paths with hardcoded usernames or machine folders.
   * **No Dummy/Mock Returns in Production:** Do not stub API endpoints with static fake data unless running under an explicit test suite.
8. **Radical Component Minimization (Anti-Proliferation):**
   * **Avoid creating components unless absolutely necessary.** Do not build micro-components, one-off wrapper elements, or tool-specific form components.
   * **Strict 4-View Architecture:** The frontend UI is restricted to four generic, data-driven views:
     1. `ChapterDashboard.tsx` — Project creation, project selection, document upload.
     2. `SchemaFormModal.tsx` — **Single, universal schema-driven form** that dynamically renders inputs for *any* capability tool using the tool's Pydantic JSON schema (`/api/tools/{name}`). Never create `SlideForm.tsx`, `QuizForm.tsx`, `VideoForm.tsx`, etc.
     3. `ArtifactCard.tsx` — **Single, universal artifact card** that renders status, preview, download buttons, and source grounding badges for any generated output.
     4. `StoryboardGrid.tsx` — Visual card grid for parallel video scene drafts and clip reordering.
   * **Inline over Abstraction:** If a visual element can be styled with standard HTML tags and Tailwind CSS classes, keep it inline. Do not wrap standard elements in superfluous single-use component files.

---

## 3. Agent Behavioral Guardrails & Anti-Patterns

| Anti-Pattern (DO NOT DO) | Correct Pattern (DO THIS) |
| :--- | :--- |
| Hardcoding `"groq/llama-3.3-70b-versatile"` inside a route | Read `settings.PRIMARY_LLM_MODEL` from `backend/core/config.py` |
| Creating separate `.tsx` components for each tool's form | Use a single schema-driven form component rendering `/api/tools` schema |
| Using `torch` or `transformers` for Kokoro TTS | Use `kokoro-onnx` with `onnxruntime` on CPU |
| Hardcoding `http://localhost:8000` in React fetch calls | Use relative `/api/...` paths relying on Vite proxy / server routing |
| Generating raw, free-form Manim python scripts | Select a template class from the STEM component registry and pass parameters |
| Fabricating dummy chapter text when files aren't uploaded | Read genuine extracted passages from `projects/<id>/passages.json` |
| Copying GPL code (Piper TTS, Lumi H5P) into core | Use MIT/Apache-2.0 alternatives (`kokoro-onnx`, custom pure-Python H5P builder) |

---

## 4. Repository Architecture

```
OMNIX/
├── backend/                  # FastAPI backend application
│   ├── core/                 # Config, Pydantic schemas, ToolRegistry, and models
│   │   ├── config.py         # Dynamic Settings & environment variables (Zero hardcoding)
│   │   ├── models.py         # Strongly-typed data contracts
│   │   └── registry.py       # BaseTool contract & central tool registry
│   ├── api/                  # REST API routers
│   │   ├── doctor.py         # /api/doctor system capability diagnostics
│   │   ├── projects.py       # /api/projects CRUD and chapter file upload
│   │   └── tools.py          # /api/tools capability runner
│   ├── tools/                # Capability engines (Self-contained, registered dynamically)
│   │   ├── ingestion/        # Document extraction (pypdf, docx) & passages.json
│   │   ├── slides/           # python-pptx presentation deck generator
│   │   ├── video/            # Manim STEM registry, kokoro-onnx, storyboard
│   │   ├── diagrams/         # Mermaid & markmap syntax generators
│   │   └── quizzes/          # Pure-Python H5P quiz/flashcard builder
│   └── main.py               # Application entrypoint & static frontend mount
├── frontend/                 # React 18 + TypeScript + Vite + Tailwind web app
│   ├── src/
│   │   ├── api.ts            # Dynamic API client
│   │   ├── components/       # Minimal component set (Dashboard, DoctorBanner, ArtifactCard, StoryboardGrid)
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

## 5. Ticket Management Protocol (MuonTickets)

All development tasks, bug fixes, and feature additions **must be tracked through MuonTickets**. Never commit untracked code changes without an associated ticket.

### Inviolable Ticket Rules:
1. **Record Every Move in Tickets:** Log every meaningful step, code change, test execution, or design decision as a comment in the ticket (`mt comment`). A ticket should read like an immutable execution log.
2. **Atomic Git Commit After Each Ticket:** Immediately after marking a ticket `done`, you **must create an atomic git commit** referencing the ticket ID. Never batch multiple completed tickets into one commit.
3. **Mandatory 10-Ticket Milestone Review:** After every batch of 10 tickets completed ($N \times 10$: T-000010, T-000020, T-000030...), the agent **must author a consolidated review file** inside the `tickets/` directory named `tickets/REVIEW-XXXXXX-YYYYYY.md` (e.g. `tickets/REVIEW-000001-000010.md`). This file tracks the ticket ledger, deliverables, test status, architectural decisions, and next batch roadmap. Never proceed past a 10-ticket boundary without publishing this review.

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

# 5. Record moves & progress continuously
python3 muontickets/mt.py comment T-XXXXXX "Starting implementation of module X..."
python3 muontickets/mt.py comment T-XXXXXX "Tests passed: 4 passed, 0 failed."

# 6. Submit for review & complete
python3 muontickets/mt.py set-status T-XXXXXX needs_review
python3 muontickets/mt.py done T-XXXXXX

# 7. Validate ticket board integrity
python3 muontickets/mt.py validate

# 8. MANDATORY: Atomic Git Commit for the completed ticket
git add .
git commit -m "<type>(<scope>): <concise description> [T-XXXXXX]"
```

---

## 6. Development & Testing Commands

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

## 7. Definition of Done (DoD)

Before marking any ticket `done` and committing:
1. All acceptance criteria checkboxes in `tickets/T-XXXXXX.md` must be checked `[x]`.
2. No hardcoded constants, mock payloads, or magic values exist in production code.
3. No redundant components or wrapper classes were created; components follow the 4-view minimal structure.
4. Unit and integration tests must pass cleanly without warnings or unhandled exceptions.
5. Every move, progress step, and test result is recorded in the ticket comments (`mt comment`).
6. No breaking changes or regressions introduced to existing API endpoints.
7. MuonTickets board must validate clean (`python3 muontickets/mt.py validate`).
8. **All changes are committed to Git immediately after completion** with the ticket ID in the commit message.
9. **If the completed ticket crosses a 10-ticket milestone boundary ($N \times 10$), a consolidated review file `tickets/REVIEW-XXXXXX-YYYYYY.md` must be created and committed.**

---

## 8. Slide Studio Integration (Presenton Engine White-Labeling)

When working on or continuing the Presentation / Slide Creation workflow:
* **Canonical Integration Guide**: Read [docs/SLIDES_INTEGRATION_ARCHITECTURE.md](docs/SLIDES_INTEGRATION_ARCHITECTURE.md).
* **Strict White-Labeling**: No "Presenton" branding, purple colors (`#7A5AF8`), Discord/GitHub widgets, or `/dashboard` redirects may ever be visible to educators. Everything must match OMNIX design tokens (`#FF5C00`, Syne font, rounded pills).
* **Do NOT Patch Minified Chunks**: Do not regex-replace `.js` chunks inside `.next-build`. Use Nginx CSS/JS injection and asset mounting as documented in `docs/SLIDES_INTEGRATION_ARCHITECTURE.md`.
