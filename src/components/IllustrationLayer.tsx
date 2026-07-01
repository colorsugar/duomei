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
        const next = { ...settings, [field]: event.currentTarget.textContent?.trim() || settings[field] };
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

  return (
    <RevealSection as="section" className={`illustration-layer duomei-motion-ambient-background${editable ? " hero-editing" : ""}`} aria-label="DUOMEI hero">
      <div className="illustration-layer-inner">
        <HeroIllustration />
        <BounceName />
        <HeroEditableText field="subname" settings={settings} className="duomei-hero-subname" editable={editable} onChange={setSettings} />
        <HeroEditableText field="line" settings={settings} className="duomei-hero-line" editable={editable} onChange={setSettings} />
        <HeroEditableText field="scrollHint" settings={settings} className="duomei-scroll-hint" editable={editable} onChange={setSettings} />
      </div>
    </RevealSection>
  );
}
