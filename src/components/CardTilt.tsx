import { useEffect } from "react";

// One delegated pointer pipeline for the big section cards: writes the tilt angles and the
// sheen position as CSS variables (read in colorful.css). Note cards keep their own pipeline
// in NotesCarousel.tsx (docs/note-card-tilt.md); this never touches them.
const CARDS = ".zaobao-card, .xunji-home-card, .dalu-home-card, .yunyou-card:not(.yunyou-plate), .sticker-pack-card, .poetry-legacy-frame .dream-card";
const TILT = 4;

export function CardTilt() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let active: HTMLElement | null = null;
    let rect: DOMRect | null = null;
    let pending: { x: number; y: number } | null = null;
    let frame = 0;

    const reset = () => {
      if (!active) return;
      active.classList.remove("is-tilting");
      for (const name of ["--tilt-x", "--tilt-y", "--glare-x", "--glare-y"]) active.style.removeProperty(name);
      active = null;
      rect = null;
    };
    const apply = () => {
      frame = 0;
      if (!active || !rect || !pending) return;
      const rx = (pending.x - rect.left) / rect.width - 0.5;
      const ry = (pending.y - rect.top) / rect.height - 0.5;
      active.style.setProperty("--tilt-y", `${(rx * TILT * 2).toFixed(2)}deg`);
      active.style.setProperty("--tilt-x", `${(ry * -TILT * 2).toFixed(2)}deg`);
      active.style.setProperty("--glare-x", `${((rx + 0.5) * 100).toFixed(1)}%`);
      active.style.setProperty("--glare-y", `${((ry + 0.5) * 100).toFixed(1)}%`);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>(CARDS) : null;
      if (card !== active) {
        reset();
        if (card) {
          active = card;
          rect = card.getBoundingClientRect();
          card.classList.add("is-tilting");
        }
      }
      if (!active) return;
      pending = { x: event.clientX, y: event.clientY };
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", reset);
    window.addEventListener("scroll", reset, { passive: true });
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", reset);
      window.removeEventListener("scroll", reset);
      if (frame) window.cancelAnimationFrame(frame);
      reset();
    };
  }, []);

  return null;
}
