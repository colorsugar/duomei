import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { en } from "./en";
import { zh, type I18nKey } from "./zh";

export type Lang = "zh" | "en";
export const LANG_STORAGE_KEY = "duomei-lang";

const dictionaries: Record<Lang, Record<I18nKey, string>> = { zh, en };

// Chinese is the default. ?lang=en|zh wins (and is remembered), then localStorage, then zh.
export function readInitialLang(): Lang {
  if (typeof window === "undefined") return "zh";
  try {
    const fromQuery = new URLSearchParams(window.location.search).get("lang");
    if (fromQuery === "en" || fromQuery === "zh") {
      window.localStorage.setItem(LANG_STORAGE_KEY, fromQuery);
      return fromQuery;
    }
    return window.localStorage.getItem(LANG_STORAGE_KEY) === "en" ? "en" : "zh";
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
    // Leave <html lang="zh-CN"> exactly as shipped unless English is chosen.
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.documentElement.classList.toggle("lang-en", lang === "en");
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
      const url = new URL(window.location.href);
      if (url.searchParams.has("lang") || next === "en") {
        if (next === "en") url.searchParams.set("lang", "en");
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
