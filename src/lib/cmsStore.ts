import { defaultContent } from "./defaultContent";
import type { CmsState, ContentItem, ContentType, Profile, Settings } from "./cmsTypes";

const STORAGE_KEY = "tami-cms-state";
const AUTH_KEY = "tami-admin-auth";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalize(state: CmsState): CmsState {
  return {
    ...defaultContent,
    ...state,
    items: state.items ?? defaultContent.items,
    profile: { ...defaultContent.profile, ...state.profile },
    settings: { ...defaultContent.settings, ...state.settings },
  };
}

export function getCmsState(): CmsState {
  if (!canUseStorage()) return defaultContent;

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultContent));
    return defaultContent;
  }

  try {
    return normalize(JSON.parse(raw) as CmsState);
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultContent));
    return defaultContent;
  }
}

export function saveCmsState(state: CmsState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getAllItems() {
  return getCmsState().items.sort((a, b) => a.order - b.order);
}

export function getPublishedItems(type?: ContentType) {
  return getAllItems().filter(
    (item) => item.status === "published" && (!type || item.type === type),
  );
}

export function getHomeItems(type: ContentType) {
  return getPublishedItems(type).filter((item) => item.showOnHome);
}

export function getItemBySlug(type: ContentType, slug = "") {
  return getPublishedItems(type).find((item) => item.slug === slug);
}

export function upsertItem(item: ContentItem) {
  const state = getCmsState();
  const exists = state.items.some((current) => current.id === item.id);
  const items = exists
    ? state.items.map((current) => (current.id === item.id ? item : current))
    : [item, ...state.items];
  saveCmsState({ ...state, items });
}

export function deleteItem(id: string) {
  const state = getCmsState();
  saveCmsState({ ...state, items: state.items.filter((item) => item.id !== id) });
}

export function saveProfile(profile: Profile) {
  const state = getCmsState();
  saveCmsState({ ...state, profile });
}

export function saveSettings(settings: Settings) {
  const state = getCmsState();
  saveCmsState({ ...state, settings });
}

export function getProfile() {
  return getCmsState().profile;
}

export function getSettings() {
  return getCmsState().settings;
}

export function isAdminLoggedIn() {
  return canUseStorage() && window.localStorage.getItem(AUTH_KEY) === "true";
}

export function loginAdmin(username: string, password: string) {
  const ok = username === "tami" && password === "tamidesu";
  if (ok && canUseStorage()) window.localStorage.setItem(AUTH_KEY, "true");
  return ok;
}

export function logoutAdmin() {
  if (canUseStorage()) window.localStorage.removeItem(AUTH_KEY);
}
