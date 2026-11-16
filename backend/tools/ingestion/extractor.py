from pathlib import Path
from typing import List, Dict, Any
import re


def clean_text(text: str) -> str:
    """Normalize whitespace and strip unprintable characters."""
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_text_from_pdf(pdf_path: Path) -> List[Dict[str, Any]]:
    """Extract text from a PDF file page-by-page using pypdf."""
    import pypdf

    pages_data = []
    reader = pypdf.PdfReader(str(pdf_path))
    for page_idx, page in enumerate(reader.pages):
        raw_text = page.extract_text() or ""
        paragraphs = [clean_text(p) for p in raw_text.split("\n\n") if clean_text(p)]
        if not paragraphs and clean_text(raw_text):
            paragraphs = [clean_text(raw_text)]
        for p_idx, para in enumerate(paragraphs):
            pages_data.append({
                "page": page_idx + 1,
                "paragraph_index": p_idx + 1,
                "text": para
            })
    return pages_data


def extract_text_from_docx(docx_path: Path) -> List[Dict[str, Any]]:
    """Extract paragraphs from a DOCX file using python-docx."""
    import docx

    doc = docx.Document(str(docx_path))
    paras_data = []
    for idx, p in enumerate(doc.paragraphs):
        cleaned = clean_text(p.text)
        if cleaned:
            paras_data.append({
                "page": 1,  # DOCX doesn't store native page numbers
                "paragraph_index": idx + 1,
                "text": cleaned
            })
    return paras_data


def extract_text_from_txt(txt_path: Path) -> List[Dict[str, Any]]:
    """Extract paragraphs from plain text or markdown."""
    with open(txt_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    raw_paras = content.split("\n\n")
    paras_data = []
    for idx, p in enumerate(raw_paras):
        cleaned = clean_text(p)
        if cleaned:
            paras_data.append({
                "page": 1,
                "paragraph_index": idx + 1,
                "text": cleaned
            })
    return paras_data


def extract_document(file_path: Path) -> List[Dict[str, Any]]:
    """Extract text chunks from PDF, DOCX, or TXT."""
    suffix = file_path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(file_path)
    elif suffix in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    elif suffix in (".txt", ".md"):
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file format: {suffix}. Supported: .pdf, .docx, .txt, .md")

