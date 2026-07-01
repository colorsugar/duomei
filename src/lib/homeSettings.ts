export type HomeSettings = {
  notesEyebrow: string;
  notesTitle: string;
  notesSubtitle: string;
};

const HOME_SETTINGS_KEY = "duomei-home-settings";
export const HOME_SETTINGS_UPDATED_EVENT = "duomei-home-settings-updated";

export const defaultHomeSettings: HomeSettings = {
  notesEyebrow: "旅途记录 / Travel Notes",
  notesTitle: "多美的小记",
  notesSubtitle: "记录旅途中的风景、心情与故事",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function repairMojibake(settings: HomeSettings): HomeSettings {
  const looksBroken = Object.values(settings).some((value) => /[�锛绋璁澶氱]/.test(value) || value.includes("?"));
  return looksBroken ? defaultHomeSettings : settings;
}

export function getHomeSettings(): HomeSettings {
  if (!canUseStorage()) return defaultHomeSettings;
  const raw = window.localStorage.getItem(HOME_SETTINGS_KEY);
  if (!raw) return defaultHomeSettings;
  try {
    return repairMojibake({ ...defaultHomeSettings, ...(JSON.parse(raw) as Partial<HomeSettings>) });
  } catch {
    return defaultHomeSettings;
  }
}

export function saveHomeSettings(settings: HomeSettings) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(HOME_SETTINGS_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent(HOME_SETTINGS_UPDATED_EVENT));
}
