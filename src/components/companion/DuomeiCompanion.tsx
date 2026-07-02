import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useDuomeiEdit } from "../DuomeiEditProvider";
import { CompanionBubble } from "./CompanionBubble";
import { CompanionSvg } from "./CompanionSvg";
import { companionMessages, type CompanionMessageContext } from "./companionMessages";
import type { CompanionPlacement, CompanionState } from "./companionStates";

type DuomeiCompanionProps = {
  placement?: CompanionPlacement;
};

const HOME_DELAY_MS = 24000;
const MESSAGE_DURATION_MS = 3000;

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

export function DuomeiCompanion({ placement = "global" }: DuomeiCompanionProps) {
  const location = useLocation();
  const { editMode, isEditorOpen } = useDuomeiEdit();
  const [visible, setVisible] = useState(placement !== "global");
  const [state, setState] = useState<CompanionState>(placement === "not-found" ? "lost" : "sit");
  const [noteVisible, setNoteVisible] = useState(false);
  const [clickStep, setClickStep] = useState(0);
  const [unsafe, setUnsafe] = useState(true);
  const [activeMessage, setActiveMessage] = useState<string | null>(null);

  const isAdmin = location.pathname.startsWith("/admin");
  const isEditRoute = new URLSearchParams(location.search).get("edit") === "1";
  const context = useMemo(() => routeContext(location.pathname), [location.pathname]);
  const suppressed = isAdmin || isEditRoute || editMode || isEditorOpen || unsafe;
  const message =
    activeMessage ?? (placement === "not-found" ? companionMessages["not-found"] : companionMessages[context ?? "home"]);

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
        if (cancelled || suppressed || !visible) return;
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
  }, [placement, suppressed, visible]);

  useEffect(() => {
    if (placement !== "global" || suppressed || !visible) return;
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
  }, [placement, suppressed, visible]);

  useEffect(() => {
    if (placement !== "global") return;
    const onPublished = () => {
      if (isUnsafeDomState()) return;
      setVisible(true);
      setState("flag");
      setActiveMessage(companionMessages.published);
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

  if (suppressed || (placement === "global" && (!context || !visible))) return null;

  const handleClick = () => {
    if (placement === "not-found") {
      setNoteVisible(true);
      window.setTimeout(() => setNoteVisible(false), MESSAGE_DURATION_MS);
      return;
    }

    const next = (clickStep + 1) % 3;
    setClickStep(next);
    if (next === 1) {
      setState("look");
      window.setTimeout(() => setState("sit"), 1300);
      setNoteVisible(false);
    } else if (next === 2) {
      setNoteVisible(true);
      window.setTimeout(() => setNoteVisible(false), MESSAGE_DURATION_MS);
    } else {
      setNoteVisible(false);
      setState("sit");
    }
  };

  return (
    <div className={`duomei-companion duomei-companion--${placement} duomei-companion--${context ?? "page"}`}>
      <CompanionBubble message={message} visible={noteVisible} />
      <button className="duomei-companion-button" type="button" aria-label="小旅伴" onClick={handleClick}>
        <CompanionSvg state={state} />
      </button>
    </div>
  );
}

export default DuomeiCompanion;
