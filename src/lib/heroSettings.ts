export type HeroTextSettings = {
  subname: string;
  line: string;
  scrollHint: string;
};

const HERO_TEXT_KEY = "duomei-hero-text-settings";
export const HERO_TEXT_UPDATED_EVENT = "duomei-hero-text-updated";
const legacyScrollHints = new Set(["\u5411\u4e0b\u6ed1\u52a8"]);

export const defaultHeroTextSettings: HeroTextSettings = {
  subname: "多美小记",
  line: "记录旅途，遇见生活，也遇见自己。",
  scrollHint: "",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function cleanSettings(settings: Partial<HeroTextSettings>): HeroTextSettings {
  const hasScrollHint = Object.prototype.hasOwnProperty.call(settings, "scrollHint");
  const scrollHint = settings.scrollHint?.trim() ?? "";
  return {
    subname: settings.subname?.trim() || defaultHeroTextSettings.subname,
    line: settings.line?.trim() || defaultHeroTextSettings.line,
    scrollHint: hasScrollHint ? (legacyScrollHints.has(scrollHint) ? "" : scrollHint) : defaultHeroTextSettings.scrollHint,
  };
}

export function getHeroTextSettings(): HeroTextSettings {
  if (!canUseStorage()) return defaultHeroTextSettings;
  const raw = window.localStorage.getItem(HERO_TEXT_KEY);
  if (!raw) return defaultHeroTextSettings;
  try {
    return cleanSettings({ ...defaultHeroTextSettings, ...JSON.parse(raw) });
  } catch {
    return defaultHeroTextSettings;
  }
}

export function saveHeroTextSettings(settings: HeroTextSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(HERO_TEXT_KEY, JSON.stringify(cleanSettings(settings)));
  window.dispatchEvent(new CustomEvent(HERO_TEXT_UPDATED_EVENT));
}
