# OMNIX Frontend Component Architecture & Design System

This document outlines the official UI libraries, module hierarchy, styling tokens, and design prompts for **OMNIX** (Open Multimodal Network for Immersive eXperiences).

---

## 1. Component Libraries & Tooling

To uphold **Rule 8 (Radical Component Minimization)** in `AGENT.md`, OMNIX uses a strict, lightweight library stack with zero license contamination and zero UI framework bloat:

| Domain | Library / Package | Version | License | Architectural Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Framework & Build** | React + TypeScript + Vite | `^18.3`, `~5.6`, `^5.4` | MIT | Core reactive web application runtime with fast HMR. |
| **CSS & Utility** | Tailwind CSS + Autoprefixer | `^3.4` | MIT | Utility-first styling with zero runtime CSS overhead. |
| **Class Utilities** | `clsx` + `tailwind-merge` | `^2.1`, `^2.5` | MIT | Conflict-free conditional className concatenation. |
| **Icons** | `lucide-react` | `^0.454` | ISC | Consistent, tree-shakeable SVG icons for all tools and statuses. |
| **Headless Primitives** | Radix UI (`dialog`, `tabs`, `popover`, `tooltip`) | `^1.1` | MIT | Accessible, unstyled UI primitives styled directly via Tailwind. |
| **Dynamic Schema Forms**| `@rjsf/core` + `@rjsf/validator-ajv8` | `^5.22` | Apache-2.0 | **Universal form generator**: Renders input forms for *any* capability tool dynamically from FastAPI Pydantic schemas (`/api/tools`). Prevents writing bespoke forms per tool. |
| **Interactive Quizzes** | `h5p-standalone` | `^3.7` | MIT | Client-side runner for `.h5p` quizzes and flashcards; completely avoids GPL libraries. |
| **Client-Side Diagrams**| `mermaid` | `^11.4` | MIT | Client-side DOM SVG rendering for flowcharts and system diagrams. |
| **Interactive Mindmaps**| `markmap-view` + `markmap-lib` | `^0.17` | MIT | Client-side interactive SVG mindmap renderer. |

---

## 2. The 4-View Minimal Modular Architecture

In accordance with **Rule 8 of AGENT.md**, agents must **never create bespoke per-tool components** (such as `SlideForm.tsx`, `QuizForm.tsx`, `VideoForm.tsx`). All frontend capabilities are handled by 4 core, data-driven views:

```
frontend/src/
├── api.ts                     # Type-safe API client (Projects, Tools, Doctor, Artifacts)
├── App.tsx                    # Root layout shell with DoctorBanner
├── components/
│   ├── DoctorBanner.tsx       # System health strip (FFmpeg, Manim, kokoro-onnx, API keys)
│   ├── ChapterDashboard.tsx   # View 1: Project sidebar, chapter upload & outline inspector
│   ├── SchemaFormModal.tsx    # View 2: Universal dynamic form dialog driven by /api/tools schemas
│   ├── ArtifactCard.tsx       # View 3: Polymorphic card rendering Slides, Quizzes, Diagrams, or Packages
│   ├── StoryboardGrid.tsx     # View 4: Visual parallel scene cards with audio sync indicators
│   └── GroundingPopover.tsx   # Reusable flyout displaying highlighted source chapter passages
└── index.css                  # Tailwind directives and base styles
```

---

## 3. Design Tokens & Visual Hierarchy

* **Surfaces:**
  * Application Background: `bg-slate-50`
  * Card / Modal Surface: `bg-white` with `border-slate-200` and `shadow-sm`
  * Secondary Surface / Sidebar: `bg-slate-100/70`
* **Typography:**
  * Title / Display: `font-bold text-slate-900 tracking-tight`
  * Section Headers: `font-semibold text-slate-800`
  * Body Text: `text-sm text-slate-600 leading-relaxed`
  * Microcopy / Metadata: `text-xs font-medium text-slate-400`
* **Brand Accents:**
  * Primary Action: `bg-indigo-600 hover:bg-indigo-700 text-white`
  * Secondary Action: `bg-white hover:bg-slate-50 text-slate-700 border border-slate-300`
  * Focus Ring: `focus:ring-2 focus:ring-indigo-500 focus:outline-none`
