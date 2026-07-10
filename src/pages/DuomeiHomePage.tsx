import { useEffect, useState } from "react";
import { IllustrationLayer } from "../components/IllustrationLayer";
import { NotesDreamTransition } from "../components/NotesDreamTransition";
import { PaperLayer } from "../components/PaperLayer";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/supabaseNotes";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import type { DuomeiNote } from "../lib/noteTypes";

export function DuomeiHomePage() {
  const { editMode, openNoteEditor, refreshKey } = useDuomeiEdit();
  const localPoetryPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).get("poetryEditor") === "1";
  const [notes, setNotes] = useState<DuomeiNote[]>(() => getPublishedNotes());

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const cloudNotes = await fetchPublishedNotes();
        if (active) setNotes(cloudNotes);
      } catch {
        if (active) setNotes(getPublishedNotes());
      }
    };
    load();
    window.addEventListener(NOTE_UPDATED_EVENT, load);
    return () => {
      active = false;
      window.removeEventListener(NOTE_UPDATED_EVENT, load);
    };
  }, [refreshKey]);

  return (
    <main className="duomei-stage">
      <IllustrationLayer />
      <PaperLayer>
        <NotesDreamTransition canCreate={editMode || localPoetryPreview} notes={notes} onCreate={() => openNoteEditor()} />
      </PaperLayer>
    </main>
  );
}
