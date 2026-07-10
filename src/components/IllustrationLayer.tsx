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
    let readFrame = 0;
    let drawFrame = 0;
    let targetProgress = 0;
    let displayedProgress = -1;

    const setProgress = (value: number) => {
      const rounded = Number(value.toFixed(4));
      if (rounded === displayedProgress) return;
      displayedProgress = rounded;
      document.documentElement.style.setProperty("--duomei-hero-progress", String(rounded));
    };

    const readTargetProgress = () => {
      const viewport = Math.max(window.innerHeight, 1);
      targetProgress = Math.min(1, Math.max(0, window.scrollY / (viewport * 0.82)));
    };

    const draw = () => {
      const next = displayedProgress < 0 ? targetProgress : displayedProgress + (targetProgress - displayedProgress) * 0.18;
      setProgress(Math.abs(targetProgress - next) < 0.001 ? targetProgress : next);

      if (Math.abs(targetProgress - displayedProgress) > 0.001) {
        drawFrame = window.requestAnimationFrame(draw);
      } else {
        drawFrame = 0;
      }
    };

    const update = () => {
      readFrame = 0;
      readTargetProgress();
      if (!drawFrame) draw();
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
      if (drawFrame) window.cancelAnimationFrame(drawFrame);
      document.documentElement.style.removeProperty("--duomei-hero-progress");
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
