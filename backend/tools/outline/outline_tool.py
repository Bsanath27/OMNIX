import json
import logging
import re
from pathlib import Path
from typing import Dict, List, Optional
from backend.core.config import settings
from backend.core.models import (
    ChapterOutline,
    ConceptItem,
    GroundingRef,
    StoryboardScenePlan,
    VocabularyItem,
)
from backend.tools.ingestion.grounding import (
    load_passages_from_json,
    verify_grounding,
)

logger = logging.getLogger(__name__)


def generate_offline_fallback_outline(
    project_id: str,
    passages_map: Dict[str, str],
    title: Optional[str] = None,
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
) -> ChapterOutline:
    """
    Deterministic rule-based pedagogical outline extractor for offline mode
    or when external LLM APIs are not configured. Extracts key terms, definitions,
    and constructs grounded scenes directly from passages.
    """
    passage_items = list(passages_map.items())
    inferred_title = title or (passage_items[0][1][:60].strip() if passage_items else f"Project {project_id}")
    inferred_subject = subject or "Science"
    inferred_grade = grade_level or "Grade 9-10"

    # Derive summary from first 2-3 passages
    summary_snippets = [p[1] for p in passage_items[:3]]
    summary = " ".join(summary_snippets)[:300] if summary_snippets else "Chapter content overview."

    # Heuristic concept & vocabulary extraction
    concepts: List[ConceptItem] = []
    vocabulary: List[VocabularyItem] = []
    scenes: List[StoryboardScenePlan] = []

    seen_terms = set()
    for p_id, text in passage_items:
        # Search for definition patterns: "X is defined as...", "X refers to...", "X is a..."
        matches = re.findall(r"([A-Z][a-zA-Z\s]{2,25})\s+(?:is defined as|refers to|is a|means)\s+([^.]+)", text)
        for term, definition in matches:
            clean_term = term.strip()
            if clean_term.lower() not in seen_terms and len(clean_term) > 3:
                seen_terms.add(clean_term.lower())
                ref = GroundingRef(
                    passage_id=p_id,
                    quote=f"{clean_term} is {definition.strip()[:60]}",
                    verified=True
                )
                if len(vocabulary) < 5:
                    vocabulary.append(VocabularyItem(
                        term=clean_term,
                        definition=definition.strip(),
                        grounding=ref
                    ))
                elif len(concepts) < 5:
                    concepts.append(ConceptItem(
                        concept=clean_term,
                        explanation=definition.strip(),
                        grounding=ref
                    ))

        # Build storyboard scene for prominent paragraphs
        if len(scenes) < 6 and len(text.strip()) > 50:
            scene_idx = len(scenes) + 1
            scene_ref = GroundingRef(
                passage_id=p_id,
                quote=text[:80].strip(),
                verified=True
            )
            scenes.append(StoryboardScenePlan(
                scene_number=scene_idx,
                title=f"Section {scene_idx}: {text[:35].strip()}...",
                template_type="ProcessFlow" if scene_idx % 2 == 0 else "CoordinateGraph",
                narration_script=text[:250].strip(),
                visual_description=f"Visual explanation demonstrating key ideas from passage {p_id}",
                key_formulas=[],
                grounding=scene_ref
            ))

    # If no regex matches were found, synthesize fallback items grounded in available passages
    if not concepts and passage_items:
        first_p_id, first_text = passage_items[0]
        concepts.append(ConceptItem(
            concept="Core Principle",
            explanation=first_text[:150].strip(),
            grounding=GroundingRef(passage_id=first_p_id, quote=first_text[:50].strip(), verified=True)
        ))

    if not vocabulary and passage_items:
        first_p_id, first_text = passage_items[0]
        vocabulary.append(VocabularyItem(
            term="Fundamental Concept",
            definition=first_text[:100].strip(),
            grounding=GroundingRef(passage_id=first_p_id, quote=first_text[:40].strip(), verified=True)
        ))

    learning_objectives = [
        f"Understand the fundamental principles of {inferred_title}.",
        f"Identify key components and definitions presented across the chapter.",
        f"Analyze practical applications and solve domain problems."
    ]

    return ChapterOutline(
        title=inferred_title,
        subject=inferred_subject,
        grade_level=inferred_grade,
        summary=summary,
        learning_objectives=learning_objectives,
        concepts=concepts,
        vocabulary=vocabulary,
        suggested_scenes=scenes,
    )


