import { useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent, WheelEvent } from "react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import { NoteCover } from "./NoteCover";

export function NotesCarousel({ notes }: { notes: DuomeiNote[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const reduceMotion = useRef(false);
  const canHover = useRef(false);
  const pauseStateRef = useRef({
    canLoop: false,
    editMode: false,
    isEditorOpen: false,
    isUserInteracting: false,
  });
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const { editMode, isEditorOpen, openNoteEditor, requestDelete } = useDuomeiEdit();
  const canLoop = notes.length > 1;
  const displayNotes = useMemo(() => (canLoop ? [...notes, ...notes, ...notes] : notes), [canLoop, notes]);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    canHover.current = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }, []);

  useEffect(() => {
    pauseStateRef.current = { canLoop, editMode, isEditorOpen, isUserInteracting };
  }, [canLoop, editMode, isEditorOpen, isUserInteracting]);

  const normalizeLoopPosition = () => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return;
    const groupWidth = viewport.scrollWidth / 3;
    if (groupWidth <= 0) return;
    if (viewport.scrollLeft >= groupWidth * 2) viewport.scrollLeft -= groupWidth;
    if (viewport.scrollLeft < groupWidth * 0.35) viewport.scrollLeft += groupWidth;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return;
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = viewport.scrollWidth / 3;
    });
  }, [canLoop, notes.length]);

  useEffect(() => {
    let lastTime = performance.now();
    const tick = (time: number) => {
      const viewport = viewportRef.current;
      const state = pauseStateRef.current;
      const delta = Math.min(32, time - lastTime);
      lastTime = time;
      const isCardHovering = canHover.current && !!document.querySelector(".duomei-note-card:hover");

      if (
        viewport &&
        state.canLoop &&
        !reduceMotion.current &&
        !state.editMode &&
        !state.isEditorOpen &&
        !isCardHovering &&
        !state.isUserInteracting
      ) {
        const pxPerFrame = window.innerWidth <= 760 ? 0.92 : 0.56;
        viewport.scrollLeft += pxPerFrame * (delta / 16.67);
        normalizeLoopPosition();
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [notes.length]);

  const pauseForUser = (duration = 1200) => {
    setIsUserInteracting(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setIsUserInteracting(false), duration);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    pauseForUser(1500);
  };

  const scrollByAmount = (direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pauseForUser(1200);
    viewport.scrollBy({ left: direction * Math.min(420, viewport.clientWidth * 0.74), behavior: "smooth" });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    pauseForUser(900);
    window.requestAnimationFrame(normalizeLoopPosition);
  };

  if (!notes.length) {
    return <p className="notes-empty">还没有小记</p>;
  }

  return (
    <div className="notes-carousel-shell">
      {canLoop ? (
        <button className="carousel-button prev" type="button" aria-label="上一组小记" onClick={() => scrollByAmount(-1)}>
          ←
        </button>
      ) : null}
      <div
        className="notes-carousel"
        ref={viewportRef}
        onWheel={handleWheel}
        onScroll={normalizeLoopPosition}
        onPointerDown={handlePointerDown}
        onPointerUp={() => pauseForUser(700)}
        onTouchStart={() => pauseForUser(1500)}
        onTouchMove={() => pauseForUser(900)}
        onTouchEnd={() => pauseForUser(700)}
      >
        <div className="notes-carousel-track">
          {displayNotes.map((note, index) => (
            <article className="duomei-note-card" key={`${note.id}-${index}`}>
              {editMode ? (
                <div className="duomei-card-actions">
                  <button type="button" onClick={() => openNoteEditor(note)}>
                    编辑
                  </button>
                  <button type="button" onClick={() => requestDelete(note.id)}>
                    删除
                  </button>
                </div>
              ) : null}
              <Link to={`/note/${note.slug}`}>
                <div className="note-card-cover">
                  <NoteCover note={note} />
                </div>
                <div className="note-card-body">
                  <div className="note-card-meta">
                    <span>{note.location}</span>
                    <time>{note.date}</time>
                  </div>
                  <h3>{note.title}</h3>
                  <p>{note.excerpt}</p>
                  <div className="note-card-foot">
                    <span>{note.tags.length} 个标签 / 文字</span>
                    <strong>→</strong>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
      {canLoop ? (
        <button className="carousel-button next" type="button" aria-label="下一组小记" onClick={() => scrollByAmount(1)}>
          →
        </button>
      ) : null}
    </div>
  );
}
