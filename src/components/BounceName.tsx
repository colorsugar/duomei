import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AnimatedTitle } from "../motion";

// After the letters have popped in, each one leans gently toward the pointer (fine pointers only).
const MAGNET_RADIUS = 240;
const MAGNET_PULL = 0.22;
const MAGNET_EASE = 0.14;

export function BounceName() {
  const letters = "DUOMEI".split("");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const spans = root.querySelectorAll<HTMLSpanElement>("h1 > span");
    const last = spans[spans.length - 1];
    const done = () => setSettled(true);
    last?.addEventListener("animationend", done, { once: true });
    const fallback = window.setTimeout(done, 2600);
    return () => {
      last?.removeEventListener("animationend", done);
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    if (!settled) return;
    const root = rootRef.current;
    if (!root) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const spans = Array.from(root.querySelectorAll<HTMLSpanElement>("h1 > span"));
    const state = spans.map(() => ({ x: 0, y: 0, r: 0, gx: 0, gy: 0, gr: 0 }));
    let pointerX = -1e4;
    let pointerY = -1e4;
    let frame = 0;

    const tick = () => {
      frame = 0;
      let busy = false;
      spans.forEach((span, index) => {
        const rect = span.getBoundingClientRect();
        const dx = pointerX - (rect.left + rect.width / 2);
        const dy = pointerY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);
        const pull = distance < MAGNET_RADIUS ? 1 - distance / MAGNET_RADIUS : 0;
        const s = state[index];
        s.gx = dx * pull * MAGNET_PULL;
        s.gy = dy * pull * MAGNET_PULL;
        s.gr = (dx / MAGNET_RADIUS) * pull * 7;
        s.x += (s.gx - s.x) * MAGNET_EASE;
        s.y += (s.gy - s.y) * MAGNET_EASE;
        s.r += (s.gr - s.r) * MAGNET_EASE;
        span.style.setProperty("--mag-x", `${s.x.toFixed(2)}px`);
        span.style.setProperty("--mag-y", `${s.y.toFixed(2)}px`);
        span.style.setProperty("--mag-r", `${s.r.toFixed(2)}deg`);
        if (Math.abs(s.gx - s.x) > 0.05 || Math.abs(s.gy - s.y) > 0.05 || Math.abs(s.gr - s.r) > 0.02) busy = true;
      });
      if (busy) frame = window.requestAnimationFrame(tick);
    };
    const nudge = () => {
      if (!frame) frame = window.requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      nudge();
    };
    const onLeave = () => {
      pointerX = -1e4;
      pointerY = -1e4;
      nudge();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [settled]);

  return (
    <div ref={rootRef} className={`bounce-name duomei-hero-title-motion${settled ? " is-settled" : ""}`}>
      <AnimatedTitle as="h1" aria-label="DUOMEI">
        {letters.map((letter, index) => (
          <span key={letter} style={{ "--i": index } as CSSProperties}>
            {letter}
          </span>
        ))}
      </AnimatedTitle>
    </div>
  );
}
