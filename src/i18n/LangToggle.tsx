import { useI18n } from "./I18nProvider";

// 中 / EN segmented switch. Chinese first; the active side is marked with aria-pressed.
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang, t } = useI18n();
  return (
    <div className={`duomei-lang-toggle ${className}`.trim()} role="group" aria-label={t("lang.switch")}>
      <button type="button" lang="zh-CN" aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>
        中
      </button>
      <span aria-hidden="true">/</span>
      <button type="button" lang="en" aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
    </div>
  );
}
