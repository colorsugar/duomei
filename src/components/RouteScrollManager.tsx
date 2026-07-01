import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { readJourneyListState, restoreJourneyWindowScroll } from "../motion";

export function RouteScrollManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
    const journeyState = location.pathname === "/" ? readJourneyListState() : null;
    if (journeyState) {
      requestAnimationFrame(() => restoreJourneyWindowScroll(journeyState));
      return;
    }

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    if (!location.hash) {
      scrollToTop();
      requestAnimationFrame(scrollToTop);
      return;
    }

    const target = document.querySelector(location.hash);
    if (!target) return;
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
    });
  }, [location.pathname, location.search, location.hash]);

  return null;
}
