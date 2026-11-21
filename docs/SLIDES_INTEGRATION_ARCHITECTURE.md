# OMNIX Slide Studio Integration: Architecture, Post-Mortem & Handoff Guide

> **Target Audience**: AI Agents & Engineers working on the OMNIX Slide Generation pipeline.  
> **Status**: In Progress (Option B White-Labeling Plan Approved).  
> **Last Updated**: November 21, 2026.

---

## 1. Executive Summary & User Goal

The user wants a unified experience inside **OMNIX** (Open Multimodal Network for Immersive eXperiences):
1. **OMNIX Home Screen**: The user enters a topic/prompt (e.g., *"Quantum Computing"* or textbook chapter passage).
2. **Seamless Transition**: When the user intent is to create slides, OMNIX launches the 3-stage presentation workflow:
   - **Stage 1 (Themes & Templates)**: The user selects a visual presentation theme.
   - **Stage 2 (Outline Generation & Editing)**: The user reviews, edits, and reorders slide outline cards with AI assistance.
   - **Stage 3 (Slide Studio Editor)**: The user enters the full interactive slide canvas (layouts, inline Tiptap text editing, image placement, PPTX/PDF export).
3. **Core Mandates from User**:
   - **Zero "Presenton" Name/Branding**: The user must never see the name "Presenton", its purple icon, Discord invites, GitHub stars, or documentation links. Everything must look and feel 100% like native OMNIX (Electric Solar Orange `#FF5C00`, Dark Slate `#0A0D14`, Syne typography).
   - **No Separate Endpoints**: The user does not want Presenton exposed as a foreign external service on port 5001. It must feel like one single cohesive application on `http://localhost:5173`.
   - **Clean Native Navigation**: The back buttons must route properly:
     - On **Select Template**, clicking `Back` returns to the **OMNIX Home Screen**.
     - On **Outline Generation**, clicking `Back` returns to **Select Template**.
     - On **Slide Studio**, clicking `Back` returns to **Outline Generation**, and clicking the logo returns to **OMNIX Home**.
     - **No Floating Overlay Buttons**: The temporary dark floating `← OMNIX` pill button has been permanently removed; navigation must be handled cleanly by the native top header controls.

---

## 2. Runtime Environment & Services Topology

| Service | Runtime / Port | Role | Command / Task |
| :--- | :--- | :--- | :--- |
| **OMNIX Frontend** | Vite + React 19<br/>`http://localhost:5173` | Core educator studio interface, project manifests, document uploads, and embed views. | `npm --prefix frontend run dev` |
| **OMNIX Backend** | FastAPI + Python 3.11/3.13<br/>`http://localhost:8000` | Project APIs, passage grounding, audio generation (kokoro-onnx), and tool routing. | `python3 -m uvicorn backend.main:app --port 8000 --reload` |
| **Presenton Container** | Docker (`presenton`)<br/>Host port `5001` (Internal `80`) | Headless/UI engine for AI slide generation, PPTX/PDF compilation, and layout templates. | `docker start presenton` |

### Container Architecture Details:
- **Container Name**: `presenton`
- **Internal Nginx**: Listens on port `80`, forwards `/_next/` and `/` to Next.js on port `3000`, and `/api/v1/` to FastAPI on port `8000`.
- **Next.js Server**: Production standalone server running at `/app/servers/nextjs/server.js` using Turbopack.
- **Persistent Data**: Bound to `/Users/sanathbs/03_Dev_Lab/projects/IIT Madras/presenton-demo/user_data` &rarr; `/app/user_data`.

---

## 3. Post-Mortem: What Failed & Why (Critical Lessons for Future Agents)

### ❌ Anti-Pattern 1: Patching Minified Chunks Inside a Running Next.js Container
- **What was attempted**: Modifying `.js` files inside `/app/servers/nextjs/.next-build/static/chunks/` and `/server/chunks/ssr/` directly inside the Docker container to change button classes and click handlers.
- **Why it failed**: Next.js with Turbopack compiles route graphs dynamically and caches chunks in memory. Even with Nginx `Cache-Control: no-cache` headers, browser sessions and Turbopack in-memory instances reused cached chunks (`nextjs-cache: HIT`), resulting in phantom regressions where modifications appeared in `curl` but were ignored by the browser runtime.
- **RULE FOR NEXT AGENT**: **NEVER attempt to regex-replace minified production `.js` chunks inside `.next-build`**. Handle white-labeling via asset swaps, Nginx CSS injection, and client click interception.

