import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./en";
import { ja } from "./ja";
import { zh, type I18nKey } from "./zh";

export type Lang = "zh" | "en" | "ja";
export const LANGS: readonly Lang[] = ["zh", "en", "ja"];
const isLang = (value: unknown): value is Lang => typeof value === "string" && (LANGS as readonly string[]).includes(value);
const HTML_LANG: Record<Lang, string> = { zh: "zh-CN", en: "en", ja: "ja" };
export const LANG_STORAGE_KEY = "duomei-lang";

const dictionaries: Record<Lang, Record<I18nKey, string>> = { zh, en, ja };

// Chinese is the default. ?lang=zh|en|ja wins (and is remembered), then localStorage, then zh.
export function readInitialLang(): Lang {
  if (typeof window === "undefined") return "zh";
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    if (isLang(fromQuery)) {
      window.localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(saved) ? saved : "zh";
  } catch {
    return "zh";
  }
}

type Vars = Record<string, string | number>;
type I18nValue = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: I18nKey, vars?: Vars) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function format(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => (name in vars ? String(vars[name]) : `{${name}}`));
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(readInitialLang);

  useEffect(() => {
    // Leave <html lang="zh-CN"> exactly as shipped unless another language is chosen.
    document.documentElement.lang = HTML_LANG[lang];
    for (const l of LANGS) if (l !== "zh") document.documentElement.classList.toggle(`lang-${l}`, lang === l);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang") || next !== "zh") {
        if (next !== "zh") url.searchParams.set("lang", next);
        else url.searchParams.delete("lang");
        window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      }
    } catch {
      /* storage unavailable: the choice lasts for this visit */
    }
  }, []);

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => format(dictionaries[lang][key] ?? zh[key], vars) }),
    [lang, setLang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return { lang: "zh", setLang: () => undefined, t: (key, vars) => format(zh[key], vars) };
}

export function useT() {
  return useI18n().t;
}
