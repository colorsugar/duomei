import { useState } from "react";
import type { DuomeiNote } from "../lib/noteTypes";
import { PlaceholderCover } from "./PlaceholderCover";

export function NoteCover({ note, detail = false }: { note: DuomeiNote; detail?: boolean }) {
  const [failed, setFailed] = useState(false);

  if (!note.coverImageUrl || failed) {
    return <PlaceholderCover location={note.location} title={note.title} />;
  }

  return (
    <img
      className={detail ? "note-real-image detail-image" : "note-real-image"}
      src={note.coverImageUrl}
      alt={note.title}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
