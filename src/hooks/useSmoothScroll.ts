import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window {
    __duomeiLenis?: Lenis;
  }
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
