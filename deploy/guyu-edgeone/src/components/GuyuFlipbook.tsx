import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { useReducedMotion } from "framer-motion";
import HTMLFlipBook from "react-pageflip";
import { formatGuyuPageNumber } from "../content/guyuBooks";
import type { GuyuBook, GuyuLogicalPage } from "../content/guyuBooks";

type PageFlipController = {
  destroy: () => void;
  flipNext: (corner?: "top" | "bottom") => void;
  flipPrev: (corner?: "top" | "bottom") => void;
  getCurrentPageIndex: () => number;
  turnToPage: (page: number) => void;
};

type PageFlipRef = {
  pageFlip: () => PageFlipController | undefined;
};

type FlipEvent = {
  data: number | { page?: number } | string;
};

type PageWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
};

type PageLoadContextValue = {
  activePages: ReadonlySet<number>;
  retryEpoch: number;
  onPageReady: (index: number) => void;
  onPageError: (index: number) => void;
  onPageReleased: (index: number) => void;
};

const PageLoadContext = createContext<PageLoadContextValue | null>(null);
const FLIP_TIME = 600;
const LOAD_TIMEOUT = 15_000;
const NATIVE_TOUCH_DELAY = 250;

function withRetry(src: string, retryEpoch: number) {
  if (retryEpoch === 0) return src;
  return `${src}${src.includes("?") ? "&" : "?"}assetRetry=${retryEpoch}`;
}

const GuyuFlipPage = forwardRef<HTMLDivElement, {
  bookTitle: string;
  index: number;
  lastIndex: number;
  page: GuyuLogicalPage;
}>(function GuyuFlipPage({ bookTitle, index, lastIndex, page }, ref) {
  const loading = useContext(PageLoadContext);
  if (!loading) throw new Error("Guyu page loader is missing");

  const isBlank = page.placement === "blank";
  const isActive = isBlank || loading.activePages.has(index);
  const imageSrc = page.src && isActive ? withRetry(page.src, loading.retryEpoch) : null;
  const expectedSrcRef = useRef<string | null>(imageSrc);
  expectedSrcRef.current = imageSrc;

  useEffect(() => {
    if (!isActive && !isBlank) loading.onPageReleased(index);
  }, [index, isActive, isBlank, loading]);

  const image = imageSrc ? (
    <img
      src={imageSrc}
      alt={page.sourcePage === null
        ? ""
        : `《${bookTitle}》${index === 0 ? "封面" : index === lastIndex ? "封底" : `第 ${index} 页`}：${page.description}`}
      loading="eager"
      decoding="async"
      draggable={false}
      fetchPriority={index <= 5 ? "high" : "auto"}
      onLoad={(event) => {
        const element = event.currentTarget;
        const loadedSrc = element.getAttribute("src");
        let completed = false;
        const finish = () => {
          if (completed) return;
          completed = true;
          if (!loadedSrc || expectedSrcRef.current !== loadedSrc) return;
          loading.onPageReady(index);
        };
        if (typeof element.decode === "function") {
          void element.decode().then(finish).catch(() => {
            if (loadedSrc && expectedSrcRef.current === loadedSrc) loading.onPageError(index);
          });
        } else {
          finish();
        }
      }}
      onError={(event) => {
        if (expectedSrcRef.current === event.currentTarget.getAttribute("src")) loading.onPageError(index);
      }}
    />
  ) : null;

  return (
    <div
      ref={ref}
      className={`guyu-flip-page is-${page.placement}`}
      data-density="hard"
      data-logical-page={index}
    >
      {isBlank ? (
        <div className="guyu-flip-paper" aria-hidden="true" />
      ) : page.placement === "spread-left" || page.placement === "spread-right" ? (
        <div className="guyu-spread-crop">
          <div className="guyu-spread-canvas">{image}</div>
        </div>
      ) : page.placement === "stacked-top" || page.placement === "stacked-bottom" ? (
        <div className="guyu-stacked-crop">
          <div className="guyu-stacked-half">{image}</div>
        </div>
      ) : (
        <div className="guyu-flip-page-image">
          {image ?? <span className="guyu-flip-page-placeholder" aria-hidden="true" />}
        </div>
      )}
    </div>
  );
});

