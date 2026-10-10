import { useEffect } from "react";

// A soft dot in the current section's hue that trails the pointer and opens up over anything
// clickable. The system cursor is never hidden. Fine pointers only; off under reduced motion.
const INTERACTIVE = "a, button, [role='button'], input, textarea, select, summary, [contenteditable='true'], .duomei-note-card";
const EASE = 0.22;

export function CursorGlow() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const dot = document.createElement("div");
    dot.className = "duomei-cursor is-hidden";
    dot.setAttribute("aria-hidden", "true");
    document.body.appendChild(dot);

    let goalX = 0;
    let goalY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;
    let awake = false;

    const settle = () => {
      frame = 0;
      x += (goalX - x) * EASE;
      y += (goalY - y) * EASE;
      dot.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      if (Math.abs(goalX - x) > 0.2 || Math.abs(goalY - y) > 0.2) frame = window.requestAnimationFrame(settle);
    };
    const nudge = () => {
      if (!frame) frame = window.requestAnimationFrame(settle);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      goalX = event.clientX;
      goalY = event.clientY;
      if (!awake) {
        awake = true;
        x = goalX;
        y = goalY;
        dot.classList.remove("is-hidden");
        dot.classList.add("is-awake");
      }
      const target = event.target instanceof Element ? event.target.closest(INTERACTIVE) : null;
      dot.classList.toggle("is-link", Boolean(target));
      nudge();
    };
    const onDown = () => dot.classList.add("is-down");
    const onUp = () => dot.classList.remove("is-down");
    const onLeave = () => dot.classList.add("is-hidden");
    const onEnter = () => {
      if (awake) dot.classList.remove("is-hidden");
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.documentElement.addEventListener("pointerenter", onEnter);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.removeEventListener("pointerenter", onEnter);
      if (frame) window.cancelAnimationFrame(frame);
      dot.remove();
    };
  }, []);

  return null;
}
