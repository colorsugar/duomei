export type FooterSettings = {
  copyrightText: string;
};

const FOOTER_SETTINGS_KEY = "duomei-footer-settings";
export const FOOTER_SETTINGS_UPDATED_EVENT = "duomei-footer-settings-updated";

export const defaultFooterSettings: FooterSettings = {
  copyrightText: "© 多美2026 记录旅途，遇见生活，也遇见自己。",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getFooterSettings(): FooterSettings {
  if (!canUseStorage()) return defaultFooterSettings;
  const raw = window.localStorage.getItem(FOOTER_SETTINGS_KEY);
  if (!raw) return defaultFooterSettings;
  try {
    return { ...defaultFooterSettings, ...JSON.parse(raw) };
  } catch {
    return defaultFooterSettings;
  }
}

export function saveFooterSettings(settings: FooterSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(FOOTER_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(FOOTER_SETTINGS_UPDATED_EVENT));
}
