import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDuomeiEdit } from "../DuomeiEditProvider";
import { CompanionBubble } from "./CompanionBubble";
import { CompanionSvg } from "./CompanionSvg";
import { getCompanionMessage, getRandomCompanionMessage, type CompanionMessageContext } from "./companionMessages";
import type { CompanionPlacement, CompanionState } from "./companionStates";

type DuomeiCompanionProps = {
  placement?: CompanionPlacement;
};

type CompanionPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  dragging: boolean;
};

type AmbientAction = {
  state: CompanionState;
  duration: number;
  weight: number;
};

const HOME_DELAY_MS = 0;
const MESSAGE_DURATION_MS = 3000;
const CLICK_RESET_MS = 8000;
const INACTIVITY_SLEEP_MS = 90000;
const PROACTIVE_SPEECH_MIN_MS = 9000;
const PROACTIVE_SPEECH_MAX_MS = 22000;
const POSITION_KEY = "duomei-companion-position";
const NOTE_FLIP_X = 248;
const AMBIENT_ACTIONS: AmbientAction[] = [
  { state: "idle", duration: 0, weight: 42 },
  { state: "look", duration: 3200, weight: 14 },
  { state: "stretch", duration: 2800, weight: 10 },
  { state: "yawn", duration: 5200, weight: 9 },
  { state: "sleep", duration: 7200, weight: 5 },
  { state: "hop", duration: 1700, weight: 7 },
  { state: "bag", duration: 2600, weight: 6 },
  { state: "spin", duration: 2200, weight: 4 },
  { state: "happy", duration: 1800, weight: 3 },
  { state: "doze", duration: 4200, weight: 8 },
  { state: "peek", duration: 2600, weight: 8 },
  { state: "cheer", duration: 1900, weight: 5 },
  { state: "scribble", duration: 3200, weight: 5 },
  { state: "shake", duration: 1500, weight: 4 },
];
const PROACTIVE_ACTIONS: AmbientAction[] = [
  { state: "peek", duration: 2600, weight: 18 },
  { state: "doze", duration: 4200, weight: 16 },
  { state: "look", duration: 2600, weight: 14 },
  { state: "wave", duration: 2200, weight: 12 },
  { state: "cheer", duration: 1900, weight: 10 },
  { state: "scribble", duration: 3200, weight: 9 },
  { state: "stretch", duration: 2600, weight: 8 },
  { state: "yawn", duration: 3600, weight: 7 },
  { state: "shake", duration: 1500, weight: 6 },
];
const UNSAFE_OVERLAY_SELECTOR = [
  ".detail-image-panel",
  ".image-upload-panel",
  ".image-editor-overlay",
  ".image-editor-shell",
  ".image-cropper-shell",
  ".image-crop-panel",
  ".duomei-image-panel",
  "[data-image-editor-open='true']",
  "[data-upload-panel-open='true']",
  "dialog[open]",
  "[role='dialog'][aria-modal='true']",
].join(", ");
function clearTimer(timerRef: { current: number | null }) {
  if (timerRef.current === null) return;
  window.clearTimeout(timerRef.current);
  timerRef.current = null;
}

function randomBetween(min: number, max: number) {
  return min + Math.round(Math.random() * (max - min));
}

function pickAmbientAction(): AmbientAction {
  const total = AMBIENT_ACTIONS.reduce((sum, action) => sum + action.weight, 0);
  let point = Math.random() * total;
  for (const action of AMBIENT_ACTIONS) {
    point -= action.weight;
    if (point <= 0) return action;
  }
  return AMBIENT_ACTIONS[0];
}

function pickWeightedAction(actions: AmbientAction[]): AmbientAction {
  const total = actions.reduce((sum, action) => sum + action.weight, 0);
  let point = Math.random() * total;
  for (const action of actions) {
    point -= action.weight;
    if (point <= 0) return action;
  }
  return actions[0];
}

function isUnsafeDomState() {
  if (typeof document === "undefined") return true;
  return (
    document.body.classList.contains("duomei-modal-open") ||
    document.documentElement.classList.contains("duomei-modal-open") ||
    document.body.classList.contains("front-editing") ||
    Boolean(document.querySelector(UNSAFE_OVERLAY_SELECTOR))
  );
}

function routeContext(pathname: string): CompanionMessageContext | null {
  if (pathname === "/") return "home";
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/note/")) return "detail";
  return null;
}

function containPosition(x: number, y: number, width: number, height: number): CompanionPosition {
  return {
    x: Math.min(Math.max(x, 0), Math.max(0, window.innerWidth - width)),
    y: Math.min(Math.max(y, 0), Math.max(0, window.innerHeight - height)),
  };
}