* **Source Grounding & Verification Badges:**
  * **Verified Chapter Passage:** `bg-emerald-50 text-emerald-700 border border-emerald-200` (Icon: `CheckCircle2`)
  * **Supplemental / Not in Chapter:** `bg-amber-50 text-amber-700 border border-amber-200` (Icon: `AlertTriangle`)
  * **Processing / Draft Mode:** `bg-indigo-50 text-indigo-700 border border-indigo-200` (Icon: `Clock`)
  * **Generation Failure:** `bg-rose-50 text-rose-700 border border-rose-200` (Icon: `XCircle`)

---

## 4. Production Prompts for Stitch Wireframe Generation

Use these prompts in **Google Stitch** (or modern AI wireframing tools) to experiment with and generate pixel-perfect UI wireframes for OMNIX:

---

### Prompt 1: Chapter Workspace & Pedagogical Outline Inspector

> **Design Prompt for Stitch:**
> 
> "Design a modern, clean web application interface for an educator tool called OMNIX. 
> 
> Layout: Desktop split-view workspace on a soft slate-50 background.
> Top Bar: Clean white navbar with OMNIX logo, subtitle 'Multimodal Learning Studio', and a compact system diagnostics strip with pill badges: 'FFmpeg: Ready', 'Manim: Ready', 'TTS: ONNX', 'Groq: Connected' in emerald-600.
> Left Sidebar (30% width): White card with rounded-xl border. Section header 'Chapter Projects' with a '+ New Chapter' primary button. List of projects with chapter titles, subject tag ('Physics', 'Biology'), and upload status indicator. Active project highlighted in subtle indigo-50 with an indigo border.
> Main Panel (70% width): 
> - Header section with active chapter title 'Chapter 9: Force & Newton's Laws of Motion', grade badge 'Grade 9-10 Science', and a subtle document badge 'Source: NCERT_Class9_Physics.pdf (18 passages indexed)'.
> - Navigation tabs: 'Pedagogical Outline', 'Slide Decks', 'Explainer Video', 'Quizzes & Games', 'Learning Package'.
> - Active Tab content (Pedagogical Outline):
>   1. 'Learning Objectives' card with 3 checkmark bullet points.
>   2. 'Core Concepts' section: Cards showing concept titles ('Inertia', 'Force & Momentum') and concise definitions. Beside each concept, display a small clickable pill badge 'P01-S02: Verified Source' in emerald-50 with an eye icon.
>   3. Action bar at bottom with two prominent launcher buttons: 'Generate Slide Deck (.pptx)' and 'Generate Interactive Quiz (H5P)' styled with clean indigo and purple accent buttons."

---

### Prompt 2: Universal Schema-Driven Tool Generator Dialog

> **Design Prompt for Stitch:**
> 
> "Design a focused modal dialog for an educational content generation tool. 
> 
> Modal Specs: Centered white dialog box with subtle drop shadow, rounded-2xl corners, max-width 560px on a dimmed backdrop.
> Header: Title 'Configure Presentation Deck' with a subtitle 'Driven by chapter pedagogical outline'. Top right has a minimal gray close 'X' button.
> Body Form Elements (Clean, accessible, stacked with 16px spacing):
> 1. Input Field: 'Presentation Title' with value pre-filled as 'Newton's Three Laws of Motion'.
> 2. Dropdown Select: 'Grade & Audience Level' selected as 'Secondary School (Grade 9-10)'.
> 3. Segmented Control / Radio Group: 'Slide Template Style' with 3 visual options: 'Modern Minimalist', 'Academic Clean', 'STEM Bold'.
> 4. Slider / Number Input: 'Number of Slides' showing '6 Slides (Recommended)'.
> 5. Toggle Switch: 'Include Visual Diagram Slots' toggled ON with helper text 'Auto-reserves slots for Mermaid flowcharts and formulas'.
> 6. Info Box at bottom: Light blue/slate box showing 'Grounding Check: 100% of slide topics will be cross-referenced with 18 indexed chapter passages'.
> Footer: Border-top with two buttons: 'Cancel' (secondary ghost button) and 'Generate Deck' (solid indigo-600 button with a sparkle icon and 'Est. Time: ~25s')."

---

### Prompt 3: Slide Deck Artifact Review Card with Source Grounding

