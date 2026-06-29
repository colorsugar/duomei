export type AboutSettings = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
};

const ABOUT_SETTINGS_KEY = "duomei-about-settings";
export const ABOUT_SETTINGS_UPDATED_EVENT = "duomei-about-settings-updated";

export const defaultAboutSettings: AboutSettings = {
  eyebrow: "ABOUT",
  title: "关于多美小记",
  paragraphs: [
    "多美小记是一个很小的个人记录空间。它暂时不区分复杂栏目，只保存旅途记录、生活记录、旅行照片和心情文字。",
    "希望每一次打开，都像翻到一页安静的旅行手账。",
  ],
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getAboutSettings(): AboutSettings {
  if (!canUseStorage()) return defaultAboutSettings;
  const raw = window.localStorage.getItem(ABOUT_SETTINGS_KEY);
  if (!raw) return defaultAboutSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<AboutSettings>;
    return {
      ...defaultAboutSettings,
      ...parsed,
      paragraphs: parsed.paragraphs?.length ? parsed.paragraphs : defaultAboutSettings.paragraphs,
    };
  } catch {
    return defaultAboutSettings;
  }
}

export function saveAboutSettings(settings: AboutSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ABOUT_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(ABOUT_SETTINGS_UPDATED_EVENT));
}
