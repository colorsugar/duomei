import { useEffect, useState } from "react";
import { getSettings } from "../lib/cmsStore";

const INTRO_KEY = "tami-intro-played";

export function IntroOverlay() {
  const [visible, setVisible] = useState(false);
  const settings = getSettings();

  useEffect(() => {
    if (sessionStorage.getItem(INTRO_KEY) === "true") return;

    setVisible(true);
    document.body.classList.add("intro-playing");
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(INTRO_KEY, "true");
      setVisible(false);
      document.body.classList.remove("intro-playing");
    }, 1650);

    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("intro-playing");
    };
  }, []);

  if (!visible) return null;

  return (
    <div className="intro-overlay" aria-label="TAMI Digital Archive intro">
      <div>
        <strong>TAMI</strong>
        <span>Digital Archive</span>
        <em>{settings.introYear}</em>
      </div>
    </div>
  );
}
