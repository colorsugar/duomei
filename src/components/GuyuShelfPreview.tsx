import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from "react";
import { useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { guyuBooks, type GuyuBook } from "../content/guyuBooks";
import {
  GUYU_ASSEMBLE_FALLBACK_MS,
  GUYU_CAROUSEL_DWELL_MS,
  GUYU_FRAGMENT_ASSEMBLE_MS,
  GUYU_FRAGMENT_HOLD_MS,
  GUYU_FRAGMENT_SCATTER_MS,
  GUYU_SCATTER_FALLBACK_MS,
  GUYU_SETTLE_FALLBACK_MS,
  getGuyuSwipeDirection,
  wrapGuyuCarouselIndex,
  type GuyuCarouselDirection,
} from "../lib/guyuCarousel";
import { HomeSectionHold } from "./HomeSectionHold";

type TransitionPhase = "idle" | "scatter" | "assemble" | "settle";

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  lastX: number;
  lastTime: number;
  velocityX: number;
  dragging: boolean;
};

type FragmentStyle = CSSProperties & {
  "--guyu-fragment-x": string;
  "--guyu-fragment-y": string;
  "--guyu-fragment-rotation": string;
  "--guyu-fragment-delay": string;
};

type CarouselStyle = CSSProperties & {
  "--guyu-fragment-accent": string;
};

const FRAGMENT_COLUMNS = 4;
const FRAGMENT_ROWS = 4;
const TRANSITION_SENTINEL_INDEX = 3;
const TRANSITION_DURATION_TOLERANCE_MS = 24;
const FRAGMENTS = Array.from({ length: FRAGMENT_COLUMNS * FRAGMENT_ROWS }, (_, index) => {
  const column = index % FRAGMENT_COLUMNS;
  const row = Math.floor(index / FRAGMENT_COLUMNS);
  return {
    column,
    index,
    position: `${(column / (FRAGMENT_COLUMNS - 1)) * 100}% ${(row / (FRAGMENT_ROWS - 1)) * 100}%`,
    rotation: ((index * 11) % 25) - 12,
    row,
    x: (column - 1.5) * 24 + ((index * 7) % 9) - 4,
    y: (row - 1.5) * 21 + ((index * 5) % 7) - 3,
  };
});

function getBookLabels(book: GuyuBook) {
  return {
    section: book.chapter === "新说" ? "新说" : "故语",
    shelf: book.kind,
  };
}

function BookCopy({ book, incoming = false }: { book: GuyuBook; incoming?: boolean }) {
  const labels = getBookLabels(book);
  return (
    <span className={`guyu-home-work-copy${incoming ? " is-incoming" : " is-current"}`} aria-hidden={incoming}>
      <span className="guyu-home-work-kind">{labels.section} · {labels.shelf}</span>
      <strong className="guyu-title-phrases" aria-label={book.title}>
        {book.title.split(/\s+/u).map((part) => <span key={part}>{part}</span>)}
      </strong>
      <span>{book.description}</span>
      <span className="guyu-home-work-open">翻开这一本</span>
    </span>
  );
}

