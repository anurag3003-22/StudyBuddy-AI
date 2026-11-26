"""Text utilities: tokenising, sentence splitting, heading detection, chunking."""

from __future__ import annotations

import re
from dataclasses import dataclass

STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this",
    "these", "those", "of", "in", "on", "at", "to", "for", "with", "by", "from",
    "as", "is", "are", "was", "were", "be", "been", "being", "it", "its", "we",
    "you", "they", "he", "she", "i", "do", "does", "did", "can", "could",
    "should", "would", "will", "shall", "may", "might", "must", "not", "no",
    "so", "such", "which", "who", "whom", "what", "when", "where", "why", "how",
    "also", "into", "over", "under", "between", "about", "per", "via", "each",
    "any", "all", "some", "more", "most", "other", "only", "own", "same",
    "there", "their", "our", "your", "my", "me", "us", "them", "has", "have",
    "had", "using", "used", "use", "one", "two", "three", "s", "e", "g",
}

TOKEN_RE = re.compile(r"[a-z0-9][a-z0-9+#._-]*")

HEADING_PREFIX_RE = re.compile(r"^(?:unit|chapter|module|topic|section|lesson)\b", re.I)
NUMBERED_RE = re.compile(r"^[0-9]+(?:\.[0-9]+)*\s+[A-Z]")
NORMAL_FORM_RE = re.compile(r"^[1-5]NF\b")
WORD_RE = re.compile(r"[A-Za-z][A-Za-z0-9()'\-]*")
CONNECTORS = {"and", "or", "of", "for", "in", "on", "to", "with", "the", "a", "an", "&"}
VERB_WORDS = {
    "is", "are", "was", "were", "be", "requires", "require", "means", "mean",
    "refers", "refer", "describes", "describe", "must", "can", "should",
    "returns", "return", "holds", "uses", "use", "has", "have", "allows",
}


def looks_like_heading(line: str) -> bool:
    line = line.strip()
    if not line or len(line) > 70 or len(line.split()) > 10:
        return False
    if line.startswith(("•", "-", "*", "–", "▪")):
        return False
    if line.endswith((".", ",", ";")):
        return False
    if HEADING_PREFIX_RE.match(line) or NUMBERED_RE.match(line) or NORMAL_FORM_RE.match(line):
        return True
    words = WORD_RE.findall(line)
    if not words:
        return False
    if any(word.lower() in VERB_WORDS for word in words):
        return False
    capitalized = sum(1 for word in words if word[0].isupper())
    return capitalized >= len(words) - 1 and capitalized >= 1


def tokenize(text: str) -> list[str]:
    """Lowercase alphanumeric tokens with light normalisation."""
    tokens: list[str] = []
    for raw in TOKEN_RE.findall(text.lower()):
        token = raw.strip("._-")
        if not token or token in STOPWORDS or len(token) < 2:
            continue
        if token.endswith("ies") and len(token) > 4:
            token = token[:-3] + "y"
        elif token.endswith("s") and not token.endswith(("ss", "us", "is")) and len(token) > 3:
            token = token[:-1]
        tokens.append(token)
    return tokens


ABBREVIATIONS = ("e.g.", "i.e.", "etc.", "vs.", "Dr.", "Mr.", "Mrs.", "Ms.", "No.", "Fig.", "approx.")


def split_sentences(text: str) -> list[str]:
    """Split prose into sentences, keeping bullet lines as their own units."""
    text = re.sub(r"[ \t]+", " ", text)
    for abbreviation in ABBREVIATIONS:
        text = text.replace(abbreviation, abbreviation[:-1] + "\u2024")

    sentences: list[str] = []
    paragraph: list[str] = []

    def flush() -> None:
        nonlocal paragraph
        if not paragraph:
            return
        block = " ".join(paragraph).strip()
        paragraph = []
        if not block:
            return
        for piece in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9\"'(\[])", block):
            piece = piece.strip()
            if len(piece) >= 2:
                sentences.append(piece)

    for raw in text.splitlines():
        line = raw.strip()
        if not line:
            flush()
            continue
        if line.startswith(("•", "-", "*", "–", "▪")):
            flush()
            bullet = line.lstrip("•-*–▪ ").strip()
            if bullet:
                sentences.append(bullet)
            continue
        paragraph.append(line)
    flush()

    restored = [sentence.replace("\u2024", ".") for sentence in sentences]
    return [sentence for sentence in restored if sentence]


