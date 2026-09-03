import { useEffect, useState } from "react";
import { BounceName } from "./BounceName";
import { HeroIllustration } from "./HeroIllustration";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import {
  HERO_TEXT_UPDATED_EVENT,
  getHeroTextSettings,
  saveHeroTextSettings,
  type HeroTextSettings,
} from "../lib/heroSettings";
import { AnimatedParagraph, RevealSection } from "../motion";

type HeroEditableTextProps = {
  field: keyof HeroTextSettings;
  settings: HeroTextSettings;
  className: string;
  editable: boolean;
  onChange: (settings: HeroTextSettings) => void;
};

function HeroEditableText({ field, settings, className, editable, onChange }: HeroEditableTextProps) {
  const Tag = field === "subname" || field === "line" ? "p" : "span";

  if (!editable) {
    return (
      <AnimatedParagraph as={Tag} className={className}>
        {settings[field]}
      </AnimatedParagraph>
    );
  }

  return (
    <Tag
      className={`${className} hero-inline-editable`}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => {
        const value = event.currentTarget.textContent?.trim() ?? "";
        const next = { ...settings, [field]: field === "scrollHint" ? value : value || settings[field] };
        saveHeroTextSettings(next);
        onChange(next);
      }}
    >
      {settings[field]}
    </Tag>
  );
}

export function IllustrationLayer() {
  const { isLoggedIn, editMode } = useDuomeiEdit();
  const [settings, setSettings] = useState(() => getHeroTextSettings());
  const editable = isLoggedIn && editMode;

  useEffect(() => {
    const refresh = () => setSettings(getHeroTextSettings());
    window.addEventListener(HERO_TEXT_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HERO_TEXT_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    // Reduced motion: the hero stays put; the CSS side already freezes its keyframes.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let readFrame = 0;
    let targetProgress = 0;
    let displayedProgress = -1;
    const setProgress = (value: number) => {
      const rounded = Number(value.toFixed(4));
      if (rounded === displayedProgress) return;
      displayedProgress = rounded;
      document.documentElement.style.setProperty("--duomei-hero-progress", String(rounded));
      document.documentElement.style.setProperty("--duomei-kinetic-hero-lift", `${rounded * -176}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-hero-scale", String(1 + rounded * 0.24));
      document.documentElement.style.setProperty("--duomei-kinetic-hero-spin", `${rounded * -5.5}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-letter-scale", String(1 + rounded * 0.42));
      document.documentElement.style.setProperty("--duomei-kinetic-left-far", `${rounded * -190}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-left-near", `${rounded * -112}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-left-soft", `${rounded * -52}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-right-soft", `${rounded * 52}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-right-near", `${rounded * 112}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-right-far", `${rounded * 190}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-up-near", `${rounded * -72}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-up-far", `${rounded * -126}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-down-near", `${rounded * 52}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-down-far", `${rounded * 96}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-left-far", `${rounded * -34}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-left", `${rounded * -21}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-left-soft", `${rounded * -11}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-right-soft", `${rounded * 11}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-right", `${rounded * 21}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-spin-right-far", `${rounded * 34}deg`);
      document.documentElement.style.setProperty("--duomei-kinetic-copy-lift", `${rounded * -74}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-copy-opacity", String(Math.max(0, 1 - rounded * 1.32)));
    };

    const setPaperProgress = (value: number) => {
      const paperProgress = Number(Math.min(1, Math.max(0, value * 1.2)).toFixed(4));
      document.documentElement.style.setProperty("--duomei-paper-progress", String(paperProgress));
      document.documentElement.style.setProperty("--duomei-kinetic-paper-lift", `${paperProgress * -42}px`);
      document.documentElement.style.setProperty("--duomei-kinetic-paper-scale", String(1 + paperProgress * 0.18));
    };

    const readTargetProgress = () => {
      const viewport = Math.max(window.innerHeight, 1);
      targetProgress = Math.min(1, Math.max(0, window.scrollY / (viewport * 0.82)));
    };

    const update = () => {
      readFrame = 0;
      readTargetProgress();
      // Lenis already eases the scroll position. A second lerp here made the
      // hero lag behind the paper curve and the kinetic canvas, so every layer
      // now reads the same eased scroll value directly.
      setPaperProgress(targetProgress);
      setProgress(targetProgress);
    };

    const requestUpdate = () => {
      if (readFrame) return;
      readFrame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    return () => {
      if (readFrame) window.cancelAnimationFrame(readFrame);
      document.documentElement.style.removeProperty("--duomei-hero-progress");
      document.documentElement.style.removeProperty("--duomei-paper-progress");
      [
        "--duomei-kinetic-hero-lift",
        "--duomei-kinetic-hero-scale",
        "--duomei-kinetic-hero-spin",
        "--duomei-kinetic-letter-scale",
        "--duomei-kinetic-left-far",
        "--duomei-kinetic-left-near",
        "--duomei-kinetic-left-soft",
        "--duomei-kinetic-right-soft",
        "--duomei-kinetic-right-near",
        "--duomei-kinetic-right-far",
        "--duomei-kinetic-up-near",
        "--duomei-kinetic-up-far",
        "--duomei-kinetic-down-near",
        "--duomei-kinetic-down-far",
        "--duomei-kinetic-spin-left-far",
        "--duomei-kinetic-spin-left",
        "--duomei-kinetic-spin-left-soft",
        "--duomei-kinetic-spin-right-soft",
        "--duomei-kinetic-spin-right",
        "--duomei-kinetic-spin-right-far",
        "--duomei-kinetic-copy-lift",
        "--duomei-kinetic-copy-opacity",
        "--duomei-kinetic-paper-lift",
        "--duomei-kinetic-paper-scale",
      ].forEach((property) => document.documentElement.style.removeProperty(property));
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
    };
  }, []);

  return (
    <RevealSection
      as="section"
      className={`illustration-layer duomei-motion-ambient-background${editable ? " hero-editing" : ""}`}
      aria-label="DUOMEI hero"
    >
      <div className="illustration-layer-inner">
        <div className="duomei-hero-trace" aria-hidden="true" />
        <HeroIllustration />
        <BounceName />
        <HeroEditableText field="subname" settings={settings} className="duomei-hero-subname" editable={editable} onChange={setSettings} />
        <HeroEditableText field="line" settings={settings} className="duomei-hero-line" editable={editable} onChange={setSettings} />
        <HeroEditableText field="scrollHint" settings={settings} className="duomei-scroll-hint" editable={editable} onChange={setSettings} />
      </div>
    </RevealSection>
  );
}
