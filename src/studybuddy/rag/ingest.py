"""Document ingestion: PDF / text / markdown -> page-aware chunks."""

from __future__ import annotations

import io
from pathlib import Path

from pypdf import PdfReader

from .text import chunk_pages


def extract_pages(filename: str, payload: bytes) -> list[tuple[int, str]]:
    suffix = Path(filename).suffix.lower()
    if suffix == ".pdf":
        return _extract_pdf(payload)
    if suffix in {".txt", ".md", ".markdown", ""}:
        return _extract_text(payload)
    raise ValueError(f"Unsupported file type: {suffix or 'unknown'}. Use PDF, TXT or MD.")


def _extract_pdf(payload: bytes) -> list[tuple[int, str]]:
    reader = PdfReader(io.BytesIO(payload))
    pages: list[tuple[int, str]] = []
    for number, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        if text.strip():
            pages.append((number, text))
    if not pages:
        raise ValueError("No extractable text found. Is this a scanned PDF?")
    return pages


def _extract_text(payload: bytes) -> list[tuple[int, str]]:
    text = payload.decode("utf-8", errors="ignore")
    # Treat form-feeds as page breaks, otherwise chunk as a single page.
    raw_pages = text.split("\f")
    pages = [(i, page) for i, page in enumerate(raw_pages, start=1) if page.strip()]
    return pages or [(1, text)]


def build_chunks(
    doc_id: str,
    doc_title: str,
    subject: str,
    pages: list[tuple[int, str]],
) -> list[dict]:
    chunks = chunk_pages(pages)
    records: list[dict] = []
    for chunk in chunks:
        records.append(
            {
                "id": f"{doc_id}:{chunk.index}",
                "doc_id": doc_id,
                "doc_title": doc_title,
                "subject": subject,
                "page": chunk.page,
                "index": chunk.index,
                "heading": chunk.heading,
                "text": chunk.text,
            }
        )
    return records