GuyuFlipPage.displayName = "GuyuFlipPage";

function eventPage(event: FlipEvent) {
  if (typeof event.data === "number") return event.data;
  if (typeof event.data === "string") return Number.parseInt(event.data, 10) || 0;
  return event.data.page ?? 0;
}

function pageWindow(center: number, lastIndex: number) {
  const pages = new Set<number>();
  for (let index = Math.max(0, center - 3); index <= Math.min(lastIndex, center + 4); index += 1) {
    pages.add(index);
  }
  return pages;
}

function turnLoadWindow(current: number, direction: -1 | 1, lastIndex: number) {
  const pages = new Set<number>([current]);
  for (let step = 1; step <= 3; step += 1) {
    const index = current + direction * step;
    if (index >= 0 && index <= lastIndex) pages.add(index);
  }
  if (current + 1 <= lastIndex) pages.add(current + 1);
  return [...pages];
}

function visiblePagesAfterTurn(current: number, direction: -1 | 1, lastIndex: number) {
  if ((direction < 0 && current <= 0) || (direction > 0 && current >= lastIndex)) return [];
  const target = direction > 0
    ? Math.min(lastIndex, current === 0 ? 1 : current + 2)
    : Math.max(0, current <= 1 ? 0 : current - 2);
  if (target === 0 || target === lastIndex) return [target];
  return [target, Math.min(lastIndex - 1, target + 1)];
}

