import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

export function RouteScrollManager() {
  const location = useLocation();

  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useLayoutEffect(() => {
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
