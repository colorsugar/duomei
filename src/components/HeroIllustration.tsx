import { useEffect, useRef } from "react";
import { AnimatedImage } from "../motion";
import { HeroOrb } from "./HeroOrb";

// Mouse parallax: the illustration drifts a few pixels against the pointer, eased each frame.
// Touch devices and reduced-motion users keep the still image.
const PARALLAX_X = 16;
const PARALLAX_Y = 11;
const PARALLAX_EASE = 0.11;

function useHeroParallax(target: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const node = target.current;
    if (!node) return;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;

    let goalX = 0;
    let goalY = 0;
    let x = 0;
    let y = 0;
    let frame = 0;

    const settle = () => {
      frame = 0;
      x += (goalX - x) * PARALLAX_EASE;
      y += (goalY - y) * PARALLAX_EASE;
      node.style.setProperty("--hero-parallax-x", `${x.toFixed(2)}px`);
      node.style.setProperty("--hero-parallax-y", `${y.toFixed(2)}px`);
      if (Math.abs(goalX - x) > 0.05 || Math.abs(goalY - y) > 0.05) frame = window.requestAnimationFrame(settle);
    };
    const nudge = () => {
      if (!frame) frame = window.requestAnimationFrame(settle);
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      goalX = (event.clientX / window.innerWidth - 0.5) * -PARALLAX_X;
      goalY = (event.clientY / window.innerHeight - 0.5) * -PARALLAX_Y;
      nudge();
    };
    const onLeave = () => {
      goalX = 0;
      goalY = 0;
      nudge();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      if (frame) window.cancelAnimationFrame(frame);
      node.style.removeProperty("--hero-parallax-x");
      node.style.removeProperty("--hero-parallax-y");
    };
  }, [target]);
}

export function HeroIllustration() {
  const motionRef = useRef<HTMLDivElement | null>(null);
  useHeroParallax(motionRef);

  return (
    <AnimatedImage className="duomei-hero-illustration-wrap" aria-label="DUOMEI hero illustration">
      <div className="duomei-hero-cover-motion" ref={motionRef}>
        <figure className="duomei-hero-illustration duomei-hero-image-frame duomei-motion-ambient-hero">
          <HeroOrb />
        </figure>
      </div>
    </AnimatedImage>
  );
}
