"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { BookOpen, FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { NoteItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* loading skeleton                                                    */
/* ------------------------------------------------------------------ */

function NotesSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="relative h-44 overflow-hidden rounded-2xl border border-[#1D2A4A] bg-[#0F1830]"
        >
          <div className="absolute inset-0 animate-shimmer" aria-hidden />
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* single note card                                                    */
/* ------------------------------------------------------------------ */

function NoteCard({
  note,
  index,
  onDelete,
}: {
  note: NoteItem;
  index: number;
  onDelete: (note: NoteItem) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.25 } }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
      className="card-glow rounded-2xl border border-[#1D2A4A] bg-[#0F1830] transition-transform duration-300 hover:-translate-y-1"
    >
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <FileText className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 font-medium leading-snug text-slate-100">
              {note.title}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <Badge className="border-sky-400/30 bg-sky-400/10 text-sky-300">
                {note.subject}
              </Badge>
              <span className="font-mono text-[11px] text-slate-500 tabular-nums">
                pages: {note.pages}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {note.preview}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-[#1D2A4A]/70 pt-3">
          <p className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <span className="relative flex h-2 w-2" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            RAG indexed
            <span className="text-slate-600">
              · {new Date(note.createdAt).toLocaleDateString()}
            </span>
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Delete note: ${note.title}`}
                className="h-8 w-8 text-slate-500 hover:bg-rose-400/10 hover:text-rose-400"
              >
                <Trash2 className="h-4 w-4" aria-hidden />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-[#1D2A4A] bg-[#101a35]">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-slate-50">
                  Delete this note?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400">
                  The RAG index will drop its chunks. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-[#1D2A4A] bg-[#0A0F1E] text-slate-300 hover:bg-[#14213c]">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(note)}
                  className="bg-rose-500 text-white hover:bg-rose-400"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* main component                                                      */
/* ------------------------------------------------------------------ */

export default function NotesLibrary() {
  const { toast } = useToast();
  const [notes, setNotes] = useState<NoteItem[] | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("DBMS");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      if (!res.ok) throw new Error(`GET /api/notes → ${res.status}`);
      const json = (await res.json()) as { notes: NoteItem[] };
      setNotes(Array.isArray(json.notes) ? json.notes : []);
    } catch (err) {
      console.error("[notes] failed to load", err);
      setNotes([]);
      toast({
        variant: "destructive",
        title: "Notes unavailable",
        description: "Could not reach /api/notes — try refreshing.",
      });
    }
  }, [toast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    if (notes === null) void fetchNotes();
  }, [notes, fetchNotes]);

  async function addNote() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          subject: subject.trim() || "DBMS",
          content,
        }),
      });
      if (!res.ok) throw new Error(`POST /api/notes → ${res.status}`);
      toast({
        title: "Note indexed — RAG chunks ready",
        description: "The Doubt Agent can now cite it page by page.",
      });
      confetti({
        particleCount: 45,
        spread: 60,
        origin: { x: 0.5, y: 0.4 },
        colors: ["#38BDF8", "#F5A623"],
      });
      setDialogOpen(false);
      setTitle("");
      setContent("");
      setSubject("DBMS");
      await fetchNotes();
    } catch (err) {
      console.error("[notes] add failed", err);
      toast({
        variant: "destructive",
        title: "Could not save note",
        description: "The index did not accept the note. Try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteNote(note: NoteItem) {
    // optimistic removal with animated exit
    const snapshot = notes;
    setNotes((n) => (n ? n.filter((x) => x.id !== note.id) : n));
    try {
      const res = await fetch(`/api/notes?id=${encodeURIComponent(note.id)}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`DELETE /api/notes → ${res.status}`);
      toast({ title: "Note deleted", description: "RAG chunks dropped." });
    } catch (err) {
      console.error("[notes] delete failed", err);
      setNotes(snapshot);
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Restored the note — nothing was lost.",
      });
    }
  }

  const canSubmit = title.trim().length > 0 && content.trim().length > 0 && !submitting;

  return (
    <div className="space-y-4">
      {/* header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-slate-50">Notes Hub</h3>
          <p className="font-mono text-[11px] text-slate-500">
            the RAG knowledge base · {notes ? notes.length : "…"} documents
          </p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="rounded-xl bg-sky-400 font-semibold text-[#051423] hover:bg-sky-300"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add Note
        </Button>
      </div>

      {/* grid */}
      {notes === null ? (
        <NotesSkeleton />
      ) : notes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-[#1D2A4A] bg-[#0F1830]/40 p-8 text-center"
        >
          <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-sky-400/25 bg-sky-400/10 text-sky-300">
            <BookOpen className="h-7 w-7" aria-hidden />
          </span>
          <p className="font-display text-base font-semibold text-slate-200">
            No notes yet — add your first syllabus PDF&apos;s text
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
            Paste a unit&apos;s worth of notes and the RAG index will chunk it
            into cited pages.
          </p>
        </motion.div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {notes.map((note, i) => (
              <NoteCard key={note.id} note={note} index={i} onDelete={deleteNote} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* add dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto border-[#1D2A4A] bg-[#101a35]">
          <DialogHeader>
            <DialogTitle className="font-display text-slate-50">
              Add a note to the index
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Paste your notes — page markers become citation anchors.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title" className="text-xs text-slate-400">
                Title
              </Label>
              <Input
                id="note-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OS Unit 1 — Processes"
                className="border-[#1D2A4A] bg-[#0A0F1E] text-sm placeholder:text-slate-600 focus-visible:ring-sky-400/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-subject" className="text-xs text-slate-400">
                Subject
              </Label>
              <Input
                id="note-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="border-[#1D2A4A] bg-[#0A0F1E] text-sm focus-visible:ring-sky-400/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-content" className="text-xs text-slate-400">
                Content
              </Label>
              <Textarea
                id="note-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                placeholder="Paste your notes here…"
                className={cn(
                  "resize-none border-[#1D2A4A] bg-[#0A0F1E] font-mono text-[13px] leading-relaxed",
                  "placeholder:text-slate-600 focus-visible:ring-sky-400/40"
                )}
              />
              <p className="font-mono text-[11px] text-slate-600">
                Tip: add --- Page N --- markers so the Doubt Agent can cite
                pages.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-[#1D2A4A] bg-[#0A0F1E] text-slate-300 hover:bg-[#14213c]"
            >
              Cancel
            </Button>
            <Button
              onClick={() => void addNote()}
              disabled={!canSubmit}
              className="bg-sky-400 font-semibold text-[#051423] hover:bg-sky-300"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Indexing…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  Save & Index
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
