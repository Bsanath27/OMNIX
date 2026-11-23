# E2E Test Infra: OMNIX Presenton Slide Studio & Pipeline

## Test Philosophy
- **Opaque-Box & Requirement-Driven**: Tests interact strictly through public interfaces (HTTP REST APIs, CLI commands, file inputs/outputs, exported component contracts, and frontend build commands). No internal monkey-patching or implementation coupling.
- **Zero Regression Principle**: Explicit verification that the existing Classic Slide Studio (`frontend/src/components/SlideStudioView.tsx`) and its `dangerouslySetInnerHTML` rendering pipeline remain completely intact and non-regressed.
- **Methodology**: 4-Tier test suite combining Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial interaction testing, and Real-World Persona Workloads.

---

## Feature Inventory & Requirement Mapping
| # | Feature | Source (Requirement) | Tier 1 | Tier 2 | Tier 3 | Tier 4 |
|---|---------|----------------------|:------:|:------:|:------:|:------:|
| F1 | Muon Ticket Tracking | ORIGINAL_REQUEST §R1 & Follow-up §R4 | 5 | — | — | ✓ |
| F2 | Hydration Boilerplate Fix | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | ✓ |
| F3 | Layout Flex & Offset Fix | ORIGINAL_REQUEST §R5 | 5 | 5 | — | ✓ |
| F4 | Watermark Glyph Bounds | ORIGINAL_REQUEST §R5 | 5 | 5 | — | — |
| F5 | Image Slot Resolution & Fallback | ORIGINAL_REQUEST §R5 | 5 | 5 | ✓ | — |
| F6 | Block Schema Persistence | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ | ✓ |
| F7 | Zero Regression to Existing Work | Follow-up §R1 | 5 | — | ✓ | ✓ |
| F8 | Dedicated Presenton Studio Component | Follow-up §R2 | 5 | — | ✓ | ✓ |
| F9 | Left Filmstrip Slide Management | Follow-up §R2 | 5 | — | ✓ | ✓ |
| F10 | Interactive Block Canvas Pipeline | Follow-up §R2 | 5 | 5 | ✓ | ✓ |
| F11 | Native Canvas In-Place Editing | Follow-up §R2 | 5 | 5 | ✓ | ✓ |
| F12 | Canvas Drag-and-Drop Reordering | Follow-up §R2 | 5 | — | ✓ | ✓ |
| F13 | OMNIX Design Alignment | Follow-up §R3 | 5 | — | — | ✓ |
| F14 | Slide Deck Model Wiring & Export | Follow-up §R2 & §R3 | 5 | 5 | ✓ | ✓ |
| F15 | Build & Regression Verification | Follow-up §R4 | 5 | — | — | ✓ |
| F16 | Dual-Track E2E Test Infrastructure | Follow-up §R4 | 5 | — | — | ✓ |

---

## Test Architecture

### 1. Directory Layout
```
tests/e2e/
├── __init__.py
├── conftest.py                      # Shared fixtures (TestClient, temp projects, sample slide decks, mock data)
├── test_tier1_feature_coverage.py   # Tier 1: F1-F16 Feature Coverage & Smoke Contracts
├── test_tier2_boundary_corner.py    # Tier 2: Boundary Value Analysis & Corner Cases
├── test_tier3_cross_combinations.py # Tier 3: Cross-Feature Interaction & Persistence
├── test_tier4_real_world.py         # Tier 4: Real-World Lecture Workflows & Scenarios
└── run_e2e.sh                       # Executable master test runner orchestrating all checks
```

### 2. Test Runner & Invocation
- **Direct Pytest Runner**:
  ```bash
  PYTHONPATH=. .venv/bin/pytest tests/e2e/ -v
  ```
- **Master Orchestrator Script**:
  ```bash
  bash tests/e2e/run_e2e.sh
  ```
  The script performs complete end-to-end multi-stage validation:
  1. Ticket validation (`python3 muontickets/mt.py validate`)
  2. Frontend build verification (`npm --prefix frontend run build`)
  3. Backend baseline slide regression tests (`PYTHONPATH=. .venv/bin/pytest tests/test_slides.py`)
  4. 4-Tier E2E test suite execution (`PYTHONPATH=. .venv/bin/pytest tests/e2e/ -v`)
  5. Exit code 0 on complete pass; non-zero on any failure.

### 3. Test Tier Definitions

