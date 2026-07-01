import { defaultNotes } from "./defaultNotes";
import type { DuomeiNote, NoteContentBlock, NoteState } from "./noteTypes";

const NOTE_STORAGE_KEY = "duomei-notes-state";
const AUTH_KEY = "tami-admin-auth";
export const NOTE_UPDATED_EVENT = "duomei-notes-updated";

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function emitUpdate() {
  window.dispatchEvent(new CustomEvent(NOTE_UPDATED_EVENT));
}

function normalizeNote(note: DuomeiNote): DuomeiNote {
  const contentBlocks = note.contentBlocks?.length
    ? note.contentBlocks
    : bodyToBlocks(note.body ?? "", note.bodyImages ?? []);

  return {
    ...note,
    bodyImages: note.bodyImages ?? [],
    contentBlocks,
    stylePrompt: note.stylePrompt ?? "",
    coverImageUrl: note.coverImageUrl ?? "",
    status: note.status ?? "published",
  };
}

export function createBlockId(type = "block") {
  return `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function bodyToBlocks(body: string, images: string[] = []): NoteContentBlock[] {
  const textBlocks = body
    .split("\n")
    .map((text) => text.trim())
    .filter(Boolean)
    .map<NoteContentBlock>((text) => ({ id: createBlockId("paragraph"), type: "paragraph", text }));

  const imageBlocks = images.map<NoteContentBlock>((src) => ({
    id: createBlockId("image"),
    type: "image",
    src,
    align: "center",
    zoom: 100,
  }));

  return [...textBlocks, ...imageBlocks].length
    ? [...textBlocks, ...imageBlocks]
    : [{ id: createBlockId("paragraph"), type: "paragraph", text: "" }];
}

export function createDraftNote(): DuomeiNote {
  const now = new Date().toISOString();
  const slug = `note-${Date.now()}`;
  return {
    id: crypto.randomUUID(),
    slug,
    title: "未命名小记",
    date: "2026.06.29",
    location: "",
    category: "小记",
    tags: [],
    excerpt: "",
    body: "",
    coverImageUrl: "",
    bodyImages: [],
    contentBlocks: [{ id: createBlockId("paragraph"), type: "paragraph", text: "" }],
    stylePrompt: "",
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };
}
function normalizeState(state: NoteState): NoteState {
  return { notes: (state.notes ?? defaultNotes).map(normalizeNote) };
}

export function getNoteState(): NoteState {
  if (!canUseStorage()) return { notes: defaultNotes };
  const raw = window.localStorage.getItem(NOTE_STORAGE_KEY);
  if (!raw) {
    const state = { notes: defaultNotes };
    window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(state));
    return state;
  }
  try {
    const parsed = JSON.parse(raw) as NoteState;
    return normalizeState(parsed);
  } catch {
    const state = { notes: defaultNotes };
    window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(state));
    return state;
  }
}

export function saveNoteState(state: NoteState) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(NOTE_STORAGE_KEY, JSON.stringify(state));
  emitUpdate();
}

export function getAllNotes() {
  return [...getNoteState().notes].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPublishedNotes() {
  return getAllNotes().filter((note) => note.status === "published");
}

export function getNoteBySlug(slug = "", includeDrafts = false) {
  return (includeDrafts ? getAllNotes() : getPublishedNotes()).find((note) => note.slug === slug);
}

export function upsertNote(note: DuomeiNote) {
  const state = getNoteState();
  const exists = state.notes.some((item) => item.id === note.id);
  const notes = exists
    ? state.notes.map((item) => (item.id === note.id ? normalizeNote(note) : item))
    : [normalizeNote(note), ...state.notes];
  saveNoteState({ notes });
}

export function deleteNote(id: string) {
  saveNoteState({ notes: getNoteState().notes.filter((note) => note.id !== id) });
}

export function isAdminLoggedIn() {
  return canUseStorage() && window.localStorage.getItem(AUTH_KEY) === "true";
}

export function loginAdmin(username: string, password: string) {
  const ok = username === "tami" && password === "tamidesu";
  if (ok && canUseStorage()) {
    window.localStorage.setItem(AUTH_KEY, "true");
    emitUpdate();
  }
  return ok;
}

export function logoutAdmin() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_KEY);
  emitUpdate();
}

export function exportNotesJson() {
  return JSON.stringify(getNoteState(), null, 2);
}

export function importNotesJson(json: string) {
  const parsed = JSON.parse(json) as NoteState;
  saveNoteState(normalizeState(parsed));
}

export function generateDefaultNotesSource() {
  return `import type { DuomeiNote } from "./noteTypes";\n\nexport const defaultNotes: DuomeiNote[] = ${JSON.stringify(getAllNotes(), null, 2)};\n`;
}