function readSavedPosition(): CompanionPosition | null {
  try {
    const raw = window.localStorage.getItem(POSITION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CompanionPosition;
    if (!Number.isFinite(parsed.x) || !Number.isFinite(parsed.y)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function DuomeiCompanion({ placement = "global" }: DuomeiCompanionProps) {
  const location = useLocation();
  const { editMode, isEditorOpen } = useDuomeiEdit();
  const companionRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressNextClickRef = useRef(false);
  const stateTimerRef = useRef<number | null>(null);
  const ambientTimerRef = useRef<number | null>(null);
  const messageTimerRef = useRef<number | null>(null);
  const proactiveTimerRef = useRef<number | null>(null);
  const clickResetTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const lastInteractionRef = useRef(Date.now());
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState<CompanionState>(placement === "not-found" ? "lost" : "sit");
  const [noteVisible, setNoteVisible] = useState(false);
  const [clickStep, setClickStep] = useState(0);
  const [messageCursor, setMessageCursor] = useState(0);
  const [unsafe, setUnsafe] = useState(true);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<CompanionPosition | null>(null);
  const [dragging, setDragging] = useState(false);
  const [restArmed, setRestArmed] = useState(false);
  const [resting, setResting] = useState(false);

  const isAdmin = location.pathname.startsWith("/admin");
  const isEditRoute = new URLSearchParams(location.search).get("edit") === "1";
  const context = useMemo(() => routeContext(location.pathname), [location.pathname]);
  const suppressed = isAdmin || isEditRoute || editMode || isEditorOpen || unsafe;
  const messageContext = placement === "not-found" ? "not-found" : (context ?? "home");
  const message = activeMessage ?? getCompanionMessage(messageContext, messageCursor);

  const returnToSit = (delay: number) => {
    clearTimer(stateTimerRef);
    stateTimerRef.current = window.setTimeout(() => {
      setState(placement === "not-found" ? "lost" : "sit");
      stateTimerRef.current = null;
    }, delay);
  };

  const showNote = (note: string) => {
    clearTimer(messageTimerRef);
    clearTimer(proactiveTimerRef);
    setActiveMessage(note);
    setNoteVisible(true);
    messageTimerRef.current = window.setTimeout(() => {
      setNoteVisible(false);
      setActiveMessage(null);
      messageTimerRef.current = null;
    }, MESSAGE_DURATION_MS);
  };

  useEffect(() => {
    const saved = readSavedPosition();
    if (saved) setPosition(saved);
  }, []);

  useEffect(() => {
    const check = () => setUnsafe(isUnsafeDomState());
    check();
    const timer = window.setInterval(check, 600);
    window.addEventListener("focus", check);
    window.addEventListener("resize", check);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  useEffect(() => {
    clearTimer(stateTimerRef);
    clearTimer(messageTimerRef);
    clearTimer(clickResetTimerRef);
    clearTimer(longPressTimerRef);
    clearTimer(ambientTimerRef);
    setNoteVisible(false);
    setActiveMessage(null);
    setClickStep(0);
    setRestArmed(false);
    setResting(false);
    if (placement !== "global") {
      setVisible(true);
      setState(placement === "not-found" ? "lost" : "sit");
      return;
    }
    setVisible(true);
    setState("sit");
  }, [location.pathname, placement]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !context || resting) return;
    let entered = false;
    const show = () => {
      if (entered) return;
      entered = true;
      setVisible(true);
      setState("walk");
      returnToSit(2000);
    };
    const delay = window.setTimeout(show, HOME_DELAY_MS);
    const onScroll = () => {
      if (window.scrollY > Math.min(360, window.innerHeight * 0.42)) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.clearTimeout(delay);
      window.removeEventListener("scroll", onScroll);
    };
  }, [context, placement, resting, suppressed, location.pathname]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !visible || dragging || resting || !context) return;
    let cancelled = false;
    const schedule = () => {
      clearTimer(ambientTimerRef);
      ambientTimerRef.current = window.setTimeout(() => {
        if (cancelled || suppressed || !visible || dragging || resting) return;
        const inactive = Date.now() - lastInteractionRef.current;
        const action =
          inactive > INACTIVITY_SLEEP_MS && Math.random() < 0.35
            ? { state: "sleep" as CompanionState, duration: 8000, weight: 1 }
            : pickAmbientAction();
        if (action.state === "idle") {
          schedule();
          return;
        }
        setState(action.state);
        clearTimer(stateTimerRef);
        stateTimerRef.current = window.setTimeout(() => {
          if (!cancelled) setState("sit");
          stateTimerRef.current = null;
          schedule();
        }, action.duration);
      }, randomBetween(15000, 40000));
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimer(ambientTimerRef);
    };
  }, [context, dragging, placement, resting, suppressed, visible]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !visible || dragging || resting || !context) return;
    let cancelled = false;
    const schedule = () => {
      clearTimer(proactiveTimerRef);
      proactiveTimerRef.current = window.setTimeout(() => {
        if (cancelled || suppressed || !visible || dragging || resting) return;
        const action = pickWeightedAction(PROACTIVE_ACTIONS);
        setState(action.state);
        showNote(getRandomCompanionMessage(messageContext, activeMessage ?? undefined));
        clearTimer(stateTimerRef);
        stateTimerRef.current = window.setTimeout(() => {
          if (!cancelled) setState("sit");
          stateTimerRef.current = null;
        }, action.duration);
        schedule();
      }, randomBetween(PROACTIVE_SPEECH_MIN_MS, PROACTIVE_SPEECH_MAX_MS));
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimer(proactiveTimerRef);
    };
  }, [activeMessage, context, dragging, messageContext, placement, resting, suppressed, visible]);

  useEffect(() => {
    if (placement !== "global") return;
    const onPublished = () => {
      if (isUnsafeDomState()) return;
      setResting(false);
      setRestArmed(false);
      setVisible(true);
      setState("flag");
      showNote(getCompanionMessage("published", 0));
      returnToSit(3500);
    };
    window.addEventListener("duomei:publish-success", onPublished);
    return () => window.removeEventListener("duomei:publish-success", onPublished);
  }, [placement]);

  const showContextMessage = () => {
    lastInteractionRef.current = Date.now();
    clearTimer(clickResetTimerRef);
    const next = clickStep >= 7 ? 1 : clickStep + 1;
    setClickStep(next);
    clickResetTimerRef.current = window.setTimeout(() => {
      setClickStep(0);
      clickResetTimerRef.current = null;
    }, CLICK_RESET_MS);

    if (next === 1) {
      setState("look");
      setNoteVisible(false);
      returnToSit(3000);
      return;
    }
    if (next === 2) {
      setState("wave");
      showNote(getCompanionMessage(messageContext, messageCursor));
      setMessageCursor((current) => current + 1);
      returnToSit(2000);
      return;
    }
    if (next === 3) {
      setNoteVisible(false);
      setState("happy");
      returnToSit(1800);
      return;
    }
    if (next === 4) {
      setNoteVisible(false);
      setState("hop");
      returnToSit(1700);
      return;
    }
    if (next === 5) {
      setNoteVisible(false);
      setState("spin");
      returnToSit(2200);
      return;
    }
    if (next === 6) {
      setNoteVisible(false);
      setState("bag");
      returnToSit(2600);
      return;
    }
    if (next === 7) {
      setNoteVisible(false);
      setState("yawn");
      returnToSit(3600);
      return;
    }
    setNoteVisible(false);
    setState("sit");
  };

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (placement !== "global") return;
    const rect = companionRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastInteractionRef.current = Date.now();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      dragging: false,
    };
    clearTimer(longPressTimerRef);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const rect = companionRef.current?.getBoundingClientRect();
    if (!drag || !rect || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance > 10) {
      clearTimer(longPressTimerRef);
      drag.dragging = true;
      setDragging(true);
      setNoteVisible(false);
      setState("drag");
    }
    if (!drag.dragging) return;
    event.preventDefault();
    const next = containPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY, rect.width, rect.height);
    setPosition(next);
    setRestArmed(false);
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    clearTimer(longPressTimerRef);
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // The browser may release the pointer first.
    }
    dragRef.current = null;
    if (drag.dragging) {
      suppressNextClickRef.current = true;
      setDragging(false);
      setRestArmed(false);
      setState("sit");
      return;
    }
    suppressNextClickRef.current = true;
    if (placement === "not-found") {
      setState("lost");
      showNote(getCompanionMessage("not-found", messageCursor));
      setMessageCursor((current) => current + 1);
      return;
    }
    showContextMessage();
  };

  const handleCompanionClick = () => {
    if (suppressNextClickRef.current) {
      suppressNextClickRef.current = false;
      return;
    }
    if (placement === "not-found") {
      setState("lost");
      showNote(getCompanionMessage("not-found", messageCursor));
      setMessageCursor((current) => current + 1);
      return;
    }
    showContextMessage();
  };

  if (suppressed || (placement === "global" && (resting || !context || !visible))) return null;

  const companionStyle: CSSProperties =
    placement === "global" && position
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
        }
      : {};
  const noteSideClass = placement === "global" && position && position.x < NOTE_FLIP_X ? " is-note-right" : "";

  return (
    <div
      ref={companionRef}
      className={`duomei-companion duomei-companion--${placement} duomei-companion--${context ?? "page"}${
        dragging ? " is-dragging" : ""
      }${placement === "global" && position ? " is-placed" : ""}${restArmed ? " is-rest-armed" : ""}${noteSideClass}`}
      style={companionStyle}
    >
      <CompanionBubble message={message} visible={noteVisible} />
      <button
        className="duomei-companion-button"
        type="button"
        aria-label="DUOMEI companion, drag to place within the screen"
        onClick={handleCompanionClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <CompanionSvg state={dragging ? "drag" : state} />
      </button>
    </div>
  );
}

export default DuomeiCompanion;
