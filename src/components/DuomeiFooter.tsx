import { CSSProperties, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import {
  FOOTER_SETTINGS_UPDATED_EVENT,
  getFooterSettings,
  saveFooterSettings,
} from "../lib/footerSettings";
import { AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

export function DuomeiFooter() {
  const { editMode, isLoggedIn } = useDuomeiEdit();
  const [settings, setSettings] = useState(() => getFooterSettings());
  const footerRef = useRef<HTMLElement | null>(null);
  const [lineProgress, setLineProgress] = useState(0);
  const editable = isLoggedIn && editMode;

  useEffect(() => {
    const refresh = () => setSettings(getFooterSettings());
    window.addEventListener(FOOTER_SETTINGS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(FOOTER_SETTINGS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const updateLine = () => {
      frame = 0;
      const footer = footerRef.current;
      if (!footer) return;
      const rect = footer.getBoundingClientRect();
      const visibleFooter = window.innerHeight - rect.top;
      const progress = Math.min(1, Math.max(0, visibleFooter / Math.max(1, rect.height)));
      setLineProgress(progress);
    };
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(updateLine);
    };
    updateLine();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <RevealSection
      as="footer"
      className="duomei-footer"
      motionRef={footerRef}
      style={{ "--footer-line-progress": lineProgress } as CSSProperties}
    >
      <div className="duomei-footer-masthead">
        <AnimatedTitle as="strong">DUOMEI</AnimatedTitle>
        <AnimatedParagraph as="span">把旅途、生活和偶然的光，留在纸上。</AnimatedParagraph>
      </div>
      <div className="duomei-footer-meta">
        {editable ? (
          <p
            className="footer-editable-text"
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) => {
              const copyrightText = event.currentTarget.textContent?.trim() || settings.copyrightText;
              const next = { ...settings, copyrightText };
              saveFooterSettings(next);
              setSettings(next);
            }}
          >
            {settings.copyrightText}
          </p>
        ) : (
          <AnimatedParagraph>{settings.copyrightText}</AnimatedParagraph>
        )}
        <nav aria-label="页脚导航">
          <Link to="/">首页</Link>
          <Link to="/#notes">小记</Link>
          <Link to="/time">时光</Link>
        </nav>
      </div>
    </RevealSection>
  );
}
