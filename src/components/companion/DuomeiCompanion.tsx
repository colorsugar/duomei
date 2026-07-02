import { type CSSProperties, type PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDuomeiEdit } from "../DuomeiEditProvider";
import { CompanionBubble } from "./CompanionBubble";
import { CompanionSvg } from "./CompanionSvg";
import { getCompanionMessage, type CompanionMessageContext } from "./companionMessages";
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
  longPressTimer: number;
  dragging: boolean;
};

const HOME_DELAY_MS = 24000;
const MESSAGE_DURATION_MS = 3000;
const POSITION_KEY = "duomei-companion-position";

function isUnsafeDomState() {
  if (typeof document === "undefined") return true;
  return (
    document.body.classList.contains("duomei-modal-open") ||
    document.documentElement.classList.contains("duomei-modal-open") ||
    document.body.classList.contains("front-editing") ||
    Boolean(document.querySelector(".detail-image-panel, .image-upload-panel, .image-editor-overlay, [data-image-editor-open='true']"))
  );
}

function routeContext(pathname: string): CompanionMessageContext | null {
  if (pathname === "/") return "home";
  if (pathname === "/about") return "about";
  if (pathname.startsWith("/note/")) return "detail";
  return null;
}

function clampPosition(x: number, y: number, width: number, height: number): CompanionPosition {
  const margin = 12;
  const mobileBottomReserve = window.innerWidth <= 760 ? 112 : 18;
  const maxX = Math.max(margin, window.innerWidth - width - margin);
  const maxY = Math.max(margin, window.innerHeight - height - mobileBottomReserve);
  return {
    x: Math.min(Math.max(x, margin), maxX),
    y: Math.min(Math.max(y, margin), maxY),
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
  const [visible, setVisible] = useState(placement !== "global");
  const [state, setState] = useState<CompanionState>(placement === "not-found" ? "lost" : "sit");
  const [noteVisible, setNoteVisible] = useState(false);
  const [clickStep, setClickStep] = useState(0);
  const [messageCursor, setMessageCursor] = useState(0);
  const [unsafe, setUnsafe] = useState(true);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [position, setPosition] = useState<CompanionPosition | null>(null);
  const [dragging, setDragging] = useState(false);

  const isAdmin = location.pathname.startsWith("/admin");
  const isEditRoute = new URLSearchParams(location.search).get("edit") === "1";
  const context = useMemo(() => routeContext(location.pathname), [location.pathname]);
  const suppressed = isAdmin || isEditRoute || editMode || isEditorOpen || unsafe;
  const messageContext = placement === "not-found" ? "not-found" : (context ?? "home");
  const message = activeMessage ?? getCompanionMessage(messageContext, messageCursor);

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
    setNoteVisible(false);
    setActiveMessage(null);
    setClickStep(0);
    if (placement !== "global") {
      setVisible(true);
      setState(placement === "not-found" ? "lost" : "sit");
      return;
    }
    setVisible(false);
    setState("walk");
  }, [location.pathname, placement]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !context) return;
    let entered = false;
    const show = () => {
      if (entered) return;
      entered = true;
      setVisible(true);
      setState("walk");
      window.setTimeout(() => setState("sit"), 950);
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
  }, [context, placement, suppressed, location.pathname]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !visible) return;
    let cancelled = false;
    const scheduleLook = () => {
      const delay = 15000 + Math.round(Math.random() * 15000);
      window.setTimeout(() => {
        if (cancelled || suppressed || !visible || dragging) return;
        setState("look");
        window.setTimeout(() => {
          if (!cancelled) setState("sit");
          scheduleLook();
        }, 1400);
      }, delay);
    };
    scheduleLook();
    return () => {
      cancelled = true;
    };
  }, [placement, suppressed, visible, dragging]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !visible || dragging) return;
    const leaveTimer = window.setTimeout(() => {
      setState("walk");
      window.setTimeout(() => setVisible(false), 1100);
      window.setTimeout(() => {
        if (!isUnsafeDomState()) {
          setVisible(true);
          setState("walk");
          window.setTimeout(() => setState("sit"), 950);
        }
      }, 90000);
    }, 180000);
    return () => window.clearTimeout(leaveTimer);
  }, [placement, suppressed, visible, dragging]);

  useEffect(() => {
    if (placement !== "global") return;
    const onPublished = () => {
      if (isUnsafeDomState()) return;
      setVisible(true);
      setState("flag");
      setActiveMessage(getCompanionMessage("published", 0));
      setNoteVisible(true);
      window.setTimeout(() => {
        setNoteVisible(false);
        setActiveMessage(null);
        setState("sit");
        setVisible(false);
      }, MESSAGE_DURATION_MS);
    };
    window.addEventListener("duomei:publish-success", onPublished);
    return () => window.removeEventListener("duomei:publish-success", onPublished);
  }, [placement]);

  useEffect(() => {
    if (placement !== "global" || !position || !companionRef.current) return;
    const onResize = () => {
      const rect = companionRef.current?.getBoundingClientRect();
      if (!rect) return;
      const next = clampPosition(position.x, position.y, rect.width, rect.height);
      setPosition(next);
      window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [placement, position]);

  if (suppressed || (placement === "global" && (!context || !visible))) return null;

  const showContextMessage = () => {
    const next = (clickStep + 1) % 3;
    setClickStep(next);
    if (next === 1) {
      setState("look");
      window.setTimeout(() => setState("sit"), 1300);
      setNoteVisible(false);
      return;
    }
    if (next === 2) {
      setState("wave");
      window.setTimeout(() => setState("sit"), 1300);
      setActiveMessage(getCompanionMessage(messageContext, messageCursor));
      setMessageCursor((current) => current + 1);
      setNoteVisible(true);
      window.setTimeout(() => {
        setNoteVisible(false);
        setActiveMessage(null);
      }, MESSAGE_DURATION_MS);
      return;
    }
    setNoteVisible(false);
    setState("sit");
  };

  const beginDrag = (event: PointerEvent<HTMLButtonElement>) => {
    if (placement !== "global") return;
    const rect = companionRef.current?.getBoundingClientRect();
    if (!rect) return;
    const longPressTimer = window.setTimeout(() => {
      if (!dragRef.current) return;
      dragRef.current.dragging = true;
      setDragging(true);
      setNoteVisible(false);
      setState("walk");
    }, 280);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      longPressTimer,
      dragging: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const rect = companionRef.current?.getBoundingClientRect();
    if (!drag || !rect || drag.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
    if (!drag.dragging && distance > 10) {
      drag.dragging = true;
      setDragging(true);
      setNoteVisible(false);
      setState("walk");
    }
    if (!drag.dragging) return;
    event.preventDefault();
    const next = clampPosition(event.clientX - drag.offsetX, event.clientY - drag.offsetY, rect.width, rect.height);
    setPosition(next);
    window.localStorage.setItem(POSITION_KEY, JSON.stringify(next));
  };

  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    window.clearTimeout(drag.longPressTimer);
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    if (drag.dragging) {
      suppressNextClickRef.current = true;
      setDragging(false);
      setState("sit");
      return;
    }
    suppressNextClickRef.current = true;
    if (placement === "not-found") {
      setActiveMessage(getCompanionMessage("not-found", messageCursor));
      setMessageCursor((current) => current + 1);
      setNoteVisible(true);
      window.setTimeout(() => {
        setNoteVisible(false);
        setActiveMessage(null);
      }, MESSAGE_DURATION_MS);
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
      setActiveMessage(getCompanionMessage("not-found", messageCursor));
      setMessageCursor((current) => current + 1);
      setNoteVisible(true);
      window.setTimeout(() => {
        setNoteVisible(false);
        setActiveMessage(null);
      }, MESSAGE_DURATION_MS);
      return;
    }
    showContextMessage();
  };

  const companionStyle: CSSProperties =
    placement === "global" && position
      ? {
          left: `${position.x}px`,
          top: `${position.y}px`,
          right: "auto",
          bottom: "auto",
        }
      : {};

  return (
    <div
      ref={companionRef}
      className={`duomei-companion duomei-companion--${placement} duomei-companion--${context ?? "page"}${
        dragging ? " is-dragging" : ""
      }`}
      style={companionStyle}
    >
      <CompanionBubble message={message} visible={noteVisible} />
      <button
        className="duomei-companion-button"
        type="button"
        aria-label="小旅伴，长按可以移动"
        onClick={handleCompanionClick}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <CompanionSvg state={state} />
      </button>
    </div>
  );
}

export default DuomeiCompanion;
