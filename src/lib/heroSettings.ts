export type HeroTextSettings = {
  subname: string;
  line: string;
  scrollHint: string;
};

const HERO_TEXT_KEY = "duomei-hero-text-settings";
export const HERO_TEXT_UPDATED_EVENT = "duomei-hero-text-updated";

export const defaultHeroTextSettings: HeroTextSettings = {
  subname: "多美小记",
  line: "记录旅途，遇见生活，也遇见自己。",
  scrollHint: "SCROLL",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getHeroTextSettings(): HeroTextSettings {
  if (!canUseStorage()) return defaultHeroTextSettings;
  const raw = window.localStorage.getItem(HERO_TEXT_KEY);
  if (!raw) return defaultHeroTextSettings;
  try {
    return { ...defaultHeroTextSettings, ...JSON.parse(raw) };
  } catch {
    return defaultHeroTextSettings;
  }
}

export function saveHeroTextSettings(settings: HeroTextSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(HERO_TEXT_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(HERO_TEXT_UPDATED_EVENT));
}
