import { useEffect, useState } from "react";
import { MotionHero } from "../experience/MotionHero";
import { MotionChapters } from "../experience/MotionChapters";
import { NotesDreamTransition } from "../components/NotesDreamTransition";
import { PaperLayer } from "../components/PaperLayer";
import { ZaobaoSection } from "../components/ZaobaoSection";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/supabaseNotes";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import type { DuomeiNote } from "../lib/noteTypes";

const homeProgressSections = [
  { id: "home", label: "首页" },
  { id: "zaobao", label: "早报" },
  { id: "notes", label: "小记" },
  { id: "kuaihuo", label: "快活" },
  { id: "guyu", label: "故语" },
  { id: "yunyou", label: "云游" },
  { id: "color", label: "颜色" },
  { id: "weiyan", label: "微言" },
  { id: "skills", label: "Skill" },
] as const;

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
    <>
      <main className="duomei-stage duomei-kinetic-active motion-home">
        <MotionHero />
        <PaperLayer>
          <ZaobaoSection />
          <NotesDreamTransition canCreate={editMode || localPoetryPreview} notes={notes} onCreate={() => openNoteEditor()} />
        </PaperLayer>
      </main>
      <MotionChapters chapters={homeProgressSections} />
    </>
  );
}
