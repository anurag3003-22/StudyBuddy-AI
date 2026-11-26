// ============================================================
// Offline RAG fallback for the Doubt-Solving Agent.
//
// Used when no LLM is configured (or the provider is unreachable)
// so the product still answers from the student's notes with real
// page citations. Retrieval is a small BM25-style keyword ranker
// over page-aware chunks; the answer is extractive.
// ============================================================

export interface NoteLike {
  title: string;
  subject: string;
  pages: number;
  content: string;
}

export interface RagChunk {
  title: string;
  subject: string;
  page: number;
  heading: string;
  text: string;
}

const PAGE_MARKER = /---\s*Page\s+(\d+)\s*---/gi;
const MAX_CHUNK_CHARS = 1000;

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an",
  "and", "any", "are", "as", "at", "be", "because", "been", "before",
  "being", "below", "between", "both", "but", "by", "can", "could", "did",
  "do", "does", "doing", "down", "during", "each", "few", "for", "from",
  "further", "had", "has", "have", "having", "he", "her", "here", "hers",
  "herself", "him", "himself", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "itself", "just", "me", "more", "most", "my", "myself", "no",
  "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "ourselves", "out", "over", "own", "same", "she", "should",
  "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "you", "your", "yours", "yourself", "yourselves", "explain", "define",
  "describe", "tell", "give", "please", "want", "know", "mean", "means",
  "stronger", "strong", "different", "difference", "between", "vs", "versus",
  "summarize", "summary", "list", "example", "examples", "using", "use",
  "notes", "note", "uploaded", "syllabus", "exam", "question",
]);

/** Light stemming so "dependencies" matches "dependency". */
function stem(token: string): string {
  if (token.length > 4 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 4 && token.endsWith("es")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  return tf;
}

function splitSentences(text: string): string[] {
  // Protect common abbreviations so "e.g. ENROLL(...)" stays in one sentence.
  const protectedText = text.replace(
    /\b(e\.g|i\.e|etc|vs|fig|no|dr|mr|mrs|ms|prof|eq|sec|pp?)\./gi,
    "$1<dot>"
  );
  return protectedText
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) =>
      s
        .replace(/<dot>/g, ".")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((s) => s.length > 2);
}

/** Split a long page into ~1000-char chunks on sentence boundaries. */
function chunkPage(text: string): string[] {
  if (text.length <= MAX_CHUNK_CHARS) return [text];
  const sentences = splitSentences(text);
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > MAX_CHUNK_CHARS) {
      chunks.push(current.trim());
      current = "";
    }
    current += `${sentence} `;
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export function buildChunks(notes: NoteLike[]): RagChunk[] {
  const chunks: RagChunk[] = [];

  for (const note of notes) {
    const content = note.content ?? "";
    const markers = [...content.matchAll(PAGE_MARKER)];

    if (markers.length === 0) {
      for (const part of chunkPage(content.trim())) {
        chunks.push({
          title: note.title,
          subject: note.subject,
          page: 1,
          heading: note.title,
          text: part,
        });
      }
      continue;
    }

    markers.forEach((marker, i) => {
      const start = (marker.index ?? 0) + marker[0].length;
      const end = i + 1 < markers.length ? markers[i + 1].index : content.length;
      const raw = content.slice(start, end).trim();
      if (!raw) return;

      const lines = raw.split("\n");
      const firstLine = (lines[0] ?? "").trim();
      const looksLikeHeading = firstLine.length > 0 && firstLine.length <= 90;
      const heading = looksLikeHeading ? firstLine : `Page ${marker[1]}`;
      const body = looksLikeHeading ? lines.slice(1).join("\n").trim() : raw;
      // A page with only a heading still needs searchable text.
      const text = body.length >= 20 ? body : raw;

      for (const part of chunkPage(text)) {
        chunks.push({
          title: note.title,
          subject: note.subject,
          page: Number.parseInt(marker[1], 10) || 1,
          heading,
          text: part,
        });
      }
    });
  }

  return chunks;
}

interface ScoredChunk {
  chunk: RagChunk;
  score: number;
}

