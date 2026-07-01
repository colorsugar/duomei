const JOURNEY_LIST_STATE_KEY = "duomei:journey:list-state";

export const sharedJourneyNames = {
  image: "duomei-shared-image",
  title: "duomei-shared-title",
} as const;

export type JourneyListState = {
  windowX: number;
  windowY: number;
  carouselLeft: number;
  noteId: string;
  savedAt: number;
};

type ViewTransitionDocument = Document & {
  startViewTransition?: (callback: () => void) => {
    finished: Promise<void>;
    ready: Promise<void>;
    updateCallbackDone: Promise<void>;
    skipTransition: () => void;
  };
};

const prefetchedImages = new Set<string>();

export function runSharedJourneyTransition(callback: () => void) {
  const viewTransitionDocument = document as ViewTransitionDocument;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !viewTransitionDocument.startViewTransition) {
    callback();
    return;
  }

  viewTransitionDocument.startViewTransition(callback);
}

export function saveJourneyListState(state: Omit<JourneyListState, "windowX" | "windowY" | "savedAt">) {
  const nextState: JourneyListState = {
    ...state,
    windowX: window.scrollX,
    windowY: window.scrollY,
    savedAt: Date.now(),
  };

  sessionStorage.setItem(JOURNEY_LIST_STATE_KEY, JSON.stringify(nextState));
}

export function readJourneyListState() {
  const raw = sessionStorage.getItem(JOURNEY_LIST_STATE_KEY);
  if (!raw) return null;

  try {
    const state = JSON.parse(raw) as JourneyListState;
    if (Date.now() - state.savedAt > 1000 * 60 * 10) {
      sessionStorage.removeItem(JOURNEY_LIST_STATE_KEY);
      return null;
    }
    return state;
  } catch {
    sessionStorage.removeItem(JOURNEY_LIST_STATE_KEY);
    return null;
  }
}

export function clearJourneyListState() {
  sessionStorage.removeItem(JOURNEY_LIST_STATE_KEY);
}

export function restoreJourneyWindowScroll(state: JourneyListState) {
  window.scrollTo({ top: state.windowY, left: state.windowX, behavior: "instant" });
}

export function markSharedJourneySource(root: HTMLElement) {
  const image = root.querySelector<HTMLElement>("[data-shared-journey-image]");
  const title = root.querySelector<HTMLElement>("[data-shared-journey-title]");

  image?.style.setProperty("view-transition-name", sharedJourneyNames.image);
  title?.style.setProperty("view-transition-name", sharedJourneyNames.title);

  return () => {
    image?.style.removeProperty("view-transition-name");
    title?.style.removeProperty("view-transition-name");
  };
}

export function preloadJourneyImage(src?: string) {
  if (!src || prefetchedImages.has(src)) return;
  prefetchedImages.add(src);

  const image = new Image();
  image.decoding = "async";
  image.src = src;
}