export function GuyuShelfPreview() {
  const reducedMotion = useReducedMotion() ?? false;
  const baseImageRef = useRef<HTMLImageElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const currentIndexRef = useRef(0);
  const cycleTokenRef = useRef(0);
  const incomingIndexRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const phaseFallbackRef = useRef<number | null>(null);
  const phaseRafRef = useRef<number | null>(null);
  const phaseStartedAtRef = useRef(0);
  const scatterQueuedRef = useRef(false);
  const suppressClickRef = useRef(false);
  const transitionPhaseRef = useRef<TransitionPhase>("idle");
  const [bookIndex, setBookIndex] = useState(0);
  const [incomingIndex, setIncomingIndex] = useState<number | null>(null);
  const [transitionDirection, setTransitionDirection] = useState<GuyuCarouselDirection>(1);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [isInView, setIsInView] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [isFocusPaused, setIsFocusPaused] = useState(false);
  const [isUserPaused, setIsUserPaused] = useState(false);
  const bookCount = guyuBooks.length;
  const book = guyuBooks[bookIndex] ?? guyuBooks[0];
  const incomingBook = incomingIndex === null ? null : guyuBooks[incomingIndex] ?? null;
  const indicatedIndex = incomingIndex ?? bookIndex;

  const clearPhaseFallback = useCallback(() => {
    if (phaseFallbackRef.current !== null) window.clearTimeout(phaseFallbackRef.current);
    phaseFallbackRef.current = null;
  }, []);

  const clearPhaseRaf = useCallback(() => {
    if (phaseRafRef.current !== null) window.cancelAnimationFrame(phaseRafRef.current);
    phaseRafRef.current = null;
  }, []);

  const finishSettle = useCallback((cycleToken: number, phaseStartedAt: number) => {
    if (
      cycleTokenRef.current !== cycleToken ||
      transitionPhaseRef.current !== "settle" ||
      phaseStartedAtRef.current !== phaseStartedAt
    ) return;
    clearPhaseFallback();
    clearPhaseRaf();
    incomingIndexRef.current = null;
    transitionPhaseRef.current = "idle";
    phaseStartedAtRef.current = performance.now();
    setIncomingIndex(null);
    setTransitionPhase("idle");
  }, [clearPhaseFallback, clearPhaseRaf]);

  const beginSettle = useCallback((cycleToken: number) => {
    if (
      cycleTokenRef.current !== cycleToken ||
      transitionPhaseRef.current !== "assemble" ||
      incomingIndexRef.current === null
    ) return;
    clearPhaseFallback();
    const completedIndex = incomingIndexRef.current;
    const phaseStartedAt = performance.now();
    currentIndexRef.current = completedIndex;
    transitionPhaseRef.current = "settle";
    phaseStartedAtRef.current = phaseStartedAt;
    setBookIndex(completedIndex);
    setTransitionPhase("settle");
    phaseFallbackRef.current = window.setTimeout(
      () => finishSettle(cycleToken, phaseStartedAt),
      GUYU_SETTLE_FALLBACK_MS,
    );
  }, [clearPhaseFallback, finishSettle]);

  const beginAssembly = useCallback((cycleToken: number) => {
    if (cycleTokenRef.current !== cycleToken || transitionPhaseRef.current !== "scatter") return;
    clearPhaseFallback();
    scatterQueuedRef.current = false;
    transitionPhaseRef.current = "assemble";
    phaseStartedAtRef.current = performance.now();
    setTransitionPhase("assemble");
    phaseFallbackRef.current = window.setTimeout(
      () => beginSettle(cycleToken),
      GUYU_ASSEMBLE_FALLBACK_MS,
    );
  }, [beginSettle, clearPhaseFallback]);

  const queueAssembly = useCallback((cycleToken: number) => {
    if (
      cycleTokenRef.current !== cycleToken ||
      transitionPhaseRef.current !== "scatter" ||
      scatterQueuedRef.current
    ) return;
    clearPhaseFallback();
    scatterQueuedRef.current = true;
    phaseFallbackRef.current = window.setTimeout(
      () => beginAssembly(cycleToken),
      GUYU_FRAGMENT_HOLD_MS,
    );
  }, [beginAssembly, clearPhaseFallback]);

  const goToBook = useCallback((requestedIndex: number, direction: GuyuCarouselDirection) => {
    const targetIndex = wrapGuyuCarouselIndex(requestedIndex, bookCount);
    if (bookCount < 2 || targetIndex === currentIndexRef.current || transitionPhaseRef.current !== "idle") return;

    clearPhaseFallback();
    clearPhaseRaf();
    const cycleToken = cycleTokenRef.current + 1;
    cycleTokenRef.current = cycleToken;
    scatterQueuedRef.current = false;
    if (reducedMotion) {
      currentIndexRef.current = targetIndex;
      incomingIndexRef.current = null;
      transitionPhaseRef.current = "idle";
      phaseStartedAtRef.current = performance.now();
      setBookIndex(targetIndex);
      setIncomingIndex(null);
      setTransitionPhase("idle");
      return;
    }

    transitionPhaseRef.current = "scatter";
    phaseStartedAtRef.current = performance.now();
    incomingIndexRef.current = targetIndex;
    setTransitionDirection(direction);
    setIncomingIndex(targetIndex);
    setTransitionPhase("scatter");
    phaseFallbackRef.current = window.setTimeout(
      () => queueAssembly(cycleToken),
      GUYU_SCATTER_FALLBACK_MS,
    );
  }, [bookCount, clearPhaseFallback, clearPhaseRaf, queueAssembly, reducedMotion]);

  const moveBy = useCallback((direction: GuyuCarouselDirection) => {
    goToBook(currentIndexRef.current + direction, direction);
  }, [goToBook]);

  const handleFragmentTransitionEnd = useCallback((event: ReactTransitionEvent<HTMLSpanElement>) => {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    const cycleToken = cycleTokenRef.current;
    const elapsed = performance.now() - phaseStartedAtRef.current;
    const cssElapsed = event.elapsedTime * 1_000;
    if (transitionPhaseRef.current === "scatter") {
      if (
        elapsed < GUYU_FRAGMENT_SCATTER_MS ||
        Math.abs(cssElapsed - GUYU_FRAGMENT_SCATTER_MS) > TRANSITION_DURATION_TOLERANCE_MS
      ) return;
      queueAssembly(cycleToken);
      return;
    }
    if (
      transitionPhaseRef.current === "assemble" &&
      elapsed >= GUYU_FRAGMENT_ASSEMBLE_MS &&
      Math.abs(cssElapsed - GUYU_FRAGMENT_ASSEMBLE_MS) <= TRANSITION_DURATION_TOLERANCE_MS
    ) {
      beginSettle(cycleToken);
    }
  }, [beginSettle, queueAssembly]);

  useEffect(() => () => {
    cycleTokenRef.current += 1;
    clearPhaseFallback();
    clearPhaseRaf();
  }, [clearPhaseFallback, clearPhaseRaf]);

  useEffect(() => {
    if (transitionPhase !== "settle") return;
    const cycleToken = cycleTokenRef.current;
    const phaseStartedAt = phaseStartedAtRef.current;
    const image = baseImageRef.current;
    if (!image || typeof image.decode !== "function") return;

    void image.decode().then(() => {
      if (
        cycleTokenRef.current !== cycleToken ||
        transitionPhaseRef.current !== "settle" ||
        phaseStartedAtRef.current !== phaseStartedAt
      ) return;
      phaseRafRef.current = window.requestAnimationFrame(() => {
        if (
          cycleTokenRef.current !== cycleToken ||
          transitionPhaseRef.current !== "settle" ||
          phaseStartedAtRef.current !== phaseStartedAt
        ) return;
        phaseRafRef.current = window.requestAnimationFrame(() => finishSettle(cycleToken, phaseStartedAt));
      });
    }).catch(() => {
      // Keep the decoded incoming fragments visible until the guarded settle fallback.
    });

    return clearPhaseRaf;
  }, [bookIndex, clearPhaseRaf, finishSettle, transitionPhase]);

  useEffect(() => {
    guyuBooks.forEach((candidate) => {
      const image = new Image();
      image.decoding = "async";
      image.src = candidate.previewCoverSrc;
      if (typeof image.decode === "function") void image.decode().catch(() => undefined);
    });
  }, []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setIsInView(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => setIsDocumentVisible(document.visibilityState === "visible");
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (
      reducedMotion ||
      bookCount < 2 ||
      transitionPhase !== "idle" ||
      !isInView ||
      !isDocumentVisible ||
      isHoverPaused ||
      isFocusPaused ||
      isUserPaused
    ) return;

    const timer = window.setTimeout(() => moveBy(1), GUYU_CAROUSEL_DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [
    bookCount,
    bookIndex,
    isDocumentVisible,
    isFocusPaused,
    isHoverPaused,
    isInView,
    isUserPaused,
    moveBy,
    reducedMotion,
    transitionPhase,
  ]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    if (!event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: performance.now(),
      velocityX: 0,
      dragging: false,
    };
  };

  const setDragOffset = (value: number) => {
    carouselRef.current?.style.setProperty("--guyu-drag-x", `${value}px`);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLAnchorElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;

    if (!drag.dragging && Math.abs(deltaY) > 8 && Math.abs(deltaY) > Math.abs(deltaX)) {
      dragRef.current = null;
      setDragOffset(0);
      return;
    }
    if (!drag.dragging && Math.abs(deltaX) > 8 && Math.abs(deltaX) > Math.abs(deltaY)) {
      drag.dragging = true;
      suppressClickRef.current = true;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional when the gesture remains inside the card.
      }
    }
    if (!drag.dragging) return;

    event.preventDefault();
    const now = performance.now();
    drag.velocityX = (event.clientX - drag.lastX) / Math.max(1, now - drag.lastTime);
    drag.lastX = event.clientX;
    drag.lastTime = now;
    setDragOffset(Math.max(-32, Math.min(32, deltaX * 0.22)));
  };

  const finishPointer = (event: ReactPointerEvent<HTMLAnchorElement>, cancelled = false) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may have released capture after a native vertical scroll.
    }
    dragRef.current = null;
    setDragOffset(0);
    if (!drag.dragging) return;

    suppressClickRef.current = true;
    if (!cancelled) {
      const direction = getGuyuSwipeDirection({
        deltaX: event.clientX - drag.startX,
        deltaY: event.clientY - drag.startY,
        velocityX: drag.velocityX,
      });
      if (direction) moveBy(direction);
    }
    window.setTimeout(() => {
      suppressClickRef.current = false;
    }, event.pointerType === "mouse" ? 80 : 260);
  };

  const handleKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveBy(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === "Home") {
      event.preventDefault();
      goToBook(0, -1);
    } else if (event.key === "End") {
      event.preventDefault();
      goToBook(bookCount - 1, 1);
    }
  };

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsFocusPaused(false);
  };

  if (!book) return null;
  const targetAccent = incomingBook?.previewAccent ?? book.previewAccent;
  const carouselStyle = {
    "--guyu-fragment-accent": targetAccent,
  } as CarouselStyle;

  return (
    <HomeSectionHold id="guyu" className="guyu-home-shelf" ariaLabelledBy="guyu-home-shelf-title">
      <header className="guyu-home-shelf-heading">
        <h2 id="guyu-home-shelf-title">故语</h2>
        <p>把旧日收好，等后来的人翻阅。</p>
      </header>

      <div
        ref={carouselRef}
        className="guyu-home-carousel"
        data-phase={transitionPhase}
        style={carouselStyle}
        role="region"
        aria-roledescription="轮播"
        aria-label="故语书目"
        tabIndex={0}
        onKeyDown={handleKeyboard}
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocusCapture={() => setIsFocusPaused(true)}
        onBlurCapture={handleBlur}
      >
        <div className="guyu-home-carousel-controls">
          <button
            className="guyu-home-rotation-control"
            type="button"
            aria-label={isUserPaused ? "继续自动切换" : "暂停自动切换"}
            onClick={() => {
              setIsUserPaused((paused) => {
                if (paused) setIsFocusPaused(false);
                return !paused;
              });
            }}
          >
            <span aria-hidden="true">{isUserPaused ? "▶" : "Ⅱ"}</span>
          </button>
          <nav className="guyu-home-dots" aria-label="选择故语封面">
            {guyuBooks.map((candidate, index) => (
              <button
                key={candidate.id}
                type="button"
                aria-label={`查看第 ${index + 1} 本《${candidate.title}》`}
                aria-current={indicatedIndex === index ? "true" : undefined}
                onClick={() => {
                  const current = currentIndexRef.current;
                  const forward = wrapGuyuCarouselIndex(index - current, bookCount);
                  const backward = wrapGuyuCarouselIndex(current - index, bookCount);
                  goToBook(index, forward <= backward ? 1 : -1);
                }}
              >
                <span />
              </button>
            ))}
          </nav>
        </div>

        <Link
          className="guyu-home-work"
          to="/guyu"
          aria-label={`前往故语书架，查看${getBookLabels(book).section}《${book.title}》`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={(event) => finishPointer(event)}
          onPointerCancel={(event) => finishPointer(event, true)}
          onClick={(event) => {
            if (!suppressClickRef.current) return;
            event.preventDefault();
            event.stopPropagation();
            suppressClickRef.current = false;
          }}
        >
          <span className="guyu-home-book" aria-hidden="true">
            <img
              ref={baseImageRef}
              className="guyu-home-book-base"
              src={book.previewCoverSrc}
              width="1100"
              height="1684"
              decoding="async"
              alt=""
            />
            <span className="guyu-home-fragment-grid">
              {FRAGMENTS.map((fragment) => {
                const fragmentStyle = {
                  "--guyu-fragment-x": `${fragment.x * transitionDirection}px`,
                  "--guyu-fragment-y": `${fragment.y}px`,
                  "--guyu-fragment-rotation": `${fragment.rotation * transitionDirection}deg`,
                  "--guyu-fragment-delay": `${((fragment.row + fragment.column) % 4) * 24}ms`,
                } as FragmentStyle;
                const imageStyle = {
                  backgroundPosition: fragment.position,
                  backgroundImage: `url("${book.previewCoverSrc}")`,
                };
                const incomingStyle = incomingBook ? {
                  backgroundPosition: fragment.position,
                  backgroundImage: `url("${incomingBook.previewCoverSrc}")`,
                } : undefined;
                return (
                  <span
                    className="guyu-home-fragment"
                    key={fragment.index}
                    style={fragmentStyle}
                    onTransitionEnd={fragment.index === TRANSITION_SENTINEL_INDEX ? handleFragmentTransitionEnd : undefined}
                  >
                    <span className="guyu-home-fragment-image is-current" style={imageStyle} />
                    {incomingStyle ? <span className="guyu-home-fragment-image is-incoming" style={incomingStyle} /> : null}
                    <span className="guyu-home-fragment-tint" />
                  </span>
                );
              })}
            </span>
          </span>

          <span className="guyu-home-copy-stack">
            <BookCopy book={book} />
            {incomingBook ? <BookCopy book={incomingBook} incoming /> : null}
          </span>
        </Link>

        <p
          className="guyu-visually-hidden"
          aria-live={isUserPaused || isFocusPaused ? "polite" : "off"}
          aria-atomic="true"
        >
          第 {bookIndex + 1} 本，共 {bookCount} 本：{book.title}
        </p>
      </div>

      <p className="guyu-home-shelf-note">有些话，只适合留在纸页之间。</p>
    </HomeSectionHold>
  );
}
