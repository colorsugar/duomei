import { useEffect, useRef, useState } from "react";
import { KineticHeroStage } from "../components/HomeKineticStage";
import { NotesDreamTransition } from "../components/NotesDreamTransition";
import { PaperLayer } from "../components/PaperLayer";
import { ZaobaoSection } from "../components/ZaobaoSection";
import { NOTE_UPDATED_EVENT, getPublishedNotes } from "../lib/noteStore";
import { fetchPublishedNotes } from "../lib/publicNotes";
import { useDuomeiEdit } from "../components/DuomeiEditProvider";
import type { DuomeiNote } from "../lib/noteTypes";

const homeProgressSections = [
  { id: "home", label: "首页" },
  { id: "zaobao", label: "早报" },
  { id: "notes", label: "小记" },
  { id: "kuaihuo", label: "快活" },
  { id: "guyu", label: "故语" },
  { id: "xunji", label: "寻迹" },
  { id: "dalu", label: "大陆" },
  { id: "yunyou", label: "云游" },
  { id: "color", label: "颜色" },
  { id: "weiyan", label: "微言" },
  { id: "skills", label: "Skill" },
] as const;

function HomeSectionProgress() {
  const progressRef = useRef<HTMLDivElement | null>(null);
  const [activeLabel, setActiveLabel] = useState("首页");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let frame = 0;
    type SectionLayout = { id: string; label: string; top: number; bottom: number; stageHeight: number; hold: boolean };
    let layout: { sections: SectionLayout[]; footerTop: number } | null = null;

    // Reading element boxes while the page scrolls forces layout every frame (the hold sections
    // write transforms in the same frame). Measure once, re-measure only when the document resizes.
    const measure = () => {
      const scrollY = window.scrollY;
      const sections: SectionLayout[] = homeProgressSections.map((section) => {
        const element = section.id === "home" ? null : document.getElementById(section.id);
        const rect = element?.getBoundingClientRect();
        const top = section.id === "home" ? 0 : rect ? rect.top + scrollY : Number.POSITIVE_INFINITY;
        const bottom = rect ? rect.bottom + scrollY : Number.POSITIVE_INFINITY;
        const stageHeight = element
          ?.querySelector<HTMLElement>(".home-section-hold-stage, .poetry-portal-stage")
          ?.getBoundingClientRect().height ?? window.innerHeight;
        return { id: section.id, label: section.label, top, bottom, stageHeight, hold: element?.hasAttribute("data-home-section-hold") ?? false };
      });
      const footerTop = (document.querySelector<HTMLElement>(".duomei-footer")?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY) + scrollY;
      layout = { sections, footerTop };
    };

    const update = () => {
      frame = 0;
      if (!layout) measure();
      const { sections, footerTop } = layout!;
      const viewportTop = window.scrollY;
      const activationLine = viewportTop + Math.min(72, window.innerHeight * 0.1);
      let activeIndex = 0;
      for (let index = 1; index < sections.length; index += 1) {
        if (sections[index].top <= activationLine) activeIndex = index;
      }
      const current = sections[activeIndex];
      const nextTop = sections[activeIndex + 1]?.top ?? footerTop;
      const currentBottom = activeIndex === 0 ? nextTop : current.bottom;
      const progressEnd = current.hold ? currentBottom : nextTop;
      const holdDistance = Math.max(1, progressEnd - current.top - current.stageHeight);
      const sectionProgress = Math.min(1, Math.max(0, (viewportTop - current.top) / holdDistance));
      progressRef.current?.style.setProperty("--home-section-progress", String(sectionProgress));
      setActiveLabel((label) => (label === current.label ? label : current.label));
      // Header underline, progress bar and cursor glow follow the section's hue (src/colorful.css).
      const rootStyle = document.documentElement.style;
      rootStyle.setProperty("--current-accent", `var(--accent-${current.id})`);
      rootStyle.setProperty("--current-accent-ink", `var(--accent-${current.id}-ink)`);
      rootStyle.setProperty("--current-accent-soft", `var(--accent-${current.id}-soft)`);
      document.documentElement.dataset.currentSection = current.id;
      const nextVisible = window.scrollY > 48 && window.scrollY + window.innerHeight < footerTop;
      setVisible((visible) => (visible === nextVisible ? visible : nextVisible));
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    const onLayoutChange = () => {
      layout = null;
      onScroll();
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onLayoutChange);
    // Sections grow as notes, the daily paper and images arrive; the document height tracks all of it.
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onLayoutChange);
    observer?.observe(document.documentElement);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onLayoutChange);
      observer?.disconnect();
      for (const name of ["--current-accent", "--current-accent-ink", "--current-accent-soft"]) document.documentElement.style.removeProperty(name);
      delete document.documentElement.dataset.currentSection;
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
          <ZaobaoSection />
          <NotesDreamTransition canCreate={editMode || localPoetryPreview} notes={notes} onCreate={() => openNoteEditor()} />
        </PaperLayer>
      </main>
      <HomeSectionProgress />
    </>
  );
}
