import { useEffect, useMemo, useRef } from "react";
import type { DragEvent, MouseEvent, PointerEvent, WheelEvent } from "react";
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

type CarouselDragState = {
  pointerId: number;
  startX: number;
  startY: number;
  scrollLeft: number;
  lastX: number;
  lastTime: number;
  velocity: number;
  dragging: boolean;
};

type TiltPointerState = {
  card: HTMLElement;
  clientX: number;
  clientY: number;
};

function isInteractiveCarouselTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(".duomei-card-actions, button, input, textarea, select"));
}

export function NotesCarousel({ notes }: { notes: DuomeiNote[] }) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const inertiaFrameRef = useRef<number | null>(null);
  const inertiaVelocityRef = useRef(0);
  const inertiaTimeRef = useRef(0);
  const dragRef = useRef<CarouselDragState | null>(null);
  const activeTiltCardRef = useRef<HTMLElement | null>(null);
  const activeTiltRectRef = useRef<DOMRect | null>(null);
  const pendingTiltRef = useRef<TiltPointerState | null>(null);
  const tiltFrameRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);
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
      if (inertiaFrameRef.current) window.cancelAnimationFrame(inertiaFrameRef.current);
      inertiaFrameRef.current = null;
      if (tiltFrameRef.current) window.cancelAnimationFrame(tiltFrameRef.current);
      tiltFrameRef.current = null;
    };
  }, [canLoop, editMode, isEditorOpen, notes.length]);

  const pauseForUser = (duration = 900) => {
    pauseUntilRef.current = performance.now() + duration;
  };

  const stopInertia = () => {
    if (inertiaFrameRef.current) window.cancelAnimationFrame(inertiaFrameRef.current);
    inertiaFrameRef.current = null;
    inertiaVelocityRef.current = 0;
    inertiaTimeRef.current = 0;
    viewportRef.current?.classList.remove("is-inertia-scrolling");
  };

  const resetCardTiltElement = (card: HTMLElement) => {
    card.classList.remove("is-tilting");
    card.classList.add("is-resetting-tilt");
    card.style.setProperty("--note-tilt-x", "0deg");
    card.style.setProperty("--note-tilt-y", "0deg");
    window.setTimeout(() => card.classList.remove("is-resetting-tilt"), 180);
  };

  const resetActiveCardTilt = () => {
    if (tiltFrameRef.current) window.cancelAnimationFrame(tiltFrameRef.current);
    tiltFrameRef.current = null;
    pendingTiltRef.current = null;
    activeTiltRectRef.current = null;
    if (activeTiltCardRef.current) resetCardTiltElement(activeTiltCardRef.current);
    activeTiltCardRef.current = null;
  };

  const applyCardTilt = (card: HTMLElement, clientX: number, clientY: number, rect = card.getBoundingClientRect()) => {
    const relativeX = (clientX - rect.left) / rect.width - 0.5;
    const relativeY = (clientY - rect.top) / rect.height - 0.5;
    const tiltLimit = 13;

    card.classList.add("is-tilting");
    card.classList.remove("is-resetting-tilt");
    card.style.setProperty("--note-tilt-x", `${relativeY * -tiltLimit * 2}deg`);
    card.style.setProperty("--note-tilt-y", `${relativeX * tiltLimit * 2}deg`);
  };

  const scheduleCardTilt = (card: HTMLElement, clientX: number, clientY: number) => {
    if (activeTiltCardRef.current !== card) {
      if (activeTiltCardRef.current) resetCardTiltElement(activeTiltCardRef.current);
      activeTiltCardRef.current = card;
      activeTiltRectRef.current = card.getBoundingClientRect();
    }

    pendingTiltRef.current = { card, clientX, clientY };
    if (tiltFrameRef.current) return;

    tiltFrameRef.current = window.requestAnimationFrame(() => {
      tiltFrameRef.current = null;
      const pending = pendingTiltRef.current;
      if (!pending) return;
      applyCardTilt(pending.card, pending.clientX, pending.clientY, activeTiltRectRef.current ?? undefined);
    });
  };

  const handleCarouselTilt = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== "mouse") return;
    if (prefersReducedMotionRef.current) return;

    const viewport = viewportRef.current;
    const card = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>(".duomei-note-card") : null;
    if (!viewport || !card || !viewport.contains(card)) {
      resetActiveCardTilt();
      return;
    }

    scheduleCardTilt(card, event.clientX, event.clientY);
  };

  const startInertia = (velocity: number) => {
    const viewport = viewportRef.current;
    if (!viewport || Math.abs(velocity) < 0.05) return;

    stopInertia();
    inertiaVelocityRef.current = Math.max(-2.4, Math.min(2.4, velocity));
    inertiaTimeRef.current = performance.now();
    viewport.classList.add("is-inertia-scrolling");

    const glide = (time: number) => {
      const current = viewportRef.current;
      if (!current) {
        stopInertia();
        return;
      }

      const delta = Math.min(32, time - inertiaTimeRef.current);
      inertiaTimeRef.current = time;
      current.scrollLeft -= inertiaVelocityRef.current * delta;
      normalizeLoopPosition();
      pauseForUser(260);

      inertiaVelocityRef.current *= Math.pow(0.92, delta / 16);
      if (Math.abs(inertiaVelocityRef.current) < 0.018) {
        stopInertia();
        return;
      }

      inertiaFrameRef.current = window.requestAnimationFrame(glide);
    };

    inertiaFrameRef.current = window.requestAnimationFrame(glide);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    pauseForUser(event.pointerType === "mouse" ? 2400 : 1200);
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (!event.isPrimary) return;
    if (isInteractiveCarouselTarget(event.target)) return;
    stopInertia();
    const now = performance.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scrollLeft: viewport.scrollLeft,
      lastX: event.clientX,
      lastTime: now,
      velocity: 0,
      dragging: false,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || !viewport || drag.pointerId !== event.pointerId) {
      handleCarouselTilt(event);
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.dragging && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      drag.dragging = true;
      suppressClickRef.current = true;
      viewport.classList.add("is-mouse-dragging");
      try {
        viewport.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is an enhancement for dragging beyond the carousel.
      }
      event.preventDefault();
    }
    if (!drag.dragging) {
      handleCarouselTilt(event);
      return;
    }

    event.preventDefault();
    resetActiveCardTilt();
    const now = performance.now();
    const elapsed = Math.max(1, now - drag.lastTime);
    const moveX = event.clientX - drag.lastX;
    drag.velocity = moveX / elapsed;
    drag.lastX = event.clientX;
    drag.lastTime = now;

    pauseForUser(2200);
    viewport.scrollLeft = drag.scrollLeft - deltaX;
    normalizeLoopPosition();
  };

  const handleNativeDragStart = (event: DragEvent<HTMLDivElement>) => {
    if (!isInteractiveCarouselTarget(event.target)) event.preventDefault();
  };

  const finishPointerDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const viewport = viewportRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      pauseForUser(500);
      return;
    }

    try {
      viewport?.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }

    dragRef.current = null;
    viewport?.classList.remove("is-mouse-dragging");
    pauseForUser(drag.dragging ? 2200 : 500);
    if (drag.dragging) {
      startInertia(drag.velocity);
      window.setTimeout(() => (suppressClickRef.current = false), event.pointerType === "mouse" ? 80 : 260);
    }
  };

  const scrollByAmount = (direction: 1 | -1) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    stopInertia();
    pauseForUser(900);
    viewport.scrollBy({ left: direction * Math.min(520, viewport.clientWidth * 0.72), behavior: "smooth" });
    window.requestAnimationFrame(normalizeLoopPosition);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
    pauseForUser(700);
    window.requestAnimationFrame(normalizeLoopPosition);
  };

  const openNoteDetail = (note: DuomeiNote, sourceCard?: HTMLElement | null) => {
    const viewport = viewportRef.current;
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

  const openJourney = (event: MouseEvent<HTMLAnchorElement>, note: DuomeiNote) => {
    if (suppressClickRef.current) {
      event.preventDefault();
      suppressClickRef.current = false;
      return;
    }
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    openNoteDetail(note, event.currentTarget.closest<HTMLElement>(".duomei-note-card"));
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
          resetActiveCardTilt();
        }}
        onWheel={handleWheel}
        onDragStart={handleNativeDragStart}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerDrag}
        onPointerCancel={finishPointerDrag}
        onLostPointerCapture={() => {
          dragRef.current = null;
          viewportRef.current?.classList.remove("is-mouse-dragging");
        }}
        onTouchStart={() => pauseForUser(900)}
        onTouchMove={() => pauseForUser(500)}
        onTouchEnd={() => pauseForUser(500)}
        onScroll={normalizeLoopPosition}
      >
        <div className="notes-carousel-track">
          {displayNotes.map((note, index) => (
            <AnimatedCard
              className="duomei-note-card"
              data-motion-key={`note-card-${note.id}`}
              key={`${note.id}-${index}`}
            >
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
              <Link draggable={false} to={`/note/${note.slug}`} onClick={(event) => openJourney(event, note)}>
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
