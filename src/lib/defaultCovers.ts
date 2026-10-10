import type { DuomeiNote } from "./noteTypes";

export type DefaultCover = {
  id: string;
  label: string;
  src: string;
};

export const defaultCovers: DefaultCover[] = [
  {
    id: "tea-town-sunset",
    label: "古镇夕照",
    src: "/images/note-default-covers/duomei-default-cover-01.webp",
  },
  {
    id: "window-morning-note",
    label: "窗前晨光",
    src: "/images/note-default-covers/duomei-default-cover-02.webp",
  },
  {
    id: "duomei-paper",
    label: "多美纸影",
    src: "/images/note-default-covers/duomei-default-cover-03.webp",
  },
  {
    id: "old-town-overlook",
    label: "城上远眺",
    src: "/images/note-default-covers/duomei-default-cover-04.webp",
  },
  {
    id: "desk-camera-light",
    label: "桌边光影",
    src: "/images/note-default-covers/duomei-default-cover-05.webp",
  },
  {
    id: "guilin-river-tea",
    label: "漓江茶光",
    src: "/images/note-default-covers/duomei-default-cover-06.webp",
  },
  {
    id: "guilin-matcha-parfait",
    label: "山水甜品",
    src: "/images/note-default-covers/duomei-default-cover-07.webp",
  },
];

function hashText(text: string) {
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function getDefaultCoverForNote(note: Pick<DuomeiNote, "id" | "slug" | "title">) {
  if (!defaultCovers.length) return "";
  const key = note.id || note.slug || note.title || "duomei-note";
  return defaultCovers[hashText(key) % defaultCovers.length].src;
}