#### Tier 1: Feature Coverage (Smoke & Contract Verification)
- `test_t1_muon_ticket_tracking`: Ticket T-000058 exists, status valid, metadata complete.
- `test_t1_slide_content_blocks_schema`: `SlideContent` model declares `blocks: Optional[List[Dict[str, Any]]] = None` and persists via `PUT /api/projects/{id}/slides`.
- `test_t1_hydration_title_priority_and_boilerplate_purged`: Slide title is assigned before card headings; "LOCATION & CONNECTIVITY" and real estate boilerplate completely purged.
- `test_t1_layout_flex_and_watermark_bounds`: Card containers render with dynamic flex flow; watermark index letters bounded and not clipped.
- `test_t1_image_slot_resolution_and_fallback`: `node.type === 'image'` hydrated with slide image URL; invalid image URLs render fallback SVG placeholders.
- `test_t1_zero_regression_classic_studio`: `frontend/src/components/SlideStudioView.tsx` is 100% intact with `dangerouslySetInnerHTML` preserved.
- `test_t1_presenton_studio_pro_scaffold`: `frontend/src/components/PresentonSlideStudio.tsx` exists, exports the dedicated studio, and is wired into the Studio Switcher toggle.
- `test_t1_interactive_block_components`: Interactive block components (`BlockDraggable`, `@dnd-kit`, `GripVertical`, `EditableTextNode`) exist and conform to contracts.
- `test_t1_omnix_theme_alignment`: Studio Pro chrome and toolbar align with OMNIX dark-mode palette (`bg-slate-900`, `border-slate-800`, Inter/Montserrat).
- `test_t1_build_and_baseline_verification`: `npm --prefix frontend run build` and `pytest tests/test_slides.py` pass cleanly.

#### Tier 2: Boundary & Corner Cases (BVA & Failure Tolerance)
- `test_t2_empty_and_none_blocks_handling`: PUT requests with `blocks: []`, `blocks: None`, or omitted blocks persist cleanly without schema corruption.
- `test_t2_extreme_text_length_and_wrapping`: Extreme slide titles (300+ chars) and card descriptions (600+ chars) wrap with dynamic flex offsets without collision.
- `test_t2_zero_cards_minimal_slide`: Slide containing only a title with 0 cards and 0 bullets hydrates safely without index errors.
- `test_t2_broken_image_url_fallback`: Unreachable or malformed image URLs render error-tolerant fallback placeholders.
- `test_t2_invalid_template_or_layout_id`: Non-existent template or layout IDs fall back gracefully to default templates.
- `test_t2_massive_watermark_bounds`: Multi-digit watermark letters (e.g., "99", "100") stay bounded within container bounds.

#### Tier 3: Cross-Feature Combinations (Pairwise Interaction)
- `test_t3_studio_mode_switch_state_preservation`: Switching modes between Classic Studio and Studio Pro preserves slide deck modifications.
- `test_t3_canvas_dnd_reorder_persistence`: Reordering blocks via canvas drag-and-drop persists updated block ordering to backend `slides.json` and PPTX compilation.
- `test_t3_inplace_text_edit_debounced_sync`: Live text edits on slide title and cards correctly serialize and persist via `PUT /api/projects/{id}/slides`.
- `test_t3_hydration_with_diagram_resolver`: Ingested science concept resolves diagram, hydrates template runs, and compiles to PPTX.

#### Tier 4: Real-World Application Scenarios (Persona Workloads)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Wave Optics 5-Slide Lecture Generation | F2, F3, F5, F6, F14 | High |
| 2 | Teacher In-Place Editing & Drag-and-Drop Reorder Session | F8, F9, F11, F12, F14 | High |
| 3 | Full End-to-End Studio Pro Export & PPTX Compilation | F8–F16 | High |
| 4 | Multi-Template Design Pack Switcher (Landmark, Editorial, Modern) | F2, F3, F10, F13 | High |

---

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥5 test cases per core feature category (F1–F16).
- **Tier 2 (Boundary & Corner Cases)**: ≥5 dedicated edge-case tests.
- **Tier 3 (Cross-Feature Combinations)**: ≥4 major cross-feature interaction scenarios.
- **Tier 4 (Real-World Scenarios)**: ≥4 realistic end-user lecture workflows.
- **Total Minimum Target**: ≥23 automated test functions across 4 test modules + master shell runner.