> **Design Prompt for Stitch:**
> 
> "Design a rich educational artifact review card for a generated PowerPoint presentation deck.
> 
> Card Specs: White rounded-xl container with slate-200 border, padded with 24px.
> Card Header:
> - Left: Slide presentation icon in indigo, title 'Newton's Laws of Motion — Slide Deck', subtitle '6 Editable Slides (.pptx) · Generated via python-pptx in 18s'.
> - Right: Status pill 'Approved' in emerald-100 text-emerald-800, and 'Grounding: 100% Verified'.
> Card Body:
> - Horizontal slide carousel preview: 3 miniature slide preview frames side-by-side with 16:9 aspect ratio.
>   - Slide 1: Dark indigo title slide 'Newton's Laws of Motion'.
>   - Slide 2: Two-column slide with bullet points and a highlighted citation tag 'P01-S02'.
>   - Slide 3: Formula slide 'F = ma' with acceleration vector diagram placeholder.
> - Grounding Inspection Box: A light gray callout panel below the slides showing: 'Selected Bullet: An object remains at rest unless acted upon by a net force.' -> Cites Chapter Passage P01-S02: '...an object in motion stays in motion unless acted upon by an external net force.' with a green 'Source Matched' checkmark.
> Card Actions Footer:
> - Left: 'Download .pptx' (solid dark slate button with download icon).
> - Right: 'Reprompt / Adjust Parameters' (ghost button) and 'Add to Final Classroom Package' (primary indigo button)."

---

### Prompt 4: Interactive H5P Classroom Quiz Card with Live Feedback

> **Design Prompt for Stitch:**
> 
> "Design an interactive quiz card component for classroom educators.
> 
> Card Specs: Clean white container, rounded-xl, slate-200 border, subtle elevation.
> Header: Puzzle piece icon in amber-500, title 'Newton's Laws Interactive Practice Quiz', metadata '4 Questions · H5P.MultiChoice & Flashcards · Playable in browser'.
> Body (Simulating an active in-browser H5P quiz player):
> - Progress indicator: 'Question 2 of 4' with a thin indigo progress bar at 50%.
> - Question Prompt: 'According to Newton's First Law, what causes a moving object to change its velocity?'
> - Multiple Choice Options: 3 radio options with rounded-lg borders:
>   - ( ) 'Constant internal momentum'
>   - (•) 'An external net unbalanced force' [Selected state with indigo border and light indigo background]
>   - ( ) 'The mass of the object alone'
> - Feedback Container (expanded below options):
>   - Green banner: 'Correct! An external net force is required to change an object's state of motion.'
>   - Chapter Source Footnote: 'Verified from Chapter Passage P01-S02' with a clickable eye icon.
> Footer:
> - Left: 'Download .h5p Package' (for Moodle / offline use).
> - Right: 'Approve Activity' (emerald button) and 'Edit Questions' (subtle gray button)."

---

### Prompt 5: Explainer Video Storyboard Grid (Manim + Kokoro Sync)

> **Design Prompt for Stitch:**
> 
> "Design a parallel video storyboard editor interface for educational explainer videos.
> 
> Container: Section header 'Video Storyboard: Newton's Laws Explainer (Target: 2 min)' with a 'Draft All Scenes (480p Preview)' action button.
> Grid Layout: 4 scene cards arranged in a responsive 2x2 grid representing sequential video clips.
> Card Anatomy (Scene Card):
> - Top bar: 'Scene 1: Introduction to Inertia', template badge 'STEM: KinematicsVector', and a duration pill '14.2s (Audio Synced)' with a subtle waveform icon.
> - Center: 16:9 video preview frame showing a rendered Manim animation draft (coordinate axes with a rolling sphere and velocity arrow). Play overlay button on hover.
> - Lower section: 'Narration Script' text box showing Kokoro TTS voiceover sentence with audio timing badge: 'Kokoro Voice: af_heart · 14.2s'.
> - Bounding Box Safety status: Small green dot 'Layout Validated: No Overlap'.
> - Bottom actions: 'Play Preview' | 'Reprompt Scene' | '✓ Approve Clip'.
> Overall aesthetic: Clean, technical, highly legible, modern SaaS interface for educators."
