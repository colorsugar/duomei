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

    // 首次进站时，目标板块上方的板块还在载图、量高度（驻留轨道高度按内容溢出算），
    // 只滚一次会落到错位处，手机上甚至落到页底。所以在 2.4 秒内跟着布局变化反复对准，
    // 读者自己一动（触摸、滚轮、按键）就停手，不跟人抢。
    const hash = location.hash;
    let stopped = false;
    let frameId = requestAnimationFrame(() => scrollHashTarget(hash));
    const align = () => {
      if (stopped) return;
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => scrollHashTarget(hash));
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(align);
    observer?.observe(document.body);
    const timers = [120, 400, 900, 1600].map((ms) => window.setTimeout(align, ms));
    const stop = () => {
      stopped = true;
      observer?.disconnect();
    };
    const stopTimer = window.setTimeout(stop, 2400);
    const userEvents = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    userEvents.forEach((type) => window.addEventListener(type, stop, { passive: true, once: true }));

    return () => {
      stop();
      cancelAnimationFrame(frameId);
      timers.forEach((timer) => window.clearTimeout(timer));
      window.clearTimeout(stopTimer);
      userEvents.forEach((type) => window.removeEventListener(type, stop));
    };
  }, [location.pathname, location.search, location.hash]);

  return null;
}
