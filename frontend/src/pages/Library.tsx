import {
  CloudUpload,
  FileText,
  FolderOpen,
  Loader2,
  RotateCcw,
  Sparkles,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { useRef, useState } from "react";
import { api } from "../lib/api";
import { cn, formatDate, relativeTime } from "../lib/format";
import { useStudy } from "../store";
import { EmptyState } from "../components/EmptyState";

export function LibraryPage() {
  const { documents, subjects, subject, status, refresh, notify, online } = useStudy();
  const [subjectName, setSubjectName] = useState(subject);
  const [title, setTitle] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  function addFiles(incoming: FileList | null) {
    if (!incoming) return;
    const next = Array.from(incoming).filter((file) =>
      /\.(pdf|txt|md|markdown)$/i.test(file.name),
    );
    if (next.length !== incoming.length) notify("Only PDF, TXT and MD files are supported.", "error");
    setFiles((current) => [...current, ...next].slice(0, 5));
  }

  async function upload() {
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        await api.upload(file, subjectName.trim() || "General", files.length === 1 ? title.trim() : "");
      }
      notify(`${files.length} document${files.length === 1 ? "" : "s"} indexed. Ask away.`, "success");
      setFiles([]);
      setTitle("");
      if (input.current) input.current.value = "";
      await refresh();
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }

  async function remove(id: string, name: string) {
    if (!window.confirm(`Remove “${name}” and its indexed passages?`)) return;
    setDeleting(id);
    try {
      await api.deleteDocument(id);
      await refresh();
      notify("Document removed.", "success");
    } catch (error) {
      notify((error as Error).message, "error");
    } finally {
      setDeleting(null);
    }
  }

  async function seed() {
    try {
      await api.seedDemo();
      await refresh();
      notify("Demo DBMS notes indexed.", "success");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }

  async function reset() {
    if (!window.confirm("Reset all demo data (documents, plans, quizzes, progress)?")) return;
    try {
      await api.resetDemo();
      await refresh();
      notify("Demo reset to a clean DBMS state.", "success");
    } catch (error) {
      notify((error as Error).message, "error");
    }
  }

  const totalPages = documents.reduce((sum, doc) => sum + doc.pages, 0);

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-ink-900">Add study material</h3>
              <p className="text-[12px] text-ink-500">PDFs, lecture notes, or markdown — indexed page by page.</p>
            </div>
            <span className="chip">
              <FolderOpen size={12} className="text-brand-500" /> {documents.length} docs · {totalPages} pages
            </span>
          </div>

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              addFiles(event.dataTransfer.files);
            }}
            onClick={() => input.current?.click()}
            className={cn(
              "mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 py-9 text-center transition",
              dragging
                ? "border-brand-400 bg-brand-50/60"
                : "border-ink-200 bg-ink-50/40 hover:border-brand-300 hover:bg-brand-50/30",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-card">
              <CloudUpload size={21} />
            </span>
            <p className="mt-3 text-[13px] font-bold text-ink-700">
              {dragging ? "Drop to index" : "Drag & drop, or click to browse"}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-400">PDF · TXT · MD · up to 25 MB each</p>
            <input
              ref={input}
              type="file"
              accept=".pdf,.txt,.md,.markdown"
              multiple
              className="hidden"
              onChange={(event) => addFiles(event.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="mt-3 space-y-1.5">
              {files.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg border border-ink-100 bg-white px-2.5 py-1.5">
                  <FileText size={13} className="text-brand-400" />
                  <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-ink-600">{file.name}</span>
                  <span className="text-[10.5px] text-ink-400">{(file.size / 1024).toFixed(0)} KB</span>
                  <button
                    onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
                    className="text-ink-300 transition hover:text-rose-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="subject">
                Subject
              </label>
              <input
                id="subject"
                list="subject-options"
                value={subjectName}
                onChange={(event) => setSubjectName(event.target.value)}
                placeholder="DBMS"
                className="field"
              />
              <datalist id="subject-options">
                {subjects.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="label" htmlFor="title">
                Title (optional)
              </label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Auto from filename"
                className="field"
              />
            </div>
          </div>

          <button onClick={() => void upload()} disabled={!files.length || uploading || !online} className="btn-primary mt-4 w-full">
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <UploadCloud size={15} />}
            {uploading ? "Chunking & indexing…" : `Index ${files.length || ""} file${files.length === 1 ? "" : "s"}`}
          </button>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-ink-900">Indexed documents</h3>
            <span className="section-title">{status?.chunks ?? 0} passages</span>
          </div>

          {documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Nothing indexed yet"
              description="Upload a PDF of your syllabus or notes. The RAG agent chunks it page-aware so every answer can cite a page."
              action={
                <button onClick={() => void seed()} className="btn-soft">
                  <Sparkles size={14} /> Load demo DBMS notes
                </button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {documents.map((doc) => (
                <article key={doc.id} className="card group p-4 transition hover:border-brand-200 hover:shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <FileText size={18} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-bold text-ink-800">{doc.title}</p>
                      <p className="truncate text-[11px] text-ink-400">{doc.filename}</p>
                    </div>
                    <button
                      onClick={() => void remove(doc.id, doc.title)}
                      disabled={deleting === doc.id}
                      className="text-ink-200 transition hover:text-rose-500"
                      title="Remove"
                    >
                      {deleting === doc.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-bold text-ink-600">{doc.subject}</span>
                    <span className="text-ink-400">{doc.pages} pages</span>
                    <span className="text-ink-300">·</span>
                    <span className="text-ink-400">{doc.chunks} chunks</span>
                    <span className="ml-auto text-ink-400">{relativeTime(doc.uploaded_at)}</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <aside className="space-y-4">
        <div className="card p-5">
          <h3 className="text-[14px] font-bold text-ink-900">How indexing works</h3>
          <ol className="mt-3 space-y-3">
            {[
              ["Extract", "PDF pages are parsed with page numbers preserved."],
              ["Chunk", "~900 character windows with heading context and overlap."],
              ["Rank", "BM25 keyword search fused with embeddings when configured."],
              ["Cite", "Every passage keeps its document, page and heading."],
            ].map(([title, description], index) => (
              <li key={title} className="flex gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-[10px] font-bold text-brand-600">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12px] font-bold text-ink-700">{title}</p>
                  <p className="text-[11px] leading-relaxed text-ink-500">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="card p-5">
          <h3 className="text-[14px] font-bold text-ink-900">Agent status</h3>
          <dl className="mt-3 space-y-2 text-[12px]">
            <div className="flex justify-between">
              <dt className="text-ink-500">Mode</dt>
              <dd className="font-semibold text-ink-800">{status?.llm_enabled ? "LLM-augmented" : "Offline heuristics"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Model</dt>
              <dd className="max-w-[180px] truncate font-mono text-[11px] font-medium text-ink-700">{status?.model ?? "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Embeddings</dt>
              <dd className="font-semibold text-ink-800">{status?.embeddings ? "Enabled" : "Keyword only"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-500">Passages</dt>
              <dd className="font-semibold text-ink-800">{status?.chunks ?? 0}</dd>
            </div>
          </dl>
          <p className="mt-3 rounded-lg bg-ink-50 p-2.5 text-[10.5px] leading-relaxed text-ink-500">
            Add an OpenAI-compatible key in <code className="font-mono">.env</code> to upgrade answer phrasing. Retrieval and
            citations work either way.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => void seed()} className="btn-ghost flex-1 text-[11.5px]">
            <Sparkles size={13} /> Re-seed demo
          </button>
          <button onClick={() => void reset()} className="btn-ghost flex-1 text-[11.5px] !text-rose-600 hover:!border-rose-200 hover:!bg-rose-50">
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        <p className="text-center text-[10px] text-ink-400">Last refreshed {formatDate(new Date().toISOString().slice(0, 10))}</p>
      </aside>
    </div>
  );
}
