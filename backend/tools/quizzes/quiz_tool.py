import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from backend.core.config import settings
from backend.core.models import Artifact, ArtifactStatus, GroundingRef, ToolBrief
from backend.core.registry import BaseTool, ExecutionContext, registry
from backend.tools.ingestion.grounding import verify_grounding

logger = logging.getLogger(__name__)


class QuizItem(BaseModel):
    id: str
    type: str = Field(..., description="'multiple_choice', 'true_false', or 'flashcard'")
    prompt: str = Field(..., description="Question prompt or flashcard term")
    options: List[str] = Field(default_factory=list, description="Choices for multiple choice")
    correct_answer: str = Field(..., description="Correct option, boolean, or flashcard definition")
    explanation: str = Field(default="", description="Pedagogical explanation of the solution")
    grounding: Optional[GroundingRef] = None


class QuizBrief(ToolBrief):
    num_questions: int = Field(default=5, ge=2, le=20, description="Total number of assessment items")
    quiz_types: List[str] = Field(
        default=["multiple_choice", "true_false", "flashcard"],
        description="Allowed item types"
    )
    difficulty: str = Field(default="intermediate", description="'beginner', 'intermediate', or 'advanced'")
    include_explanations: bool = Field(default=True, description="Provide pedagogical explanations for each answer")


