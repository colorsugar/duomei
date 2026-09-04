import { useEffect } from "react";
import Lenis from "lenis";

declare global {
  interface Window { __duomeiLenis?: Lenis; }
}

export function useSmoothScroll(disabled = false) {
  useEffect(() => {
    if (disabled) return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce), (hover: none) and (pointer: coarse)');
    let lenis: Lenis | undefined;
    let frame = 0;
    const raf = (time: number) => {
      if (!lenis || document.hidden) { frame = 0; return; }
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    const stop = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (window.__duomeiLenis === lenis) window.__duomeiLenis = undefined;
      lenis?.destroy(); lenis = undefined;
    };
    const configure = () => {
      stop();
      // Touch devices retain native momentum and pinch behavior.
      if (preference.matches) return;
      lenis = new Lenis({ lerp: .1, wheelMultiplier: .95 });
      window.__duomeiLenis = lenis;
      if (!document.hidden) frame = requestAnimationFrame(raf);
    };
    const visibility = () => {
      cancelAnimationFrame(frame); frame = 0;
      if (!document.hidden && lenis) frame = requestAnimationFrame(raf);
    };
    configure();
    preference.addEventListener('change', configure);
    document.addEventListener('visibilitychange', visibility);
    return () => { stop(); preference.removeEventListener('change', configure); document.removeEventListener('visibilitychange', visibility); };
  }, [disabled]);
}
