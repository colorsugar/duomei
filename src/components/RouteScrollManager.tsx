import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { HOME_SECTION_HOLD_LAYOUT_EVENT } from "../lib/homeSectionHold";
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

    let readyTimerId = 0;
    let userInterrupted = false;
    const stopReadySync = () => {
      userInterrupted = true;
      if (readyTimerId) window.clearTimeout(readyTimerId);
    };
    const stopReadySyncOnKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "End", "Home", "PageDown", "PageUp", " "].includes(event.key)) {
        stopReadySync();
      }
    };
    const syncReadyLayout = () => {
      if (userInterrupted) return;
      const holds = Array.from(document.querySelectorAll<HTMLElement>("[data-home-section-hold]"));
      if (!holds.length || holds.some((hold) => hold.dataset.homeSectionReady !== "true")) return;
      if (readyTimerId) window.clearTimeout(readyTimerId);
      readyTimerId = window.setTimeout(() => {
        if (!userInterrupted) scrollHashTarget(location.hash);
      }, 50);
    };
    window.addEventListener(HOME_SECTION_HOLD_LAYOUT_EVENT, syncReadyLayout);
    window.addEventListener("wheel", stopReadySync, { passive: true });
    window.addEventListener("touchstart", stopReadySync, { passive: true });
    window.addEventListener("pointerdown", stopReadySync, { passive: true });
    window.addEventListener("keydown", stopReadySyncOnKey);

    const frameId = requestAnimationFrame(() => {
      scrollHashTarget(location.hash);
      syncReadyLayout();
    });

    return () => {
      cancelAnimationFrame(frameId);
      if (readyTimerId) window.clearTimeout(readyTimerId);
      window.removeEventListener(HOME_SECTION_HOLD_LAYOUT_EVENT, syncReadyLayout);
      window.removeEventListener("wheel", stopReadySync);
      window.removeEventListener("touchstart", stopReadySync);
      window.removeEventListener("pointerdown", stopReadySync);
      window.removeEventListener("keydown", stopReadySyncOnKey);
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