def extract_chapter_outline(
    project_id: str,
    subject: Optional[str] = None,
    grade_level: Optional[str] = None,
    title: Optional[str] = None,
    prefer_offline: bool = False,
) -> ChapterOutline:
    """
    Extract a comprehensive pedagogical chapter outline from project passages.json.
    Uses Groq LLM API when configured; automatically falls back to deterministic
    offline extraction if API key is not present or LLM call fails.
    """
    project_dir = settings.PROJECTS_DIR / project_id
    passages_path = project_dir / "passages.json"
    outline_path = project_dir / "outline.json"

    if not passages_path.exists():
        raise FileNotFoundError(f"Passages file not found for project: {project_id}. Run ingestion first.")

    passages_map = load_passages_from_json(passages_path)
    if not passages_map:
        raise ValueError(f"Project {project_id} has no extracted passages.")

    # Check if Groq API is available and desired
    if prefer_offline or not settings.GROQ_API_KEY.strip():
        logger.info(f"Using deterministic offline outline generator for project {project_id}")
        outline = generate_offline_fallback_outline(project_id, passages_map, title, subject, grade_level)
    else:
        try:
            from groq import Groq

            # Format passages with their IDs for LLM context
            passage_corpus = "\n\n".join([f"[{pid}] {txt}" for pid, txt in list(passages_map.items())[:25]])
            model_name = settings.PRIMARY_LLM_MODEL.replace("groq/", "")

            client = Groq(api_key=settings.GROQ_API_KEY)
            prompt = f"""You are an elite STEM curriculum architect. Analyze the numbered chapter passages below and output a strict JSON outline according to the schema.
Every concept, vocabulary term, and scene MUST cite an exact passage ID (e.g. P01-S01) and quote a matching substring from that passage.

PASSAGES:
{passage_corpus}

OUTPUT JSON SCHEMA:
{{
  "title": "string",
  "subject": "{subject or 'Science'}",
  "grade_level": "{grade_level or 'Grade 9-10'}",
  "summary": "string",
  "learning_objectives": ["string"],
  "concepts": [
    {{
      "concept": "string",
      "explanation": "string",
      "grounding": {{ "passage_id": "P01-S01", "quote": "substring quote" }}
    }}
  ],
  "vocabulary": [
    {{
      "term": "string",
      "definition": "string",
      "grounding": {{ "passage_id": "P01-S01", "quote": "substring quote" }}
    }}
  ],
  "suggested_scenes": [
    {{
      "scene_number": 1,
      "title": "string",
      "template_type": "ProcessFlow | CoordinateGraph | Kinematics",
      "narration_script": "string",
      "visual_description": "string",
      "key_formulas": ["string"],
      "grounding": {{ "passage_id": "P01-S01", "quote": "substring quote" }}
    }}
  ]
}}"""

            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You are a curriculum structuring assistant that always outputs valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.2,
            )

            response_content = response.choices[0].message.content or "{}"
            raw_outline = json.loads(response_content)
            outline = ChapterOutline(**raw_outline)

        except Exception as e:
            logger.warning(f"Groq API outline extraction failed: {e}. Falling back to offline generator.")
            outline = generate_offline_fallback_outline(project_id, passages_map, title, subject, grade_level)

    # Verify and stamp grounding citations against actual passages
    for concept in outline.concepts:
        if concept.grounding:
            concept.grounding.verified = verify_grounding(
                concept.grounding.passage_id, concept.grounding.quote, passages_map
            )

    for vocab in outline.vocabulary:
        if vocab.grounding:
            vocab.grounding.verified = verify_grounding(
                vocab.grounding.passage_id, vocab.grounding.quote, passages_map
            )

    for scene in outline.suggested_scenes:
        if scene.grounding:
            scene.grounding.verified = verify_grounding(
                scene.grounding.passage_id, scene.grounding.quote, passages_map
            )

    # Save outline to project directory
    with open(outline_path, "w", encoding="utf-8") as f:
        json.dump(outline.model_dump(mode="json"), f, indent=2, ensure_ascii=False)

    # Update manifest
    manifest_path = project_dir / "manifest.json"
    if manifest_path.exists():
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest_data = json.load(f)
        manifest_data["outline"] = outline.model_dump(mode="json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    return outline
