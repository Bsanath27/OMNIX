import tempfile
from pathlib import Path
from backend.tools.ingestion.extractor import extract_document
from backend.tools.ingestion.grounding import (
    build_passages,
    save_passages_to_json,
    load_passages_from_json,
    verify_grounding,
)


def test_txt_ingestion_and_grounding():
    sample_text = """Chapter 1: Newton's Laws of Motion

An object at rest stays at rest and an object in motion stays in motion unless acted upon by an external net force. This is commonly known as the law of inertia.

Force equals mass times acceleration (F = ma). When a net force acts on a body, it produces acceleration in the direction of the force.

For every action, there is an equal and opposite reaction."""

    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write(sample_text)
        temp_path = Path(f.name)

    try:
        chunks = extract_document(temp_path)
        assert len(chunks) == 4, f"Expected 4 chunks, got {len(chunks)}"

        passages = build_passages(chunks)
        assert len(passages) == 4
        assert passages[0].id == "P01-S01"
        assert passages[1].id == "P01-S02"

        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as jf:
            json_path = Path(jf.name)

        save_passages_to_json(passages, json_path)
        loaded_map = load_passages_from_json(json_path)

        assert "P01-S02" in loaded_map
        assert "inertia" in loaded_map["P01-S02"].lower()

        # Test verification: matching quote
        quote = "law of inertia"
        assert verify_grounding("P01-S02", quote, loaded_map) is True

        # Test verification: unmatched quote
        unmatched_quote = "quantum electrodynamics spin"
        assert verify_grounding("P01-S02", unmatched_quote, loaded_map) is False

        print("Ingestion & Grounding test PASSED!")
    finally:
        temp_path.unlink(missing_ok=True)
        json_path.unlink(missing_ok=True)


if __name__ == "__main__":
    test_txt_ingestion_and_grounding()