### ❌ Anti-Pattern 2: The "Dashboard Trap" (Iframe Navigation Hijack)
- **What was attempted**: Embedding Presenton in an `<iframe>` while leaving Presenton's internal Next.js router untouched.
- **Why it failed**: When an educator clicked the logo or `< BACK` on the Select Template screen, Next.js called `router.push("/dashboard")`. Because it was inside an iframe, it loaded Presenton's full internal dashboard (sidebar, templates list, Discord links, GitHub links) inside the iframe frame, trapping the user.
- **RULE FOR NEXT AGENT**: Intercept `/dashboard` at the Nginx and DOM click level, and dispatch `window.parent.postMessage({ type: 'OMNIX_NAVIGATE_BACK' })` to exit back to OMNIX.

### ❌ Anti-Pattern 3: Floating UI Overlay Band-Aids
- **What was attempted**: Adding an absolute floating dark `← OMNIX` pill button on top of the iframe.
- **Why it failed**: It cluttered the screen, overlapped the native top-left logo, looked amateurish, and was rejected by the user.
- **RULE FOR NEXT AGENT**: The floating overlay button is permanently removed in `PresentonNativeEmbed.tsx`. All navigation must be driven by native header elements.

---

## 4. The Approved Architecture: Option B (Clean White-Label Engine)

Rather than fighting compiled Next.js bundles, **Option B** applies white-labeling cleanly at three resilient layers:

```
[ Browser / Educator ]
         │
         ▼
[ OMNIX Frontend (localhost:5173) ]
         │
         ├── /api/*          ──► OMNIX FastAPI (localhost:8000)
         └── /slides-engine/*──► Presenton Nginx (localhost:5001)
                                      │
                                      ├── Injects: /static/omnix-theme-override.css
                                      ├── Injects: /static/omnix-nav-interceptor.js
                                      ├── Rewrites: <title> & Meta tags via sub_filter
                                      ├── Replaces: /logo-with-bg.png with OMNIX Logo
                                      └── Intercepts: /dashboard ──► Redirects to OMNIX Home
```

---

## 5. Engineering Ticket Implementation Blueprint

### `OMNIX-SLD-101`: Asset-Level White-Labeling (Logo & Metadata)
1. **Asset Replacement**:
   - Overwrite `/app/servers/nextjs/public/logo-with-bg.png` and `/logo-white.png` inside the container with the OMNIX logo.
   - Result: Everywhere Presenton renders its logo, the OMNIX logo appears automatically without modifying JavaScript.
2. **Nginx HTML Rewriting (`/etc/nginx/nginx.conf`)**:
   - Add `sub_filter` to rewrite page titles and meta:
     ```nginx
     sub_filter '<title>Presenton' '<title>OMNIX Studio';
     sub_filter 'Presenton - Open Source AI presentation generator' 'OMNIX Presentation Studio';
     sub_filter_once off;
     sub_filter_types text/html;
     ```

### `OMNIX-SLD-102`: Global Palette Override & OMNIX Theme Injection
1. **Create `/app/servers/nextjs/public/static/omnix-theme-override.css`**:
   - Remap all purple `#7A5AF8` / `#5141e5` / `#6847F4` colors to OMNIX Electric Solar Orange `#FF5C00`.
   - Style the header `< BACK` button with the OMNIX pill design:
     ```css
     /* Remap primary purple to OMNIX Solar Orange */
     [class*="7A5AF8"], [class*="6847F4"], [class*="5141e5"] {
       color: #FF5C00 !important;
     }
     button[class*="bg-"][class*="7A5AF8"],
     div[class*="bg-"][class*="7A5AF8"] {
       background-color: #FF5C00 !important;
     }
     /* OMNIX Pill Back Button */
     header button:has(svg.lucide-arrow-left),
     button:has(svg.lucide-arrow-left) {
       border-radius: 9999px !important;
       border: 1px solid #EDEEEF !important;
       background-color: #FFFFFF !important;
       padding: 6px 14px !important;
       font-weight: 600 !important;
       color: #191919 !important;
       transition: all 0.2s ease !important;
       box-shadow: 0 1px 2px rgba(0,0,0,0.05) !important;
     }
     header button:has(svg.lucide-arrow-left):hover {
       background-color: #FFF5ED !important;
       border-color: rgba(255, 92, 0, 0.4) !important;
       color: #FF5C00 !important;
     }
     header button:has(svg.lucide-arrow-left) svg {
       color: #FF5C00 !important;
     }
     ```
