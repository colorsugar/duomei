import { useEffect, useState } from "react";
import { HomeIntroSection } from "../components/HomeIntroSection";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/supabaseNotes";
import type { DuomeiNote } from "../lib/noteTypes";

export function DuomeiTimePage() {
  const { editMode, openNoteEditor, refreshKey } = useDuomeiEdit();
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
    <main className="duomei-stage duomei-time-page">
      <HomeIntroSection canCreate={editMode} notes={notes} onCreate={() => openNoteEditor()} />
    </main>
  );
}
