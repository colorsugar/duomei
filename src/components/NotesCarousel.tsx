import { useEffect, useMemo, useRef } from "react";
import type { PointerEvent, WheelEvent } from "react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import { NoteCover } from "./NoteCover";

export function NotesCarousel({ notes }: { notes: DuomeiNote[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef(0);
  const pauseUntilRef = useRef(0);
  const prefersReducedMotionRef = useRef(false);
  const { editMode, isEditorOpen, openNoteEditor, requestDelete } = useDuomeiEdit();
  const canLoop = notes.length > 1;
  const displayNotes = useMemo(() => (canLoop ? [...notes, ...notes, ...notes] : notes), [canLoop, notes]);

  useEffect(() => {
    prefersReducedMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const normalizeLoopPosition = () => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return;
    const groupWidth = viewport.scrollWidth / 3;
    if (groupWidth <= 0) return;
    if (viewport.scrollLeft >= groupWidth * 2) viewport.scrollLeft -= groupWidth;
    if (viewport.scrollLeft < groupWidth * 0.5) viewport.scrollLeft += groupWidth;
  };

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !canLoop) return;
    window.requestAnimationFrame(() => {
      viewport.scrollLeft = viewport.scrollWidth / 3;
    });
  }, [canLoop, notes.length]);

  useEffect(() => {
    const tick = (time: number) => {
      const viewport = viewportRef.current;
      const elapsed = lastTimeRef.current ? Math.min(32, time - lastTimeRef.current) : 16;
      lastTimeRef.current = time;

      if (
        viewport &&
        canLoop &&
        !prefersReducedMotionRef.current &&
        !editMode &&
        !isEditorOpen &&
        performance.now() > pauseUntilRef.current
      ) {
        const pixelsPerSecond = window.innerWidth <= 760 ? 74 : 62;
        viewport.scrollLeft += (pixelsPerSecond * elapsed) / 1000;
        normalizeLoopPosition();
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTimeRef.current = 0;
    };
  }, [canLoop, editMode, isEditorOpen, notes.length]);

  const pauseForUser = (duration = 900) => {
    pauseUntilRef.current = performance.now() + duration;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") pauseForUser(1200);
  };

  const scrollByAmount = (direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pauseForUser(900);
    viewport.scrollBy({ left: direction * Math.min(520, viewport.clientWidth * 0.72), behavior: "smooth" });
    window.requestAnimationFrame(normalizeLoopPosition);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    pauseForUser(700);
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
        onPointerUp={() => pauseForUser(500)}
        onTouchStart={() => pauseForUser(900)}
        onTouchMove={() => pauseForUser(500)}
        onTouchEnd={() => pauseForUser(500)}
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