2. **Inject Stylesheet in Nginx**:
   ```nginx
   sub_filter '</head>' '<link rel="stylesheet" href="/static/omnix-theme-override.css"></head>';
   ```

### `OMNIX-SLD-103`: External Community & Marketing Link Suppression
In `omnix-theme-override.css`, permanently hide all third-party branding:
```css
/* Suppress Discord, GitHub, and docs leaks */
a[href*="discord.com"],
a[href*="github.com"],
a[href*="docs.presenton.ai"],
button:has-text("Star"),
[aria-label="Community"],
a[href="/community"] {
  display: none !important;
}
```

### `OMNIX-SLD-104`: Navigation Interception & Dashboard Elimination
1. **Create `/app/servers/nextjs/public/static/omnix-nav-interceptor.js`**:
   ```javascript
   (function() {
     document.addEventListener('click', function(e) {
       const target = e.target.closest('a, button');
       if (!target) return;

       const href = target.getAttribute('href');
       const text = (target.innerText || '').trim().toUpperCase();
       const isBackBtn = text === 'BACK';
       const isLogo = target.querySelector('img[src*="logo"]') || target.getAttribute('aria-label') === 'Go to dashboard';
       const isTemplateStage = document.querySelector('h1')?.innerText?.includes('Select Template');

       // Exit to OMNIX when clicking logo, /dashboard, or Back on template stage
       if (isLogo || href === '/dashboard' || (isBackBtn && isTemplateStage)) {
         e.preventDefault();
         e.stopPropagation();
         if (window.parent && window.parent !== window) {
           window.parent.postMessage({ type: 'OMNIX_NAVIGATE_BACK' }, '*');
         } else {
           window.location.href = 'http://localhost:5173/';
         }
       }
     }, true);
   })();
   ```
2. **Inject Script in Nginx**:
   ```nginx
   sub_filter '</body>' '<script src="/static/omnix-nav-interceptor.js"></script></body>';
   ```
3. **Nginx Fallback Redirect**:
   ```nginx
   location = /dashboard {
     return 302 http://localhost:5173/;
   }
   ```

### `OMNIX-SLD-105`: Unified Same-Origin Routing
In `frontend/vite.config.ts`, reverse-proxy the presentation service:
```typescript
server: {
  port: 5173,
  proxy: {
    '/api': { target: 'http://127.0.0.1:8000', changeOrigin: true },
    '/slides-engine/': {
      target: 'http://127.0.0.1:5001',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/slides-engine/, ''),
    },
  },
}
```
In `frontend/src/components/PresentonNativeEmbed.tsx`, use `/slides-engine/outline?id=...` instead of `http://localhost:5001/outline?id=...`.

---

## 6. How the Next Agent Can Pick Up & Complete the Task

1. **Verify Services**:
   ```bash
   # Verify backend
   curl -s http://localhost:8000/docs > /dev/null && echo "FastAPI OK"
   # Verify frontend
   curl -s http://localhost:5173 > /dev/null && echo "Vite OK"
   # Verify container
   docker ps | grep presenton
   ```
2. **Execute Tickets `OMNIX-SLD-101` through `104`**:
   - Write `omnix-theme-override.css` and `omnix-nav-interceptor.js` into the container's public directory.
   - Update `/etc/nginx/nginx.conf` in the container with the `sub_filter` rules.
   - Reload Nginx: `docker exec presenton nginx -s reload`.
3. **Execute Ticket `OMNIX-SLD-105`**:
   - Update `frontend/vite.config.ts` and `frontend/src/components/PresentonNativeEmbed.tsx`.
   - Build frontend: `npm --prefix frontend run build`.
4. **Visual Verification**:
   - Use browser subagent to test the entire flow on `http://localhost:5173/`.
   - Verify that:
     1. Zero purple accents exist (all Electric Solar Orange `#FF5C00`).
     2. Zero Presenton logos or mentions exist.
     3. Clicking `< BACK` on Select Template cleanly returns to OMNIX Home.
     4. Clicking `< BACK` on Outline returns to Select Template.
     5. Slide Studio renders with clean OMNIX header.
