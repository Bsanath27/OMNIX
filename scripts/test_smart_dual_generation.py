import asyncio
import json
import os
import sys
from pathlib import Path

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.core.config import settings
from backend.core.llm import call_llm

SMART_DECK_SYSTEM_PROMPT = """You are an expert presentation designer and frontend engineer.
Convert the given slide outline into visually breathtaking, presentation-ready 1280x720 Tailwind HTML sections.

STRICT CONTRACT:
- Canvas is exactly 1280x720. Use root class: "relative h-[720px] w-[1280px] overflow-hidden bg-[#0F172A] text-white p-12 flex flex-col justify-between"
- DO NOT repeat layouts! Vary the layout across slides:
  * Slide 1: High-impact hero cover with large title, subtitle, and an aesthetic side banner or glowing accent ring.
  * Slide 2: Asymmetric split layout (left 55% rich editorial insight with bold concept tag, right 45% image slot or visual frame).
  * Slide 3: 3-step staggered vertical or chevron progress ribbon with distinct step badges ('01', '02', '03') and connecting lines.
  * Slide 4: High-contrast data/metrics slide with 2-3 oversized stat numbers (e.g. '38 ATP', '92% Efficiency') and horizontal bar comparison.
  * Slide 5: Deep conceptual card matrix or circular thesis breakdown.
  * Slide 6: Summary wrap-up with key takeaways and teacher reflection checkpoint.
- Use Tailwind utility classes directly on elements.
- Never use scrollbars, clipping, or overlapping text. Safe area: 48px padding.
- Return format: strictly wrap each slide in:
<!-- SLIDE_START -->
<section data-slide-title="Slide Title" class="relative h-[720px] w-[1280px] overflow-hidden ...">
  ...slide markup...
</section>
<!-- SLIDE_END -->
"""

async def test_generation():
    outline = [
        {"title": "Cellular Respiration & Bioenergetics", "bullets": ["Universal biological energy conversion", "Aerobic vs Anaerobic pathways"]},
        {"title": "Glycolysis Mechanics", "bullets": ["Cytoplasmic glucose breakdown", "Net gain of 2 ATP and 2 NADH", "No oxygen required"]},
        {"title": "The Krebs Matrix Oxidation", "bullets": ["Mitochondrial matrix cycle", "Acetyl-CoA oxidation", "Production of electron carriers"]},
    ]
    
    user_prompt = f"Topic Outline:\n{json.dumps(outline, indent=2)}\n\nGenerate 3 distinct 1280x720 Tailwind HTML slides."
    
    print("Calling LLM with Smart HTML generation prompt...")
    res = await call_llm(
        messages=[
            {"role": "system", "content": SMART_DECK_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=4096
    )
    
    print("\n--- Raw Result Length:", len(res))
    slides = res.split("<!-- SLIDE_START -->")
    print(f"Detected {len(slides)-1} slide sections!")
    for idx, s in enumerate(slides[1:]):
        content = s.split("<!-- SLIDE_END -->")[0].strip()
        print(f"\n[Slide {idx+1}] Length: {len(content)} chars")
        print(content[:250] + "...\n")

if __name__ == "__main__":
    asyncio.run(test_generation())
