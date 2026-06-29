import { useEffect, useMemo, useRef, useState } from "react";
import type { WheelEvent } from "react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import { NoteCover } from "./NoteCover";

export function NotesCarousel({ notes }: { notes: DuomeiNote[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const resumeTimerRef = useRef<number | null>(null);
  const scrollRemainderRef = useRef(0);
  const pauseStateRef = useRef({
    canLoop: false,
    editMode: false,
    isEditorOpen: false,
    isPaused: false,
    isUserInteracting: false,
  });
  const [isPaused, setIsPaused] = useState(false);
  const [isUserInteracting, setIsUserInteracting] = useState(false);
  const reduceMotion = useRef(false);
  const { editMode, isEditorOpen, openNoteEditor, requestDelete } = useDuomeiEdit();
  const canLoop = notes.length > 1;
  const displayNotes = useMemo(() => (canLoop ? [...notes, ...notes, ...notes] : notes), [canLoop, notes]);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useEffect(() => {
    pauseStateRef.current = { canLoop, editMode, isEditorOpen, isPaused, isUserInteracting };
  }, [canLoop, editMode, isEditorOpen, isPaused, isUserInteracting]);

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
    viewport.scrollLeft = viewport.scrollWidth / 3;
  }, [canLoop, notes.length]);

  useEffect(() => {
    const tick = () => {
      const viewport = viewportRef.current;
      const state = pauseStateRef.current;
      if (
        viewport &&
        state.canLoop &&
        !reduceMotion.current &&
        !state.editMode &&
        !state.isEditorOpen &&
        !state.isPaused &&
        !state.isUserInteracting
      ) {
        const speed = window.innerWidth <= 760 ? 0.14 : 0.32;
        scrollRemainderRef.current += speed;
        if (scrollRemainderRef.current >= 1) {
          const pixels = Math.floor(scrollRemainderRef.current);
          viewport.scrollLeft += pixels;
          scrollRemainderRef.current -= pixels;
          normalizeLoopPosition();
        }
      }
      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    };
  }, [notes.length]);

  const pauseForUser = () => {
    setIsUserInteracting(true);
    if (resumeTimerRef.current) window.clearTimeout(resumeTimerRef.current);
    resumeTimerRef.current = window.setTimeout(() => setIsUserInteracting(false), 900);
  };

  const scrollByAmount = (direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pauseForUser();
    viewport.scrollBy({ left: direction * Math.min(420, viewport.clientWidth * 0.7), behavior: "smooth" });
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    pauseForUser();
    window.requestAnimationFrame(normalizeLoopPosition);
  };

  if (!notes.length) {
    return <p className="notes-empty">还没有小记</p>;
  }

  return (
    <div
      className="notes-carousel-shell"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
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
        onPointerDown={pauseForUser}
        onTouchStart={pauseForUser}
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
