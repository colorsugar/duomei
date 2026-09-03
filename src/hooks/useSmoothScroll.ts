import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __duomeiLenis?: Lenis;
  }
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Every programmatic window scroll goes through here so Lenis (when mounted)
 * stays the only scroll animator. Native `behavior: "smooth"` stacked on top of
 * Lenis produced a stutter and left the two disagreeing about the position.
 */
export function scrollWindowTo(top: number) {
  const lenis = window.__duomeiLenis;
  if (lenis) {
    lenis.scrollTo(top, { immediate: prefersReducedMotion() });
    return;
  }
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

export function useSmoothScroll(disabled = false) {
  useEffect(() => {
    if (disabled || prefersReducedMotion()) return;

    const lenis = new Lenis({
      lerp: 0.08,
      wheelMultiplier: 0.9,
    });
    window.__duomeiLenis = lenis;

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };

    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      if (window.__duomeiLenis === lenis) window.__duomeiLenis = undefined;
      lenis.destroy();
    };
  }, [disabled]);
}
