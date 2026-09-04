import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import {
  FOOTER_SETTINGS_UPDATED_EVENT,
  getFooterSettings,
  saveFooterSettings,
} from "../lib/footerSettings";
import { AnimatedParagraph, AnimatedTitle, RevealSection } from "../motion";

const quickLinks = [
  { label: "首页", to: "/" },
  { label: "早报", to: "/#zaobao" },
  { label: "小记", to: "/#notes" },
  { label: "故语", to: "/#guyu" },
  { label: "云游", to: "/#yunyou" },
  { label: "颜色", to: "/#color" },
  { label: "微言", to: "/#weiyan" },
  { label: "Skill", to: "/#skills" },
] as const;

function splitCopyrightPhrases(value: string) {
  const parts = value.match(/[^，。！？；,.!?;\s]+[，。！？；,.!?;]?|©/gu) ?? [value];
  if (parts[0] === "©" && parts[1]) return [`© ${parts[1]}`, ...parts.slice(2)];
  return parts;
}

export function DuomeiFooter() {
  const { editMode, isLoggedIn } = useDuomeiEdit();
  const [settings, setSettings] = useState(() => getFooterSettings());
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

  return (
    <RevealSection
      as="footer"
      className="duomei-footer"
    >
      <AnimatedTitle as="strong">DUOMEI</AnimatedTitle>
      <nav className="duomei-quick-nav" aria-label="全站快捷导航">
        <ul>
          {quickLinks.map((link) => (
            <li key={link.label}><Link to={link.to}>{link.label}</Link></li>
          ))}
        </ul>
      </nav>
      {editable ? (
        <p
          className="duomei-footer-copy footer-editable-text"
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
        <AnimatedParagraph className="duomei-footer-copy">
          {splitCopyrightPhrases(settings.copyrightText).map((phrase, index) => (
            <span className="duomei-footer-copy-segment" key={`${phrase}-${index}`}>{phrase}</span>
          ))}
        </AnimatedParagraph>
      )}
    </RevealSection>
  );
}
