OMNIX UI Spec v0.1
Draft for Antigravity + Gemini. Items marked OPEN are undecided and must not be guessed by the agent.
1. Purpose and users
OMNIX is a browser-based AI platform that lets educators (trainers in the COL Training of Trainers at IIT Madras) generate classroom material: slides, videos, images and comics, simulations and games, and (tier 2) 3D/AR. Success means a trainer produces material for a whole chapter with little help and can then teach other educators.
The UI is used in two modes: each trainer alone on a laptop, and a facilitator projecting it live to a room. Every layout decision must work for both.
2. Stack and constraints (proposed defaults)
• React + TypeScript + Vite. No Gradio.
• Tailwind CSS, shadcn/ui (Radix primitives), Motion (Framer Motion) for animation, Zustand for state.
• Browser client talking to a shared server over HTTP plus a streaming channel (SSE or WebSocket).
• Provider-agnostic: the UI only knows OMNIX's own event contract (section 12), never a specific LLM provider's response format.
• English only for now. All user-facing strings live in one strings file so translation can be added later.
3. Design principles
• Polished and animated at the level of Lovable or Replit: calm, spacious, confident.
• Built for projection: body text at least 16px, strong contrast (WCAG AA), large click targets.
• Light and dark themes with a toggle, defaulting to the system setting. All colors come from semantic tokens, never hard-coded.
• Honest failure: when something breaks, say so plainly and offer a next step.
• Motion respects prefers-reduced-motion.
4. Design tokens
The agent generates and stores these in one tokens file used by Tailwind:
• Semantic colors: background, surface, surface-raised, border, text, text-muted, accent, accent-text, success, warning, danger. Each has light and dark values.
• One typeface family with a defined scale (display, h1 to h3, body, small, mono).
• 4px spacing grid, a small set of radii, a small set of shadows.
• Motion tokens: durations (fast 150ms, base 220ms, slow 320ms) and easing curves.
5. App shell and routes
• / landing page
• /p/:projectId workspace
• /settings
Left sidebar (collapsible): logo, New project button, searchable list of saved projects (recent first), and at the bottom Settings and the theme toggle. Projects can be saved and reopened.
6. Landing page
Modeled on Lovable/Replit.
First screen: a large centered prompt box with a headline above it, over a subtle animated background. The box is autofocused, multiline, and has an attach-document button (PDF, PPT and similar) and a send button. Nothing else competes with it.
On scroll:
1.  Tool chips: Slides, Video, Simulations and Games, Images and Comics, 3D/XR (marked tier 2). Choosing a chip sets an optional tool hint on the prompt box. Without a hint, the main agent routes the request.
2.  Template gallery: cards of example prompts grouped by tool. Clicking a card fills the prompt box and scrolls back up. It does not auto-submit.
No subject, grade or chapter fields for now.
Submitting the prompt creates a project and animates the prompt box into the chat composer of the workspace.
7. Workspace
Two columns, Lovable-style: chat on the left (about 40%), artifact panel on the right (about 60%). A Focus button expands the artifact panel to full width for projection and restores the split on a second press. The panel slides in when the first artifact appears.
7.1 Chat
Message types:
• User message (text plus attached documents)
• Assistant message (streamed)
• Routing card: which tool the main agent chose
• Job card: queued, running with progress, done, failed
• Artifact card: thumbnail and title; clicking opens it in the panel
• Error card: plain-language reason plus actions
Composer: multiline input, attach document, optional tool-hint chip, Send that becomes Stop while generating.
7.2 Artifact panel
One active preview at a time, with a tab strip to switch between the project's artifacts (type icon plus title), overflowing into a list menu.
Panel header: title, version selector, download/export, Focus.
Preview renderers by type:
• Image, comic page, infographic: image viewer
• Slides: slide viewer
• Video: player plus a clip list. Video is built clip by clip, and Manim and image-to-video clips can be joined into one video.
• Simulation or game: sandboxed iframe (HTML)
• 3D/AR (tier 2): model viewer plus a QR code to open AR on a phone
Every reprompt creates a new version of the artifact. Earlier versions stay selectable.
8. Review: approve or reprompt
The behavior is fixed: the trainer approves an output or reprompts it, and video clips are reviewed one at a time before the next clip starts.
OPEN: where the controls live (in chat, in the artifact panel, or both). Until decided, build the review controls as one reusable component so it can be moved without rework.
9. Job and failure states
• States: queued, running, succeeded, failed, cancelled.
• Running shows a stage label and a determinate bar when progress is known, otherwise an indeterminate one. Queued shows position.
• Failure shows what happened in plain language and offers Retry, Edit prompt, and Switch model/provider. Never fall back silently to another model.
10. Motion
Required moments:
• Landing: animated background and a prompt box focus effect
• Chat: smooth text streaming and routing cards that animate in
• Template cards: hover lift and scroll reveal
• Workspace: panel slide-in and artifact reveal
• Jobs: progress animation
Rules: animate only transform and opacity, durations 150 to 320ms, target 60fps on mid-range laptops, and keep the background animation lightweight (CSS or canvas, no heavy WebGL). Non-essential motion is disabled under reduced-motion.
11. Settings
Provider API keys (any provider), local model endpoints, default models, theme.
OPEN: where keys are stored, since all trainers use one shared server.
12. Frontend/backend event contract
Define as TypeScript types in a shared contracts folder:
• message.delta, message.done
• tool.routed
• job.queued, job.progress, job.done, job.failed
• artifact.ready
• error
The agent builds a mock server that streams these events with pre-generated demo outputs. This enables the early demo and lets the backend be built in parallel.
13. Build order for Antigravity
Each step is a separate task, verified in the browser at laptop size and on a projector-like large size, in both themes.
1.  Tokens, theme toggle, base components
2.  App shell and landing page (static)
3.  Workspace layout and chat against the mock stream
4.  Artifact panel with all renderers
5.  Job and failure states
6.  Motion pass
7.  Settings
14. Open decisions
• Where approve/reprompt controls live (section 8)
• Where API keys are stored on a shared server (section 11)
• How projects are separated per trainer on a shared server. Earlier planning assumed no accounts; a shared server may need at least a lightweight identity.
• Moodle extension packaging
• Branding: name styling, logo, accent color
• Template gallery content