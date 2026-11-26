// ============================================================
// Citation normalisation for the Doubt-Solving Agent.
//
// LLMs are good at the *content* of an answer but unreliable at
// the exact citation syntax. This module repairs the common
// deviations so the UI can always render source chips:
//
//   【Source: TITLE, Page 6】        → [Source: TITLE, Page 6]
//   [Source: Page 6]                → [Source: TITLE, Page 6]
//   "... (see Page 7)"              → "... [Source: TITLE, Page 7]"
//   TITLE (SUBJECT, 12 pages)       → TITLE
//
// Every rewrite is grounded in the notes that were actually sent
// to the model — page numbers are never invented.
// ============================================================

export interface CitationNote {
  title: string;
  content: string;
  pages: number;
}

const PROPER_CITATION =
  /[\[【]\s*Source:\s*(.+?)\s*,\s*(?:Page\s*)?(\d+)\s*[\]】]/gi;

/** Remove a trailing "(SUBJECT, N pages)" suffix the model sometimes copies. */
function cleanTitle(title: string): string {
  return title
    .replace(/\s*\([^()]*,\s*\d+\s*pages?\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** First note that actually contains a "--- Page N ---" marker for this page. */
function titleForPage(page: number, notes: CitationNote[]): string {
  const marker = new RegExp(`---\\s*Page\\s*${page}\\s*---`, "i");
  const hit = notes.find((n) => marker.test(n.content));
  return cleanTitle(hit?.title ?? notes[0]?.title ?? "Your notes");
}

/**
 * Replace bare "Page N" references with a full citation, using the
 * closest preceding citation title as the source of truth.
 */
function replaceBarePages(
  segment: string,
  fallbackTitle: string | null,
  notes: CitationNote[]
): string {
  return segment.replace(/\bPage\s+(\d{1,3})\b/gi, (whole, digits: string) => {
    const page = Number(digits);
    if (!Number.isFinite(page) || page < 1) return whole;
    const title = fallbackTitle ?? titleForPage(page, notes);
    return `[Source: ${title}, Page ${page}]`;
  });
}

export function normalizeCitations(raw: string, notes: CitationNote[]): string {
  // Unify full-width brackets the model occasionally emits.
  const text = raw.replace(/【/g, "[").replace(/】/g, "]");

  const out: string[] = [];
  let cursor = 0;
  let lastTitle: string | null = null;
  let match: RegExpExecArray | null;
  PROPER_CITATION.lastIndex = 0;

  while ((match = PROPER_CITATION.exec(text)) !== null) {
    const before = text.slice(cursor, match.index);
    out.push(replaceBarePages(before, lastTitle, notes));

    const title = cleanTitle(match[1]);
    lastTitle = title;
    out.push(`[Source: ${title}, Page ${Number(match[2])}]`);
    cursor = match.index + match[0].length;
  }
  out.push(replaceBarePages(text.slice(cursor), lastTitle, notes));

  return out.join("");
}
