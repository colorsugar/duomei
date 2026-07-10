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
    src: "/images/note-default-covers/duomei-default-cover-01.png",
  },
  {
    id: "window-morning-note",
    label: "窗前晨光",
    src: "/images/note-default-covers/duomei-default-cover-02.png",
  },
  {
    id: "duomei-paper",
    label: "多美纸影",
    src: "/images/note-default-covers/duomei-default-cover-03.png",
  },
  {
    id: "old-town-overlook",
    label: "城上远眺",
    src: "/images/note-default-covers/duomei-default-cover-04.png",
  },
  {
    id: "desk-camera-light",
    label: "桌边光影",
    src: "/images/note-default-covers/duomei-default-cover-05.png",
  },
  {
    id: "guilin-river-tea",
    label: "漓江茶光",
    src: "/images/note-default-covers/duomei-default-cover-06.png",
  },
  {
    id: "guilin-matcha-parfait",
    label: "山水甜品",
    src: "/images/note-default-covers/duomei-default-cover-07.png",
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