@dataclass(slots=True)
class TextChunk:
    index: int
    page: int
    heading: str
    text: str


def chunk_pages(
    pages: list[tuple[int, str]],
    target_chars: int = 900,
    overlap: int = 150,
) -> list[TextChunk]:
    """Split page text into heading-aware, overlapping chunks.

    The current heading is prefixed to the chunk body so embeddings and keyword
    search keep the topical context (e.g. "BCNF" stays attached to its text).
    """
    chunks: list[TextChunk] = []
    counter = 0
    for page_number, raw in pages:
        text = raw.replace("\x00", " ").strip()
        if not text:
            continue
        current_heading = ""
        block: list[str] = []

        def flush() -> None:
            nonlocal counter, block, current_heading
            if not block:
                return
            body = "\n".join(block).strip()
            if not body:
                block = []
                return
            for piece in _split_block(body, target_chars, overlap):
                if current_heading and piece.lower().startswith(current_heading.lower()):
                    prefix = ""
                else:
                    prefix = f"{current_heading}\n" if current_heading else ""
                chunks.append(
                    TextChunk(
                        index=counter,
                        page=page_number,
                        heading=current_heading,
                        text=(prefix + piece).strip(),
                    )
                )
                counter += 1
            block = []

        for line in text.splitlines():
            stripped = line.strip()
            if looks_like_heading(stripped):
                flush()
                current_heading = stripped.rstrip(":").strip()
                # The heading is re-attached as a prefix below, so don't keep
                # the raw line in the body (avoids duplicate text).
            else:
                block.append(stripped)
        flush()
    return chunks


def _split_block(body: str, target_chars: int, overlap: int) -> list[str]:
    if len(body) <= target_chars:
        return [body]
    sentences = split_sentences(body)
    pieces: list[str] = []
    current = ""
    for sentence in sentences:
        if len(current) + len(sentence) + 1 > target_chars and current:
            pieces.append(current.strip())
            tail = current[-overlap:] if overlap else ""
            current = f"{tail} {sentence}".strip()
        else:
            current = f"{current} {sentence}".strip() if current else sentence
    if current.strip():
        pieces.append(current.strip())
    return pieces or [body[:target_chars]]


def keywords(text: str, limit: int = 6) -> list[str]:
    seen: dict[str, int] = {}
    for token in tokenize(text):
        seen[token] = seen.get(token, 0) + 1
    ordered = sorted(seen.items(), key=lambda item: (-item[1], item[0]))
    return [word for word, _ in ordered[:limit]]


def title_from_filename(filename: str) -> str:
    stem = re.sub(r"\.(pdf|txt|md|markdown|docx)$", "", filename, flags=re.I)
    stem = re.sub(r"[_-]+", " ", stem).strip()
    words = []
    for word in stem.split():
        if word.isupper() and len(word) > 1:
            words.append(word)  # keep acronyms like DBMS / BCNF intact
        else:
            words.append(word[:1].upper() + word[1:])
    return " ".join(words) or "Untitled notes"


def strip_heading(text: str, heading: str) -> str:
    """Remove the heading line that chunking prefixed to the body."""
    if heading and text.lstrip().startswith(heading.strip()):
        return text.lstrip()[len(heading.strip()):].lstrip("\n :")
    return text


ACRONYM_RE = re.compile(r"\b(?:[A-Z]{2,6}|[1-4]NF)\b")
PROPER_RE = re.compile(r"\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2}\b")
SKIP_PROPER = {"The", "This", "That", "These", "Those", "For", "When", "If", "A", "An", "In", "On", "Example", "Exam", "Unit", "Chapter", "Note"}


def key_phrases(text: str, limit: int = 5) -> list[str]:
    """Human-readable key terms: acronyms first, then proper phrases."""
    found: list[str] = []
    seen: set[str] = set()

    def push(phrase: str) -> None:
        phrase = phrase.strip()
        if not phrase or len(phrase) > 42:
            return
        key = phrase.lower()
        if key in seen:
            return
        seen.add(key)
        found.append(phrase)

    for match in ACRONYM_RE.findall(text):
        push(match)
    for match in PROPER_RE.findall(text):
        if match.split()[0] not in SKIP_PROPER:
            push(match)
    if len(found) < limit:
        for token in sorted(set(tokenize(text)), key=lambda item: -len(item)):
            if len(token) >= 6:
                push(token)
            if len(found) >= limit:
                break
    return found[:limit]