export function GuyuFlipbook({
  book,
  onOpenChange,
}: {
  book: GuyuBook;
  onOpenChange?: (isOpen: boolean) => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const lastIndex = book.logicalPages.length - 1;
  const initialActivePages = useMemo(() => pageWindow(0, lastIndex), [lastIndex]);
  const [activePages, setActivePages] = useState<Set<number>>(initialActivePages);
  const [pageIndex, setPageIndex] = useState(0);
  const [bookPosition, setBookPosition] = useState<"start" | "open" | "end">("start");
  const [coverReady, setCoverReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<"idle" | "loading" | "flipping">("idle");
  const [loadError, setLoadError] = useState("");
  const [retryEpoch, setRetryEpoch] = useState(0);
  const [loadedRevision, setLoadedRevision] = useState(0);
  const flipbookRef = useRef<PageFlipRef | null>(null);
  const controllerRef = useRef<PageFlipController | undefined>(undefined);
  const activePagesRef = useRef<Set<number>>(initialActivePages);
  const loadedPagesRef = useRef(new Set<number>());
  const waitersRef = useRef(new Map<number, Set<PageWaiter>>());
  const requestIdRef = useRef(0);
  const busyRef = useRef(false);
  const fallbackTimerRef = useRef<number | undefined>(undefined);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const resolveWaiters = useCallback((index: number) => {
    const waiters = waitersRef.current.get(index);
    if (!waiters) return;
    waiters.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.resolve();
    });
    waitersRef.current.delete(index);
  }, []);

  const rejectWaiters = useCallback((index: number, message: string) => {
    const waiters = waitersRef.current.get(index);
    if (!waiters) return;
    waiters.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.reject(new Error(message));
    });
    waitersRef.current.delete(index);
  }, []);

  const onPageReady = useCallback((index: number) => {
    loadedPagesRef.current.add(index);
    setLoadedRevision((value) => value + 1);
    if (index === 0) setCoverReady(true);
    resolveWaiters(index);
  }, [resolveWaiters]);

  const onPageError = useCallback((index: number) => {
    loadedPagesRef.current.delete(index);
    setLoadedRevision((value) => value + 1);
    setLoadError("页面没有载入，请再点一次。");
    rejectWaiters(index, "这一页没有载入");
  }, [rejectWaiters]);

  const onPageReleased = useCallback((index: number) => {
    loadedPagesRef.current.delete(index);
    setLoadedRevision((value) => value + 1);
  }, []);

  const loadingContext = useMemo<PageLoadContextValue>(() => ({
    activePages,
    retryEpoch,
    onPageReady,
    onPageError,
    onPageReleased,
  }), [activePages, onPageError, onPageReady, onPageReleased, retryEpoch]);

  const setActiveWindow = useCallback((center: number) => {
    const next = pageWindow(center, lastIndex);
    activePagesRef.current = next;
    setActivePages(next);
  }, [lastIndex]);

  const waitForPage = useCallback((index: number, wasActive: boolean) => {
    const page = book.logicalPages[index];
    if (!page || page.placement === "blank") return Promise.resolve();
    if (wasActive && loadedPagesRef.current.has(index)) return Promise.resolve();
    loadedPagesRef.current.delete(index);

    return new Promise<void>((resolve, reject) => {
      const waiter: PageWaiter = {
        resolve,
        reject,
        timeoutId: window.setTimeout(() => {
          const waiters = waitersRef.current.get(index);
          waiters?.delete(waiter);
          if (waiters?.size === 0) waitersRef.current.delete(index);
          reject(new Error("图片载入超时"));
        }, LOAD_TIMEOUT),
      };
      const waiters = waitersRef.current.get(index) ?? new Set<PageWaiter>();
      waiters.add(waiter);
      waitersRef.current.set(index, waiters);
    });
  }, [book.logicalPages]);

  const ensurePages = useCallback((indices: number[], replace = false) => {
    const previous = activePagesRef.current;
    const wasActive = new Map(indices.map((index) => [index, previous.has(index)]));
    const next = replace ? new Set<number>() : new Set(previous);
    indices.forEach((index) => next.add(index));
    activePagesRef.current = next;
    setActivePages(next);
    return Promise.all(indices.map((index) => waitForPage(index, wasActive.get(index) ?? false)));
  }, [waitForPage]);

  const finishInteraction = useCallback(() => {
    if (fallbackTimerRef.current !== undefined) window.clearTimeout(fallbackTimerRef.current);
    busyRef.current = false;
    setBusy(false);
    setPhase("idle");
  }, []);

  const onFlip = useCallback((event: FlipEvent) => {
    const nextPage = Math.min(lastIndex, Math.max(0, eventPage(event)));
    setPageIndex(nextPage);
    setBookPosition(nextPage === 0 ? "start" : nextPage >= lastIndex ? "end" : "open");
    setLoadError("");
    setActiveWindow(nextPage);
    finishInteraction();
  }, [finishInteraction, lastIndex, setActiveWindow]);

  const onInit = useCallback((event: FlipEvent) => {
    controllerRef.current = flipbookRef.current?.pageFlip();
    onFlip(event);
  }, [onFlip]);

  const onChangeState = useCallback((event: FlipEvent) => {
    if (event.data === "read") finishInteraction();
  }, [finishInteraction]);

  const requestTurn = useCallback(async (direction: -1 | 1) => {
    if (busyRef.current) return;
    const controller = flipbookRef.current?.pageFlip();
    if (!controller) return;
    const current = controller.getCurrentPageIndex();
    if ((direction < 0 && current <= 0) || (direction > 0 && current >= lastIndex)) return;

    busyRef.current = true;
    setBusy(true);
    setPhase("loading");
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    const required = turnLoadWindow(current, direction, lastIndex);

    if (loadError) {
      activePagesRef.current.forEach((index) => loadedPagesRef.current.delete(index));
      setRetryEpoch((value) => value + 1);
    }
    setLoadError("");

    try {
      await ensurePages(required);
      if (requestIdRef.current !== requestId) return;
      setPhase("flipping");
      if (reduceMotion) {
        const target = direction > 0
          ? Math.min(lastIndex, current === 0 ? 1 : current + 2)
          : Math.max(0, current <= 1 ? 0 : current - 2);
        controller.turnToPage(target);
        setPageIndex(target);
        setBookPosition(target === 0 ? "start" : target >= lastIndex ? "end" : "open");
        setActiveWindow(target);
        finishInteraction();
        return;
      }

      if (direction > 0 && current === 0) setBookPosition("open");
      else if (direction > 0 && current >= lastIndex - 2) setBookPosition("end");
      else if (direction < 0 && current >= lastIndex) setBookPosition("open");
      else if (direction < 0 && current <= 2) setBookPosition("start");

      if (direction > 0) controller.flipNext("top");
      else controller.flipPrev("top");
      fallbackTimerRef.current = window.setTimeout(finishInteraction, FLIP_TIME + 600);
    } catch {
      if (requestIdRef.current !== requestId) return;
      setLoadError("页面没有载入，请再点一次。");
      finishInteraction();
    }
  }, [ensurePages, finishInteraction, lastIndex, loadError, reduceMotion, setActiveWindow]);

  const nativeTouchReady = useMemo(() => {
    if (busy || loadError) return false;
    const required = [
      ...visiblePagesAfterTurn(pageIndex, -1, lastIndex),
      ...visiblePagesAfterTurn(pageIndex, 1, lastIndex),
    ];
    return required.every((index) => {
      const page = book.logicalPages[index];
      return page?.placement === "blank" || loadedPagesRef.current.has(index);
    });
  }, [book.logicalPages, busy, lastIndex, loadError, loadedRevision, pageIndex]);

  const onBookTouchStart = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    if (event.touches.length !== 1) {
      touchStartRef.current = null;
      return;
    }
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: performance.now() };
  }, []);

  const onBookTouchEnd = useCallback((event: ReactTouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || busyRef.current) return;
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const duration = performance.now() - start.time;
    const horizontalSwipe = Math.abs(dx) >= 30 && Math.abs(dy) < 60;
    if (horizontalSwipe) {
      if (!nativeTouchReady) void requestTurn(dx < 0 ? 1 : -1);
      return;
    }
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
    if (nativeTouchReady ? duration >= NATIVE_TOUCH_DELAY : duration > 500) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    void requestTurn(pageIndex === 0 || touch.clientX >= bounds.left + bounds.width / 2 ? 1 : -1);
  }, [nativeTouchReady, pageIndex, requestTurn]);

  const jumpToPage = useCallback(async (target: number) => {
    if (busyRef.current) return;
    const controller = flipbookRef.current?.pageFlip();
    if (!controller) return;
    busyRef.current = true;
    setBusy(true);
    setPhase("loading");
    setLoadError("");
    const required = target === 0
      ? [0, 1, 2].filter((index) => index <= lastIndex)
      : [Math.max(0, target - 1), target];
    const current = controller.getCurrentPageIndex();
    const visibleCurrent = [current, current + 1].filter((index) => index <= lastIndex);
    try {
      await ensurePages([...new Set([...visibleCurrent, ...required])], true);
      controller.turnToPage(target);
      setPageIndex(target);
      setBookPosition(target === 0 ? "start" : target >= lastIndex ? "end" : "open");
      setActiveWindow(target);
      finishInteraction();
    } catch {
      setLoadError("页面没有载入，请再试一次。");
      finishInteraction();
    }
  }, [ensurePages, finishInteraction, lastIndex, setActiveWindow]);

  useEffect(() => {
    onOpenChange?.(pageIndex > 0);
  }, [onOpenChange, pageIndex]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, button, a, [contenteditable='true']")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        void requestTurn(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void requestTurn(1);
      } else if (event.key === "Home") {
        event.preventDefault();
        void jumpToPage(0);
      } else if (event.key === "End") {
        event.preventDefault();
        void jumpToPage(lastIndex);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [jumpToPage, lastIndex, requestTurn]);

  useEffect(() => () => {
    requestIdRef.current += 1;
    if (fallbackTimerRef.current !== undefined) window.clearTimeout(fallbackTimerRef.current);
    waitersRef.current.forEach((waiters) => waiters.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.reject(new Error("画册已关闭"));
    }));
    waitersRef.current.clear();
    if (import.meta.env.PROD) {
      try {
        controllerRef.current?.destroy();
      } catch {
        // The document may already be leaving; cleanup is best-effort.
      }
    }
  }, []);

  const statusText = formatGuyuPageNumber(pageIndex, book.logicalPages.length);
  const visibleStatus = loadError || (phase === "loading" ? "正在载入下一页…" : phase === "flipping" ? "正在翻页…" : statusText);

  return (
    <PageLoadContext.Provider value={loadingContext}>
      <section className="guyu-flipbook" aria-label={`翻阅《${book.title}》`} aria-busy={busy}>
        <div
          className={`guyu-pageflip-shell is-${bookPosition}${nativeTouchReady ? " is-touch-ready" : ""}`}
          onTouchStart={onBookTouchStart}
          onTouchEnd={onBookTouchEnd}
          onTouchCancel={() => {
            touchStartRef.current = null;
          }}
        >
          <HTMLFlipBook
            ref={flipbookRef}
            className="guyu-pageflip"
            style={{}}
            startPage={0}
            size="stretch"
            width={1100}
            height={1684}
            minWidth={120}
            maxWidth={550}
            minHeight={184}
            maxHeight={842}
            drawShadow
            flippingTime={reduceMotion ? 160 : FLIP_TIME}
            usePortrait={false}
            startZIndex={1}
            autoSize
            maxShadowOpacity={0.48}
            showCover
            mobileScrollSupport={false}
            clickEventForward={false}
            useMouseEvents
            swipeDistance={30}
            showPageCorners={false}
            disableFlipByClick={false}
            renderOnlyPageLengthChange
            onFlip={onFlip}
            onChangeState={onChangeState}
            onInit={onInit}
          >
            {book.logicalPages.map((page, index) => (
              <GuyuFlipPage
                key={page.id}
                page={page}
                index={index}
                lastIndex={lastIndex}
                bookTitle={book.title}
              />
            ))}
          </HTMLFlipBook>

          <button
            className="guyu-page-zone is-previous"
            type="button"
            aria-label={pageIndex === 0 ? "翻开画册" : "上一页"}
            disabled={busy || (pageIndex === 0 && !coverReady && !loadError)}
            onClick={() => void requestTurn(pageIndex === 0 ? 1 : -1)}
          />
          <button
            className="guyu-page-zone is-next"
            type="button"
            aria-label="下一页"
            disabled={busy || (!coverReady && !loadError) || pageIndex >= lastIndex}
            onClick={() => void requestTurn(1)}
          />
        </div>

        <p className="guyu-book-status guyu-visually-hidden" aria-live="polite" aria-atomic="true">
          {visibleStatus}
        </p>
        {pageIndex > 0 || busy ? <nav className="guyu-book-controls" aria-label="画册翻页">
          <button
            className="guyu-turn-button"
            type="button"
            disabled={busy || pageIndex === 0}
            aria-label="上一页"
            onClick={() => void requestTurn(-1)}
          >
            <span aria-hidden="true">‹</span>
          </button>
          <p aria-hidden="true">{statusText}</p>
          <button
            className="guyu-turn-button"
            type="button"
            disabled={busy || pageIndex >= lastIndex}
            aria-label="下一页"
            onClick={() => void requestTurn(1)}
          >
            <span aria-hidden="true">›</span>
          </button>
        </nav> : null}
        <p className="guyu-reader-help guyu-visually-hidden">轻点画册左右两侧，或左右滑动翻页；键盘可用 ← →、Home、End。</p>
        <p className="guyu-accessibility-note guyu-visually-hidden">{book.accessibilityNote}</p>
        {pageIndex === 0 ? (
          <p className="guyu-open-hint" aria-hidden="true">
            <span />
            {loadError || (!coverReady ? "正在载入封面…" : phase === "loading" ? "正在载入下一页…" : phase === "flipping" ? "正在翻页…" : "轻点封面，或向左滑动翻开")}
          </p>
        ) : null}
      </section>
    </PageLoadContext.Provider>
  );
}
