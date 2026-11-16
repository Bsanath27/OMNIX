import json
import re
from pathlib import Path
from typing import Dict, List
from backend.core.models import Passage


def build_passages(raw_chunks: List[Dict[str, any]]) -> List[Passage]:
    """Convert raw extracted text chunks into deterministic numbered passages."""
    passages: List[Passage] = []
    for idx, chunk in enumerate(raw_chunks):
        page = chunk.get("page", 1)
        p_idx = chunk.get("paragraph_index", idx + 1)
        passage_id = f"P{page:02d}-S{p_idx:02d}"
        passages.append(Passage(
            id=passage_id,
            page_number=page,
            paragraph_index=p_idx,
            text=chunk.get("text", "")
        ))
    return passages


def save_passages_to_json(passages: List[Passage], file_path: Path) -> None:
    """Save passages to passages.json in the project folder."""
    data = {p.id: p.model_dump() for p in passages}
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def load_passages_from_json(file_path: Path) -> Dict[str, str]:
    """Load passages from JSON as a simple ID -> text map for fast lookup."""
    if not file_path.exists():
        return {}
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return {k: v.get("text", "") if isinstance(v, dict) else str(v) for k, v in data.items()}


def normalize_tokens(text: str) -> set:
    """Tokenize and normalize text for fuzzy token overlap check."""
    words = re.findall(r"\w+", text.lower())
    return set(words)


def verify_grounding(passage_id: str, quote: str, passages_map: Dict[str, str], threshold: float = 0.5) -> bool:
    """
    Deterministic citation verification:
    Checks if quote tokens have sufficient overlap with the passage text.
    Executes in <1ms without any external vector database or embedding model.
    """
    if passage_id not in passages_map:
        return False

    passage_text = passages_map[passage_id]
    quote_tokens = normalize_tokens(quote)
    if not quote_tokens:
        return False

    passage_tokens = normalize_tokens(passage_text)
    overlap = quote_tokens.intersection(passage_tokens)
    similarity = len(overlap) / len(quote_tokens)
    return similarity >= threshold