function rankChunks(question: string, chunks: RagChunk[]): ScoredChunk[] {
  const queryTokens = [...new Set(tokenize(question))];
  if (queryTokens.length === 0) return [];

  const scored: ScoredChunk[] = chunks.map((chunk) => {
    const bodyTokens = tokenize(chunk.text);
    const headingTokens = new Set(tokenize(chunk.heading));
    const titleTokens = new Set(tokenize(chunk.title));
    const tf = termFrequency(bodyTokens);

    let score = 0;
    for (const token of queryTokens) {
      const hits = tf.get(token) ?? 0;
      if (hits > 0) score += 1 + Math.log(hits);
      if (headingTokens.has(token)) score += 2.2;
      if (titleTokens.has(token)) score += 1.4;
    }

    // Mild length normalisation so giant pages do not dominate.
    score /= Math.sqrt(1 + bodyTokens.length / 120);
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
}

/** Pick the most relevant sentences from a chunk, in reading order. */
function pickSentences(
  question: string,
  chunk: RagChunk,
  limit: number
): string[] {
  const queryTokens = [...new Set(tokenize(question))];
  const sentences = splitSentences(chunk.text);
  if (sentences.length === 0) return [];

  const scored = sentences.map((sentence, index) => {
    const tf = termFrequency(tokenize(sentence));
    let score = 0;
    for (const token of queryTokens) {
      const hits = tf.get(token) ?? 0;
      if (hits > 0) score += 1 + Math.log(hits);
    }
    return { sentence, index, score };
  });

  const matching = scored.filter((s) => s.score > 0);
  const picked =
    matching.length > 0
      ? matching
          .sort((a, b) => b.score - a.score)
          .slice(0, limit)
          .sort((a, b) => a.index - b.index)
      : scored.slice(0, limit); // broad question ("summarize ACID") → lead sentences

  return picked.map((p) => p.sentence);
}

function cleanHeading(heading: string): string {
  return heading.replace(/\s+/g, " ").trim();
}

/**
 * Build a grounded, cited answer from the notes alone.
 * Returns markdown-ish text with [Source: TITLE, Page N] chips that the
 * DoubtSolver UI already knows how to render.
 */
export function answerFromNotes(question: string, notes: NoteLike[]): string {
  const chunks = buildChunks(notes);
  const ranked = rankChunks(question, chunks);

  if (ranked.length === 0) {
    const titles = notes
      .slice(0, 3)
      .map((n) => `**${n.title}**`)
      .join(", ");
    return [
      `This isn't covered in your uploaded notes — I couldn't find relevant material for **${question
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 90)}**${titles ? ` in ${titles}` : ""}.`,
      "",
      "Try adding the unit that covers this topic in the **Notes** tab, then ask again. (outside notes)",
    ].join("\n");
  }

  const broad = /\b(summar|explain|overview|list|describe|all|properties|compare|difference)\b/i.test(
    question
  );

  const top = ranked.slice(0, 3);
  const seen = new Set<string>();
  const sections: string[] = [];
  const subjects = new Set<string>();

  top.forEach((entry, index) => {
    const limit = index === 0 ? (broad ? 4 : 3) : 2;
    const sentences = pickSentences(question, entry.chunk, limit).filter(
      (sentence) => {
        const key = sentence.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }
    );
    if (sentences.length === 0) return;

    subjects.add(entry.chunk.subject);
    const citation = `[Source: ${entry.chunk.title}, Page ${entry.chunk.page}]`;
    const heading = cleanHeading(entry.chunk.heading);
    const lines = sentences.map((s) => `• ${s} ${citation}`);
    sections.push(`**${heading}**\n${lines.join("\n")}`);
  });

  if (sections.length === 0) {
    return [
      "This isn't covered in your uploaded notes — I found matching pages but could not extract a usable sentence.",
      "",
      "Try rephrasing the question or adding more detail to the note. (outside notes)",
    ].join("\n");
  }

  const subjectLabel = [...subjects].slice(0, 2).join(" / ");
  return [
    `From your ${subjectLabel} notes:`,
    "",
    sections.join("\n\n"),
    "",
    "_Offline mode — answers are extracted directly from your indexed notes. Add an LLM key for conversational phrasing._",
  ].join("\n");
}
