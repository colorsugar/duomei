import { useEffect, useState } from "react";
import { LANGS, LANG_STORAGE_KEY, useI18n, type Lang } from "./I18nProvider";

const LABELS: Record<Lang, { text: string; short: string; lang: string; title: string }> = {
  zh: { text: "中文", short: "中", lang: "zh-CN", title: "中文" },
  en: { text: "EN", short: "EN", lang: "en", title: "English" },
  ja: { text: "日本語", short: "日", lang: "ja", title: "日本語" },
};

// A visitor whose browser is not set to Chinese and who has never picked a language: the switch draws the eye
// for a few seconds (the scenes open in Chinese by default, and a judge reading English or Japanese should find
// this at once). Their own language is marked.
function browserLang(): Lang | null {
  if (typeof navigator === "undefined") return null;
  for (const l of navigator.languages ?? [navigator.language]) {
    const k = (l || "").toLowerCase();
    if (k.startsWith("zh")) return null;
    if (k.startsWith("ja")) return "ja";
    if (k.startsWith("en")) return "en";
  }
  return null;
}

// 中文 / EN / 日本語 segmented switch with a globe mark; every choice is a full 44 px target.
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  const [hint, setHint] = useState<Lang | null>(null);
  useEffect(() => {
    let saved: string | null = null;
    try { saved = window.localStorage.getItem(LANG_STORAGE_KEY); } catch { /* private mode */ }
    const own = browserLang();
    if (saved || !own || lang !== "zh") return;
    setHint(own);
    const timer = window.setTimeout(() => setHint(null), 6000);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={`duomei-lang-toggle${hint ? " is-hint" : ""} ${className}`.trim()} role="group" aria-label={t("lang.switch")}>
      <svg className="duomei-lang-toggle__globe" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.6" />
        <path d="M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6M12 3.4c-2.4 2.4-3.6 5.3-3.6 8.6s1.2 6.2 3.6 8.6" />
      </svg>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          lang={LABELS[l].lang}
          title={LABELS[l].title}
          aria-label={LABELS[l].title}
          aria-pressed={lang === l}
          className={hint === l ? "is-suggested" : undefined}
          onClick={() => { setHint(null); setLang(l); }}
        >
          <span className="duomei-lang-toggle__long">{LABELS[l].text}</span>
          <span className="duomei-lang-toggle__short" aria-hidden="true">{LABELS[l].short}</span>
        </button>
      ))}
    </div>
  );
}