class QuizTool(BaseTool):
    name: str = "quizzes"
    description: str = "Generates interactive Bloom's taxonomy quizzes, flashcards, and standalone offline HTML player."
    brief_model = QuizBrief

    async def run(self, brief: QuizBrief, ctx: ExecutionContext) -> Artifact:
        p_dir = Path(ctx.project_dir)
        output_dir = p_dir / "quizzes"
        output_dir.mkdir(parents=True, exist_ok=True)

        json_path = output_dir / "quiz.json"
        html_path = output_dir / "quiz_player.html"

        # Load project outline if available
        outline_path = p_dir / "outline.json"
        outline_data = None
        if outline_path.exists():
            try:
                with open(outline_path, "r", encoding="utf-8") as f:
                    outline_data = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load outline.json: {e}")

        # Plan quiz items
        quiz_items = self._generate_items(brief, ctx.passages, outline_data)

        # Grounding verification
        grounding_refs: List[GroundingRef] = []
        for item in quiz_items:
            if item.grounding:
                verified = verify_grounding(item.grounding.passage_id, item.grounding.quote, ctx.passages)
                item.grounding.verified = verified
                grounding_refs.append(item.grounding)

        # Write quiz JSON
        quiz_data = {
            "title": brief.topic,
            "subject": brief.subject,
            "grade_level": brief.grade_level,
            "difficulty": brief.difficulty,
            "items": [it.model_dump() for it in quiz_items]
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(quiz_data, f, indent=2, ensure_ascii=False)

        # Write standalone offline HTML player
        html_content = self._build_standalone_player(quiz_data)
        with open(html_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return Artifact(
            id=f"art-quiz-{brief.topic[:10].replace(' ', '_').lower()}",
            tool_name=self.name,
            project_id=ctx.project_id,
            status=ArtifactStatus.NEEDS_REVIEW,
            files=[str(json_path.relative_to(p_dir)), str(html_path.relative_to(p_dir))],
            source_data=quiz_data,
            grounding_refs=grounding_refs,
            cost_estimate_usd=0.0,
        )

    def _generate_items(
        self,
        brief: QuizBrief,
        passages: Dict[str, str],
        outline: Optional[Dict[str, Any]]
    ) -> List[QuizItem]:
        items: List[QuizItem] = []
        vocab_list = outline.get("vocabulary", []) if outline else []
        concepts_list = outline.get("concepts", []) if outline else []
        passage_items = list(passages.items())

        # 1. Synthesize Flashcards from vocabulary
        for idx, v in enumerate(vocab_list):
            if len(items) >= brief.num_questions:
                break
            g_ref = None
            if v.get("grounding"):
                g = v["grounding"]
                g_ref = GroundingRef(passage_id=g.get("passage_id", ""), quote=g.get("quote", ""))

            items.append(QuizItem(
                id=f"q-{len(items) + 1}",
                type="flashcard",
                prompt=f"Define: {v.get('term')}",
                correct_answer=v.get("definition", ""),
                explanation=f"Core chapter term grounded in passage {g_ref.passage_id if g_ref else 'text'}.",
                grounding=g_ref
            ))

        # 2. Synthesize Multiple Choice from concepts
        for idx, c in enumerate(concepts_list):
            if len(items) >= brief.num_questions:
                break
            g_ref = None
            if c.get("grounding"):
                g = c["grounding"]
                g_ref = GroundingRef(passage_id=g.get("passage_id", ""), quote=g.get("quote", ""))

            items.append(QuizItem(
                id=f"q-{len(items) + 1}",
                type="multiple_choice",
                prompt=f"Which of the following correctly describes '{c.get('concept')}'?",
                options=[
                    c.get("explanation", ""),
                    "It has no relation to physical dynamics or energy transfer.",
                    "It acts instantaneously regardless of reference frame.",
                    "It is inversely proportional to quantum fluctuations."
                ],
                correct_answer=c.get("explanation", ""),
                explanation=f"According to chapter analysis: {c.get('explanation')}",
                grounding=g_ref
            ))

        # 3. Fallback to direct passages if needed
        for idx, (pid, text) in enumerate(passage_items):
            if len(items) >= brief.num_questions:
                break
            g_ref = GroundingRef(passage_id=pid, quote=text[:60].strip())
            items.append(QuizItem(
                id=f"q-{len(items) + 1}",
                type="true_false",
                prompt=f"True or False: According to passage {pid}, '{text[:120].strip()}...'",
                options=["True", "False"],
                correct_answer="True",
                explanation=f"Directly verified from passage {pid}.",
                grounding=g_ref
            ))

        return items

    def _build_standalone_player(self, data: Dict[str, Any]) -> str:
        """Construct a lightweight, offline-executable single-file HTML quiz player."""
        data_json = json.dumps(data)
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{data.get('title', 'OMNIX Quiz')}</title>
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem;
    }}
    .container {{
      max-width: 680px;
      width: 100%;
    }}
    .header {{
      text-align: center;
      margin-bottom: 2rem;
    }}
    .title {{ font-size: 1.5rem; font-weight: 700; color: #38bdf8; margin-bottom: 0.5rem; }}
    .meta {{ font-size: 0.875rem; color: #94a3b8; }}
    .card {{
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
    }}
    .card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }}
    .badge {{
      background: #0284c7;
      color: white;
      font-size: 0.75rem;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-weight: 600;
      text-transform: uppercase;
    }}
    .citation {{
      font-size: 0.75rem;
      color: #38bdf8;
      font-family: monospace;
    }}
    .prompt {{
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 1.25rem;
      line-height: 1.5;
    }}
    .option-btn {{
      display: block;
      width: 100%;
      text-align: left;
      padding: 0.75rem 1rem;
      margin-bottom: 0.5rem;
      background: #0f172a;
      border: 1px solid #334155;
      border-radius: 8px;
      color: #e2e8f0;
      cursor: pointer;
      font-size: 0.95rem;
      transition: all 0.15s ease;
    }}
    .option-btn:hover:not(:disabled) {{
      background: #1e293b;
      border-color: #38bdf8;
    }}
    .option-btn.correct {{
      background: #064e3b !important;
      border-color: #10b981 !important;
      color: #6ee7b7;
    }}
    .option-btn.wrong {{
      background: #7f1d1d !important;
      border-color: #ef4444 !important;
      color: #fca5a5;
    }}
    .feedback {{
      margin-top: 1rem;
      padding: 0.75rem;
      border-radius: 6px;
      font-size: 0.875rem;
      background: #0f172a;
      border-left: 4px solid #38bdf8;
      display: none;
    }}
    .flashcard {{
      cursor: pointer;
      background: #1e293b;
      border: 2px dashed #0284c7;
      border-radius: 12px;
      padding: 2rem;
      text-align: center;
      min-height: 160px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }}
    .flashcard-hint {{ font-size: 0.75rem; color: #64748b; margin-top: 1rem; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">{data.get('title', 'Chapter Assessment')}</h1>
      <div class="meta">{data.get('subject', 'Science')} | {data.get('grade_level', 'Grade 9-10')} | Offline Interactive Package</div>
    </div>
    <div id="quiz-root"></div>
  </div>

  <script>
    const data = {data_json};
    const root = document.getElementById('quiz-root');

    data.items.forEach((item, idx) => {{
      const card = document.createElement('div');
      card.className = 'card';

      const citationHtml = item.grounding ? `<span class="citation">Grounding: [${{item.grounding.passage_id}}]</span>` : '';
      const badgeText = item.type.replace('_', ' ');

      if (item.type === 'flashcard') {{
        card.innerHTML = `
          <div class="card-header">
            <span class="badge">${{badgeText}}</span>
            ${{citationHtml}}
          </div>
          <div class="flashcard" onclick="this.classList.toggle('flipped'); this.querySelector('.fc-text').textContent = this.classList.contains('flipped') ? '${{item.correct_answer.replace(/'/g, "\\'")}}' : '${{item.prompt.replace(/'/g, "\\'")}}';">
            <div class="prompt fc-text">${{item.prompt}}</div>
            <div class="flashcard-hint">Click card to reveal definition</div>
          </div>
        `;
      }} else {{
        let optionsHtml = '';
        item.options.forEach((opt, optIdx) => {{
          const isCorrect = (opt === item.correct_answer);
          optionsHtml += `<button class="option-btn" data-correct="${{isCorrect}}" onclick="handleAnswer(this, ${{idx}})">${{opt}}</button>`;
        }});

        card.innerHTML = `
          <div class="card-header">
            <span class="badge">${{badgeText}}</span>
            ${{citationHtml}}
          </div>
          <div class="prompt">${{item.prompt}}</div>
          <div class="options-group">${{optionsHtml}}</div>
          <div class="feedback" id="feedback-${{idx}}">${{item.explanation || 'Verified from chapter passages.'}}</div>
        `;
      }}

      root.appendChild(card);
    }});

    function handleAnswer(btn, qIdx) {{
      const group = btn.closest('.options-group');
      const buttons = group.querySelectorAll('.option-btn');
      buttons.forEach(b => {{
        b.disabled = true;
        if (b.dataset.correct === 'true') b.classList.add('correct');
        else if (b === btn) b.classList.add('wrong');
      }});
      const fb = document.getElementById(`feedback-${{qIdx}}`);
      if (fb) fb.style.display = 'block';
    }}
  </script>
</body>
</html>"""


# Register quiz tool
quiz_tool_instance = QuizTool()
registry.register(quiz_tool_instance)
