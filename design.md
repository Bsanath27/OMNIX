# OMNIX Design System Specification (`design.md`)

## 1. Design Philosophy & Vision

OMNIX balances **high-energy creative momentum** (inspired by modern generative tools like Lovable) with **authoritative pedagogical elegance** (tailored for educators in the IIT Madras / Commonwealth of Learning Training of Trainers programme).

Instead of sterile, clinical white or pitch-black, OMNIX uses:
- **Warm Creme Paper** in Light Mode for reduced eye strain during long textbook reading & authoring sessions.
- **Warm Obsidian Charcoal** in Dark Mode with warm undertones.
- **Electric Solar Orange** as the primary energetic trigger for prompts, generation, and active capability filters.
- **Cobalt / Electric Blue** as the secondary complementary accent for verification, code, and diagram anchors.

---

## 2. Palette Specification

### ☀️ Light Mode: "Warm Academic"
> **Coolors URL:** [https://coolors.co/ff5c00-faf7f2-ffffff-e8e2d8-18181b-2563eb](https://coolors.co/ff5c00-faf7f2-ffffff-e8e2d8-18181b-2563eb)

| Swatch | Token Name | Hex Code | RGB | Semantic UI Role |
| :---: | :--- | :--- | :--- | :--- |
| ![#FF5C00](https://via.placeholder.com/16/FF5C00/000000?text=+) | `--color-accent-orange` | `#FF5C00` | `255, 92, 0` | Primary CTA, Send button, Active capability pill, Focus rings |
| ![#FAF7F2](https://via.placeholder.com/16/FAF7F2/000000?text=+) | `--color-bg-canvas` | `#FAF7F2` | `250, 247, 242` | Main page canvas background (Warm Creme Paper) |
| ![#FFFFFF](https://via.placeholder.com/16/FFFFFF/000000?text=+) | `--color-bg-surface` | `#FFFFFF` | `255, 255, 255` | Floating prompt capsule, project cards, modals, dropdowns |
| ![#E8E2D8](https://via.placeholder.com/16/E8E2D8/000000?text=+) | `--color-border-subtle` | `#E8E2D8` | `232, 226, 216` | Card borders, drawer dividers, input outlines |
| ![#18181B](https://via.placeholder.com/16/18181B/000000?text=+) | `--color-text-primary` | `#18181B` | `24, 24, 27` | Headings, hero title, high-contrast reading text (Espresso) |
| ![#2563EB](https://via.placeholder.com/16/2563EB/000000?text=+) | `--color-accent-blue` | `#2563EB` | `37, 99, 235` | Secondary accent, video badge, verified citations, links |

**Supporting Light Tokens:**
- `--color-text-secondary`: `#716D64` (Muted Sand - subtitles, passage IDs, timestamps)
- `--color-bg-shelf`: `rgba(255, 255, 255, 0.75)` (Glassmorphic bottom shelf)
- `--color-state-success`: `#10B981` (Emerald green - Grounding verified badge)

---

### 🌑 Dark Mode: "Warm Obsidian"
> **Coolors URL:** [https://coolors.co/ff5c00-151413-1e1d1b-32302c-f5f2eb-3b82f6](https://coolors.co/ff5c00-151413-1e1d1b-32302c-f5f2eb-3b82f6)

| Swatch | Token Name | Hex Code | RGB | Semantic UI Role |
| :---: | :--- | :--- | :--- | :--- |
| ![#FF5C00](https://via.placeholder.com/16/FF5C00/000000?text=+) | `--color-accent-orange` | `#FF5C00` | `255, 92, 0` | Molten amber accent, action triggers, glowing rings |
| ![#151413](https://via.placeholder.com/16/151413/000000?text=+) | `--color-bg-canvas` | `#151413` | `21, 20, 19` | Main dark page background (Deep Warm Charcoal) |
| ![#1E1D1B](https://via.placeholder.com/16/1E1D1B/000000?text=+) | `--color-bg-surface` | `#1E1D1B` | `30, 29, 27` | Floating prompt capsule, sidebar drawer, artifact cards |
| ![#32302C](https://via.placeholder.com/16/32302C/000000?text=+) | `--color-border-subtle` | `#32302C` | `50, 48, 44` | Subtle borders, card rims, input strokes |
| ![#F5F2EB](https://via.placeholder.com/16/F5F2EB/000000?text=+) | `--color-text-primary` | `#F5F2EB` | `245, 242, 235` | Crisp headers, hero title, body text (Warm Ivory) |
| ![#3B82F6](https://via.placeholder.com/16/3B82F6/000000?text=+) | `--color-accent-blue` | `#3B82F6` | `59, 130, 246` | Electric blue accent, video badge, grounding tags |

**Supporting Dark Tokens:**
- `--color-text-secondary`: `#9CA3AF` (Slate Mist - subtitles, timestamps, passage numbers)
- `--color-bg-shelf`: `rgba(30, 29, 27, 0.85)` (Frosted bottom preset shelf)
- `--color-state-success`: `#34D399` (Mint green - Grounding verified badge)

---

## 3. The "Lovable" Ambient Background Blur Formulas

To achieve the luminous, atmospheric background glow seen on Lovable:

### Light Mode Mesh Gradient
```css
.ambient-glow-light {
  background-color: #FAF7F2;
  background-image: 
    radial-gradient(circle at 25% 75%, rgba(255, 92, 0, 0.20) 0%, rgba(255, 92, 0, 0.08) 30%, rgba(250, 247, 242, 0) 65%),
    radial-gradient(circle at 75% 65%, rgba(37, 99, 235, 0.16) 0%, rgba(37, 99, 235, 0.05) 35%, rgba(250, 247, 242, 0) 65%);
}
```

### Dark Mode Mesh Gradient
```css
.ambient-glow-dark {
  background-color: #151413;
  background-image: 
    radial-gradient(circle at 25% 75%, rgba(255, 92, 0, 0.26) 0%, rgba(255, 92, 0, 0.10) 35%, rgba(21, 20, 19, 0) 70%),
    radial-gradient(circle at 80% 65%, rgba(59, 130, 246, 0.22) 0%, rgba(59, 130, 246, 0.06) 35%, rgba(21, 20, 19, 0) 70%);
}
```

---

## 4. Tailwind CSS Configuration Snippet

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        omnix: {
          orange: '#FF5C00',
          // Light Mode (Warm Academic)
          light: {
            canvas: '#FAF7F2',
            surface: '#FFFFFF',
            border: '#E8E2D8',
            primary: '#18181B',
            muted: '#716D64',
            blue: '#2563EB',
          },
          // Dark Mode (Warm Obsidian)
          dark: {
            canvas: '#151413',
            surface: '#1E1D1B',
            border: '#32302C',
            primary: '#F5F2EB',
            muted: '#9CA3AF',
            blue: '#3B82F6',
          }
        }
      }
    }
  }
}
```

---

## 5. UI Component Guidelines

### 1. Centered Floating Prompt Capsule
- **Shape:** `rounded-2xl` with a subtle border and soft drop-shadow (`shadow-xl`).
- **Surface:** `#FFFFFF` in Light Mode, `#1E1D1B` in Dark Mode.
- **Top Bar Inside Capsule:** Horizontal row of capability selector pills:
  - Active: `#FF5C00` (Solar Orange) solid background with white text.
  - Inactive: Subtle tinted border with transparent background.
- **Input Line:**
  - `+` attach icon in `#FF5C00`.
  - Circular send arrow button in solid `#FF5C00`.

### 2. Sliding Left Drawer
- **Surface:** `#FFFFFF` (Light) / `#1E1D1B` (Dark).
- **Border:** Right divider `#E8E2D8` (Light) / `#32302C` (Dark).
- Holds Chapter project selector, "+ New Chapter" creator, and searchable indexed passages list.

### 3. Bottom Preset & Video Shelf
- **Surface:** Frosted translucent background with `backdrop-blur-md`.
- Holds horizontal scrollable cards for Golden Chapter presets (Newton's Laws, Thermodynamics, Optics).

### 4. Grounding Citations (`[Pxx-Sxx]`)
- Always rendered in a distinct badge style:
  - Light Mode: `bg-blue-50 text-blue-700 border border-blue-200 font-mono text-xs`
  - Dark Mode: `bg-blue-950/60 text-blue-400 border border-blue-800 font-mono text-xs`
  - Verified checkmark: Emerald Sage (`#10B981` / `#34D399`).
