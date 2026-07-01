import { useEffect, useRef, useState } from "react";
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
  const notesStageRef = useRef<HTMLDivElement | null>(null);
  const notesInnerRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    const stage = notesStageRef.current;
    const inner = notesInnerRef.current;
    if (!stage || !inner) return;

    const getTopOffset = () => {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--duomei-header-offset").trim();
      const parsed = Number.parseFloat(value);
      return Number.isFinite(parsed) ? parsed : 136;
    };

    const reset = () => {
      inner.style.position = "";
      inner.style.top = "";
      inner.style.left = "";
      inner.style.right = "";
      inner.style.width = "";
      inner.style.zIndex = "";
    };

    const sync = () => {
      const topOffset = getTopOffset();
      const stageTop = stage.getBoundingClientRect().top + window.scrollY;
      const stageHeight = stage.offsetHeight;
      const innerHeight = inner.offsetHeight;
      const start = stageTop - topOffset;
      const end = stageTop + stageHeight - innerHeight - topOffset;

      if (window.scrollY < start) {
        reset();
        inner.style.position = "relative";
        inner.style.top = "0";
        return;
      }

      if (window.scrollY > end) {
        inner.style.position = "absolute";
        inner.style.top = `${stageHeight - innerHeight}px`;
        inner.style.left = "0";
        inner.style.right = "0";
        inner.style.width = "100%";
        inner.style.zIndex = "3";
        return;
      }

      inner.style.position = "fixed";
      inner.style.top = `${topOffset}px`;
      inner.style.left = "0";
      inner.style.right = "0";
      inner.style.width = "100%";
      inner.style.zIndex = "3";
    };

    let frame = 0;
    const requestSync = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        sync();
      });
    };

    sync();
    window.addEventListener("scroll", requestSync, { passive: true });
    window.addEventListener("resize", requestSync);
    return () => {
      window.removeEventListener("scroll", requestSync);
      window.removeEventListener("resize", requestSync);
      if (frame) window.cancelAnimationFrame(frame);
      reset();
    };
  }, []);

  return (
    <main className="duomei-stage">
      <IllustrationLayer />
      <PaperLayer>
        <div className="notes-to-dream-stage">
          <div className="notes-cover-stage" ref={notesStageRef}>
            <div className="notes-cover-inner" ref={notesInnerRef}>
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
