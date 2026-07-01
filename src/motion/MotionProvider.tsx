import { createContext, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motionTokens, type DuomeiMotionTokens } from "./motionTokens";

type MotionContextValue = {
  tokens: DuomeiMotionTokens;
  prefersReducedMotion: boolean;
};

const MotionContext = createContext<MotionContextValue>({
  tokens: motionTokens,
  prefersReducedMotion: false,
});

function cssVars(tokens: DuomeiMotionTokens) {
  return {
    "--motion-duration-xs": `${tokens.duration.xs}ms`,
    "--motion-duration-s": `${tokens.duration.s}ms`,
    "--motion-duration-m": `${tokens.duration.m}ms`,
    "--motion-duration-l": `${tokens.duration.l}ms`,
    "--motion-duration-xl": `${tokens.duration.xl}ms`,
    "--motion-duration-xxl": `${tokens.duration.xxl}ms`,
    "--motion-ease-standard": tokens.ease.standard,
    "--motion-ease-soft": tokens.ease.soft,
    "--motion-ease-ambient": tokens.ease.ambient,
    "--motion-reveal-y": `${tokens.reveal.y}px`,
    "--motion-reveal-blur": `${tokens.reveal.blur}px`,
    "--motion-hover-lift": `${tokens.hover.lift}px`,
    "--motion-hover-image-scale": String(tokens.hover.imageScale),
    "--motion-hover-standalone-image-scale": String(tokens.hover.standaloneImageScale),
    "--motion-hover-button-lift": `${tokens.hover.buttonLift}px`,
    "--motion-hover-button-scale": String(tokens.hover.buttonScale),
    "--motion-hover-tap-scale": String(tokens.hover.tapScale),
    "--motion-hover-title-x": `${tokens.hover.titleX}px`,
    "--motion-hover-arrow-x": `${tokens.hover.arrowX}px`,
    "--motion-hover-shadow": tokens.hover.shadow,
    "--motion-hover-image-shadow": tokens.hover.imageShadow,
    "--motion-hover-button-shadow": tokens.hover.buttonShadow,
    "--motion-hover-tag-background": tokens.hover.tagBackground,
    "--motion-hover-nav-underline-opacity": String(tokens.hover.navUnderlineOpacity),
    "--motion-photo-reveal-scale": String(tokens.photography.revealScale),
    "--motion-photo-hover-scale": String(tokens.photography.hoverScale),
    "--motion-photo-radius": `${tokens.photography.radius}px`,
    "--motion-photo-mask-inset": `${tokens.photography.maskInset}%`,
    "--motion-photo-shadow": tokens.photography.shadow,
    "--motion-photo-hover-shadow": tokens.photography.hoverShadow,
    "--motion-photo-placeholder-blur": `${tokens.photography.placeholderBlur}px`,
    "--motion-ambient-logo-duration": `${tokens.ambient.logoDuration}ms`,
    "--motion-ambient-background-duration": `${tokens.ambient.backgroundDuration}ms`,
    "--motion-ambient-shadow-duration": `${tokens.ambient.shadowDuration}ms`,
    "--motion-ambient-curve-duration": `${tokens.ambient.curveDuration}ms`,
    "--motion-ambient-light-duration": `${tokens.ambient.lightDuration}ms`,
    "--motion-ambient-max-move": `${tokens.ambient.maxMove}px`,
    "--motion-ambient-max-rotate": `${tokens.ambient.maxRotate}deg`,
    "--motion-ambient-logo-move": `${tokens.ambient.logoMove}px`,
    "--motion-ambient-logo-scale": String(tokens.ambient.logoScale),
    "--motion-ambient-shadow-opacity": String(tokens.ambient.shadowOpacity),
    "--motion-ambient-background-opacity": String(tokens.ambient.backgroundOpacity),
    "--motion-hero-duration": `${tokens.hero.duration}ms`,
    "--motion-hero-x": `${tokens.hero.x}px`,
    "--motion-hero-y": `${tokens.hero.y}px`,
    "--motion-hero-rotate": `${tokens.hero.rotate}deg`,
    "--motion-hero-background-opacity": String(tokens.hero.backgroundOpacity),
    "--motion-hero-breath-scale": String(tokens.hero.breathScale),
    "--motion-hero-title-opacity": String(tokens.hero.titleOpacity),
  } as CSSProperties;
}

export function MotionProvider({ children }: { children: ReactNode }) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const value = useMemo(() => ({ tokens: motionTokens, prefersReducedMotion }), [prefersReducedMotion]);

  return (
    <MotionContext.Provider value={value}>
      <div
        className="duomei-motion-root"
        data-reduced-motion={prefersReducedMotion ? "true" : "false"}
        style={cssVars(motionTokens)}
      >
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function useMotion() {
  return useContext(MotionContext);
}
