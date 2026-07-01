import { useEffect, useState } from "react";
import { IllustrationLayer } from "../components/IllustrationLayer";
import { FooterDreamSection } from "../components/FooterDreamSection";
import { NotesIntro } from "../components/NotesIntro";
import { NotesCarousel } from "../components/NotesCarousel";
import { PaperLayer } from "../components/PaperLayer";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/supabaseNotes";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import type { DuomeiNote } from "../lib/noteTypes";

export function DuomeiHomePage() {
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
    <main className="duomei-stage">
      <IllustrationLayer />
      <PaperLayer>
        <div className="notes-to-dream-stage">
          <div className="notes-cover-stage">
            <div className="notes-cover-inner">
              <NotesIntro canCreate={editMode} onCreate={() => openNoteEditor()} />
              <NotesCarousel notes={notes} />
            </div>
          </div>
          <div className="notes-bottom-spacer" aria-hidden="true" />
            <div className="dream-cover-stage">
              <div className="dream-cover-curve" aria-hidden="true">
              <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
                <path className="dream-cover-fill" d="M0,90 C360,10 1080,10 1440,90 L1440,180 L0,180 Z" />
                <path className="dream-cover-stroke" d="M0,90 C360,10 1080,10 1440,90" />
              </svg>
            </div>
            <FooterDreamSection />
          </div>
        </div>
      </PaperLayer>
    </main>
  );
}
