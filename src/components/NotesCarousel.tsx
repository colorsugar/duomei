import { useEffect, useMemo, useRef } from "react";
import type { MouseEvent, PointerEvent, WheelEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import {
  AnimatedCard,
  AnimatedImage,
  AnimatedParagraph,
  AnimatedTag,
  AnimatedTitle,
  clearJourneyListState,
  markSharedJourneySource,
  preloadJourneyImage,
  readJourneyListState,
  restoreJourneyWindowScroll,
  runSharedJourneyTransition,
  saveJourneyListState,
} from "../motion";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import { NoteCover } from "./NoteCover";

export function NotesCarousel({ notes }: { notes: DuomeiNote[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const hoverPausedRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const prefersReducedMotionRef = useRef(false);
  const navigate = useNavigate();
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
    if (!viewport) return;

    window.requestAnimationFrame(() => {
      const journeyState = readJourneyListState();
      if (journeyState) {
        viewport.scrollLeft = journeyState.carouselLeft;
        restoreJourneyWindowScroll(journeyState);
        clearJourneyListState();
        return;
      }

      if (canLoop) viewport.scrollLeft = viewport.scrollWidth / 3;
    });
  }, [canLoop, notes.length]);

  useEffect(() => {
    let previousTime = performance.now();

    const tick = (time: number) => {
      const viewport = viewportRef.current;
      const delta = Math.min(32, time - previousTime);
      previousTime = time;

      if (
        viewport &&
        canLoop &&
        !prefersReducedMotionRef.current &&
        !editMode &&
        !isEditorOpen &&
        !hoverPausedRef.current &&
        time > pauseUntilRef.current
      ) {
        const speed = window.innerWidth <= 760 ? 0.14 : 0.08;
        viewport.scrollLeft += delta * speed;
        normalizeLoopPosition();
      }

      frameRef.current = window.requestAnimationFrame(tick);
    };

    frameRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
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

  const openJourney = (event: MouseEvent<HTMLAnchorElement>, note: DuomeiNote) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();

    const viewport = viewportRef.current;
    const sourceCard = event.currentTarget.closest<HTMLElement>(".duomei-note-card");
    const cleanupSharedName = sourceCard ? markSharedJourneySource(sourceCard) : undefined;

    pauseForUser(1600);
    saveJourneyListState({
      carouselLeft: viewport?.scrollLeft ?? 0,
      noteId: note.id,
    });
    preloadJourneyImage(note.coverImageUrl);

    runSharedJourneyTransition(() => {
      navigate(`/note/${note.slug}`);
    });

    window.setTimeout(() => cleanupSharedName?.(), 900);
  };

  if (!notes.length) return <p className="notes-empty">还没有小记</p>;

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
        onMouseEnter={() => {
          hoverPausedRef.current = true;
        }}
        onMouseLeave={() => {
          hoverPausedRef.current = false;
        }}
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
            <AnimatedCard className="duomei-note-card" data-motion-key={`note-card-${note.id}`} key={`${note.id}-${index}`}>
              {editMode ? (
                <div className="duomei-card-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openNoteEditor(note);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      requestDelete(note.id);
                    }}
                  >
                    删除
                  </button>
                </div>
              ) : null}
              <Link to={`/note/${note.slug}`} onClick={(event) => openJourney(event, note)}>
                <AnimatedImage className="note-card-cover" data-motion-key={`note-image-${note.id}`} data-shared-journey-image>
                  <NoteCover note={note} />
                </AnimatedImage>
                <div className="note-card-body">
                  <div className="note-card-meta">
                    <AnimatedTag>{note.location}</AnimatedTag>
                    <time>{note.date}</time>
                  </div>
                  <AnimatedTitle as="h3" className="duomei-motion-card-title" data-shared-journey-title>
                    {note.title}
                  </AnimatedTitle>
                  <AnimatedParagraph>{note.excerpt}</AnimatedParagraph>
                  <div className="note-card-foot">
                    <span>{note.tags.length} 个标签 / 文字</span>
                    <strong className="duomei-motion-card-arrow">→</strong>
                  </div>
                </div>
              </Link>
            </AnimatedCard>
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
