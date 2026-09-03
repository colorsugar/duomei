import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __duomeiLenis?: Lenis;
  }
}

const easeOutCubic = (value: number) => 1 - Math.pow(1 - value, 3);

/**
 * Single entry point for programmatic scrolling. Lenis owns smoothing while it
 * is mounted; native `scrollTo({ behavior: "smooth" })` would fight its lerp and
 * stutter, so callers never talk to the window directly.
 */
export function scrollWindowTo(target: number | HTMLElement, { smooth = true, offset = 0 } = {}) {
  const lenis = window.__duomeiLenis;
  if (lenis) {
    lenis.scrollTo(target, smooth ? { offset, duration: 0.9, easing: easeOutCubic } : { offset, immediate: true });
    return;
  }
  const top = typeof target === "number" ? target : target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top: top + offset, left: 0, behavior: smooth ? "smooth" : "auto" });
}

export function useSmoothScroll(disabled = false) {
  useEffect(() => {
    if (disabled) return;

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
