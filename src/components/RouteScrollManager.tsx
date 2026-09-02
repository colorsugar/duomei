import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { readJourneyListState, restoreJourneyWindowScroll } from "../motion";

function scrollWindowTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

function scrollHashTarget(hash: string) {
  const target = document.querySelector(hash);
  if (!target) return false;
  target.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" as ScrollBehavior });
  return true;
}

export function RouteScrollManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const isNoteDetail = location.pathname.startsWith("/note/");
    const journeyState = !location.hash && location.pathname === "/" ? readJourneyListState() : null;
    if (journeyState) {
      requestAnimationFrame(() => restoreJourneyWindowScroll(journeyState));
      return;
    }

    if (!location.hash) {
      scrollWindowTop();
      const frameId = requestAnimationFrame(scrollWindowTop);
      const timers = isNoteDetail ? [window.setTimeout(scrollWindowTop, 80), window.setTimeout(scrollWindowTop, 240)] : [];
      return () => {
        cancelAnimationFrame(frameId);
        timers.forEach((timer) => window.clearTimeout(timer));
      };
    }

    const frameId = requestAnimationFrame(() => scrollHashTarget(location.hash));

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
