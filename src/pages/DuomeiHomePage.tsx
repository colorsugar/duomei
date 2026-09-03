import { useEffect, useRef, useState } from "react";
import { KineticHeroStage } from "../components/HomeKineticStage";
import { NotesDreamTransition } from "../components/NotesDreamTransition";
import { PaperLayer } from "../components/PaperLayer";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/supabaseNotes";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import type { DuomeiNote } from "../lib/noteTypes";

const homeProgressSections = [
  { id: "home", label: "首页" },
  { id: "notes", label: "小记" },
  { id: "kuaihuo", label: "快活" },
  { id: "guyu", label: "故语" },
  { id: "yunyou", label: "云游" },
  { id: "color", label: "颜色" },
  { id: "weiyan", label: "微言" },
  { id: "skills", label: "技能" },
] as const;

function HomeSectionProgress() {
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [activeLabel, setActiveLabel] = useState("首页");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const viewportTop = window.scrollY;
      const boundaries = homeProgressSections.map((section) => ({
        ...section,
        top: section.id === "home"
          ? 0
          : (document.getElementById(section.id)?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) + window.scrollY,
      }));
      const footerTop = (document.querySelector<HTMLElement>(".duomei-footer")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) + window.scrollY;
      const activationLine = viewportTop + Math.min(72, window.innerHeight * 0.1);
      let activeIndex = 0;
      for (let index = 1; index < boundaries.length; index += 1) {
        if (boundaries[index].top <= activationLine) activeIndex = index;
      }
      const current = boundaries[activeIndex];
      const nextTop = boundaries[activeIndex + 1]?.top ?? footerTop;
      const currentElement = current.id === "home" ? null : document.getElementById(current.id);
      const currentBottom = currentElement
        ? currentElement.getBoundingClientRect().bottom + window.scrollY
        : nextTop;
      const stageHeight = currentElement
        ?.querySelector<HTMLElement>(".home-section-hold-stage, .poetry-portal-stage")
        ?.getBoundingClientRect().height ?? window.innerHeight;
      const progressEnd = currentElement?.hasAttribute("data-home-section-hold") ? currentBottom : nextTop;
      const holdDistance = Math.max(1, progressEnd - current.top - stageHeight);
      const sectionProgress = Math.min(1, Math.max(0, (viewportTop - current.top) / holdDistance));
      progressRef.current?.style.setProperty("--home-section-progress", String(sectionProgress));
      setActiveLabel(current.label);
      setVisible(window.scrollY > 48 && window.scrollY + window.innerHeight < footerTop);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className={`home-section-progress${visible ? " is-visible" : ""}`}
      ref={progressRef}
      aria-live="polite"
      aria-label={`当前板块：${activeLabel}`}
    >
      <span>当前</span>
      <i aria-hidden="true"><b /></i>
      <strong>{activeLabel}</strong>
    </div>
  );
}

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
      <main className="duomei-stage duomei-kinetic-active">
        <KineticHeroStage />
        <PaperLayer>
          <NotesDreamTransition canCreate={editMode || localPoetryPreview} notes={notes} onCreate={() => openNoteEditor()} />
        </PaperLayer>
      </main>
      <HomeSectionProgress />
    </>
  );
}
