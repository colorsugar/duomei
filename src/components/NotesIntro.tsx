import { useEffect, useState } from "react";
import {
  HOME_SETTINGS_UPDATED_EVENT,
  getHomeSettings,
  saveHomeSettings,
} from "../lib/homeSettings";
import { AnimatedButton, AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

export function NotesIntro({ onCreate, canCreate }: { onCreate: () => void; canCreate: boolean }) {
  const [settings, setSettings] = useState(() => getHomeSettings());

  useEffect(() => {
    const refresh = () => setSettings(getHomeSettings());
    window.addEventListener(HOME_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(HOME_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = (key: keyof typeof settings, value: string) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveHomeSettings(next);
  };

  return (
    <RevealSection className={`notes-intro${canCreate ? " is-editable" : ""}`}>
      {canCreate ? (
        <>
          <input
            className="notes-intro-title"
            value={settings.notesTitle}
            onChange={(event) => update("notesTitle", event.target.value)}
            aria-label="小记标题"
          />
          <input
            className="notes-intro-subtitle"
            value={settings.notesSubtitle}
            onChange={(event) => update("notesSubtitle", event.target.value)}
            aria-label="小记副标题"
          />
        </>
      ) : (
        <>
          <AnimatedTitle as="h2">{settings.notesTitle}</AnimatedTitle>
          <AnimatedParagraph as="span">{settings.notesSubtitle}</AnimatedParagraph>
        </>
      )}
      {canCreate ? (
        <AnimatedButton type="button" onClick={onCreate}>
          新增小记
        </AnimatedButton>
      ) : null}
    </RevealSection>
  );
}
