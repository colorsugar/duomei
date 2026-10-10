import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __duomeiLenis?: Lenis;
  }
}

// Safari's own scrolling is already smooth, and Lenis's re-scrolled frames fight sticky stages there
// (a stutter at every section hand-over), so Safari keeps native scrolling.
function isSafari() {
  const ua = navigator.userAgent;
  return /safari/i.test(ua) && !/chrome|chromium|crios|android|edg/i.test(ua);
}

export function useSmoothScroll(disabled = false) {
  useEffect(() => {
    if (disabled || isSafari()) return;

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
