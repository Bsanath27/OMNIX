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

## 2. Core Home Page Architecture (Chat-Centric Tri-Zone Layout)

The OMNIX home page is structured around **three coordinated visual zones**:

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [≡ Toggle Drawer]   OMNIX Multimodal Studio      ● FFmpeg: OK  ● Manim: OK  ● Kokoro: OK   [Settings]  │
├──────────────────┬─────────────────────────────────────────────────────────────────────────────────────┤
│ SLIDING DRAWER   │                                                                                     │
│ (Left Panel)     │                               CENTER CONVERSATIONAL CANVAS                          │
│                  │                                                                                     │
│ • Chapter Files  │      "What classroom materials would you like to create for this chapter?"         │
│ • Past Projects  │                                                                                     │
│ • Indexed Passages│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   (P01-S01...)   │   │  [ ✨ All Capabilities ]  [ 📊 Slides ]  [ 🎬 Video ]  [ 🧩 Quizzes ]       │   │
│ • Chapter Outline│   │ ─────────────────────────────────────────────────────────────────────────── │   │
│                  │   │  Ask OMNIX or enter a topic (e.g. 'Create a 6-slide deck on Newton's Laws')│   │
│                  │   │                                                         [ 📎 Upload ] [ ➔ ] │   │
│                  │   └─────────────────────────────────────────────────────────────────────────────┘   │
│                  │                                                                                     │
│                  │   Generated Artifacts & Conversation Stream appears here in real-time...            │
│                  │   [ Presentation Deck Card ]   [ Explainer Video Card ]   [ H5P Quiz Player Card ]  │
│                  │                                                                                     │
├──────────────────┴─────────────────────────────────────────────────────────────────────────────────────┤
│ BOTTOM SHELF: PRESET ASSETS & VIDEO SHOWCASE (Horizontal Scrollable Rail)                              │
│ ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐ │
│ │ 🎬 Manim Video Sample│  │ 📊 Newton Slides Deck│  │ 🧩 Physics H5P Quiz  │  │ 🔬 PhET Force Lab    │ │
│ │ Newton's 1st Law     │  │ 6-Slide Presentation │  │ 4 Practice Questions │  │ Interactive HTML5 Sim│ │
│ │ [Preview / Fork]     │  │ [Preview / Fork]     │  │ [Play Activity]      │  │ [Open Simulation]    │ │
│ └──────────────────────┘  └──────────────────────┘  └──────────────────────┘  └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Zone 1: Collapsible Left Sliding Window ("Knowledge & Project Drawer")
* **Purpose:** Manages context, chapter files, and source text without cluttering the main conversation.
* **Controls:** Toggled via top-left hamburger button (`≡`) or hotkey (`Cmd/Ctrl + B`).
* **Contents:**
  * Chapter project list (recent chapters, creation dates).
  * Uploaded document viewer (PDF/DOCX) with indexing status.
  * Searchable list of extracted passages (`P01-S01` to `PXX-SXX`) with green grounding indicator dots.

### Zone 2: Center Conversational Canvas ("Dual-Mode Multimodal Prompt Hub")
* **Master Natural Language Prompt Box:**
  * Centered, welcoming conversational prompt input with rich multi-line expansion.
  * Teachers can type broad package requests: *"Turn Chapter 9 into a complete teaching kit with slides, an explainer video on inertia, and a 4-question quiz."*
* **Capability Scope Pills (Fast-Action Filter):**
  * Attached directly above/inside the prompt input:
    `[ ✨ All (Auto) ] [ 📊 Slides ] [ 🎬 Video ] [ 🧩 Quizzes ] [ 📐 Diagrams ] [ 🔬 Simulations ]`.
  * **Dual Interaction:**
    1. *Default Mode (`All`):* General chat prompt; LLM classifier routes intent to appropriate tools.
    2. *Scoped Mode (e.g. clicking `[ 📊 Slides ]`):* Prompts are scoped specifically to slide generation, pre-filling parameters (e.g., slide count, template style) and opening the schema configuration if desired.
* **Conversational Artifact Stream:**
  * Generated outputs appear directly in the feed as polymorphic `ArtifactCard` components (slide decks, playable video drafts, interactive quizzes) side-by-side with source citation chips.

### Zone 3: Bottom Preset Assets & Video Showcase ("Inspiration Rail")
* **Purpose:** Gives educators immediate, one-click access to pre-made templates, Golden Chapter explainers, and interactive samples.
* **Layout:** Horizontal scrollable card carousel docked cleanly at the bottom.
* **Card Types:**
  * **Pre-rendered Manim Explainer Videos:** Sample 3Blue1Brown-style physics/maths videos.
  * **Template Presentation Decks:** Standard NCERT/CBSE style slide masters.
  * **Interactive Science Simulations:** Featured PhET HTML5 simulations.
* **One-Click Action:** Clicking any card loads the asset immediately into the workspace or pre-fills the prompt box to customize it.

---

## 3. Design Tokens & Visual Hierarchy

* **Surfaces:**
  * Application Background: `bg-slate-50`
  * Card / Modal Surface: `bg-white` with `border-slate-200` and `shadow-sm`
  * Sliding Drawer Surface: `bg-white` with `border-r border-slate-200 shadow-lg`
  * Bottom Showcase Surface: `bg-slate-100/80 border-t border-slate-200 backdrop-blur-sm`
* **Typography:**
  * Title / Display: `font-bold text-slate-900 tracking-tight`
  * Body / Prompts: `text-sm text-slate-700 leading-relaxed`
  * Metadata / Badges: `text-xs font-medium`
* **Brand Accents:**
  * Primary Action: `bg-indigo-600 hover:bg-indigo-700 text-white`
  * Capability Pills: `bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200`
  * Active Pill: `bg-indigo-600 text-white font-medium border-indigo-600`
* **Grounding Indicators:**
  * **Verified Chapter Source:** `bg-emerald-50 text-emerald-700 border border-emerald-200`
  * **Supplemental / External:** `bg-amber-50 text-amber-700 border border-amber-200`

---

## 4. Production Prompts for Google Stitch Wireframe Generation

---

### 🎨 Master Prompt: The Chat-Centric Home Page (Left Drawer, Center Chat, Bottom Showcase)

> **Copy-paste this prompt into Google Stitch:**
> 
> "Design a modern, minimalist web application interface for an AI educational tool called OMNIX.
> 
> Overall Layout: Full-height desktop application on a soft `slate-50` background with a tri-zone layout:
> 
> 1. Top Navigation Bar:
>    - Left: Hamburger drawer toggle button (`≡`) beside the logo 'OMNIX' with a badge 'COL / IIT Madras Edition'.
>    - Center/Right: Live health pill strip with green status dots: 'FFmpeg: Ready', 'Manim: Ready', 'Kokoro TTS: Online', 'Groq: 300 t/s'.
> 
> 2. Left Sliding Drawer (Expanded, 280px width, clean white surface with right border):
>    - Header: 'Chapter Projects' with a '+ New Chapter' button.
>    - Active Project card: 'Newton's Laws of Motion' (Grade 9 Science).
>    - Sub-section: 'Indexed Document' showing 'Chapter_09.pdf' with a green badge '18 Passages Ready'.
>    - Searchable list of passages: 'P01-S01: Definition of Force', 'P01-S02: Law of Inertia', 'P02-S01: F = ma'.
> 
> 3. Center Conversational Canvas (Main focus, comfortable reading width 760px centered):
>    - Greeting headline: 'What classroom materials would you like to build today?' with subtitle 'Upload a textbook chapter or prompt in natural language below.'
>    - Prominent Multimodal Prompt Box (Floating white card with rounded-2xl border, drop shadow):
>      - Top row inside prompt box: Horizontal row of capability filter pills:
>        `[✨ All Capabilities (Active)]` in solid indigo-600, followed by `[📊 Slides]`, `[🎬 Video]`, `[🧩 Quizzes]`, `[📐 Diagrams]`, `[🔬 Simulations]` in neutral gray border pills.
>      - Text area: Placeholder 'e.g. Generate a 6-slide presentation on inertia and an interactive 4-question quiz from Chapter 9...'
>      - Bottom row inside prompt box: Left side has a paperclip icon 'Attach Chapter File' and 'Chapter_09.pdf linked'. Right side has a circular indigo send arrow button.
>    - Below Prompt Box: Recent generated response snippet showing an artifact card preview for 'Newton's Laws Slide Deck (6 Slides)' with a 'Download .pptx' button and a green 'Grounding: 100% Verified' badge.
> 
> 4. Bottom Showcase Shelf (Docked at the bottom, 180px height, subtle gray background with top border):
>    - Section title: 'Preset Assets & Video Explainer Library' with a 'Browse All Presets ->' link.
>    - Horizontal scrollable row of 4 visual preset cards:
>      - Card 1: '🎬 Newton's 1st Law Manim Video' (16:9 thumbnail showing math animation curve, duration pill '14.2s', [Preview Clip]).
>      - Card 2: '📊 Laws of Motion Slide Deck' (presentation icon, '6 Slides · Editable PPTX', [Load Template]).
>      - Card 3: '🧩 Inertia Practice Quiz' (puzzle icon, 'H5P Interactive Quiz', [Play Sample]).
>      - Card 4: '🔬 PhET Force & Motion Simulation' (science beaker icon, 'Interactive HTML5 Lab', [Open Sim]).
> 
> Aesthetic: Clean, airy, typography-first, modern educational SaaS (similar to NotebookLM and Perplexity), professional and friendly for educators."

---

### 🎨 Prompt 2: Capability-Scoped Mode (`[ 🎬 Video ]` Selected)

> **Copy-paste this prompt into Google Stitch:**
> 
> "Design a state variant of the OMNIX central prompt canvas where the user has selected the `[ 🎬 Video ]` capability pill.
> 
> Center Canvas:
> - The prompt box highlights the `[ 🎬 Video ]` pill in solid purple-600.
> - An inline configuration bar appears directly beneath the capability pills:
>   - Template selector dropdown: 'STEM: Kinematics & Coordinate Vectors ▼'.
>   - Target duration pill: '2 Minutes (4 Storyboard Scenes)'.
>   - Voice narrator pill: 'Kokoro: af_heart (Natural Female Voice)'.
>   - Draft Mode toggle: '480p Fast Draft (<30s)' toggled ON.
> - Prompt input displays: 'Explain Newton's second law with moving mass vectors and formula derivation.'
> - Below the prompt box, display the 'Parallel Storyboard Draft Grid' with 4 visual scene cards:
>   - Scene 1: 'Concept Hook: Frictionless Surface' (preview thumbnail with velocity arrow, audio timing '12.4s', [✓ Approved]).
>   - Scene 2: 'Derivation: F = ma' (preview thumbnail showing equation transform, status 'Rendering Draft 65%...').
>   - Scene 3 & 4: Outlined placeholder cards with 'Drafting in parallel...'.
> 
> Bottom showcase remains docked at the bottom with pre-rendered Manim STEM video clips."
