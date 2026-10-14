import { LANGS, useI18n, type Lang } from "./I18nProvider";

const LABELS: Record<Lang, { text: string; lang: string }> = {
  zh: { text: "中", lang: "zh-CN" },
  en: { text: "EN", lang: "en" },
  ja: { text: "日", lang: "ja" },
};

// 中 / EN / 日 segmented switch. Chinese first; the active choice is marked with aria-pressed.
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`duomei-lang-toggle ${className}`.trim()} role="group" aria-label={t("lang.switch")}>
      {LANGS.map((l, i) => (
        <span key={l} className="duomei-lang-toggle__item">
          {i > 0 && <span aria-hidden="true">/</span>}
          <button type="button" lang={LABELS[l].lang} aria-pressed={lang === l} onClick={() => setLang(l)}>
            {LABELS[l].text}
          </button>
        </span>
      ))}
    </div>
  );
}
