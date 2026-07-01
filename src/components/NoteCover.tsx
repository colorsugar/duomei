import { useEffect, useState } from "react";
import type { DuomeiNote } from "../lib/noteTypes";
import { PlaceholderCover } from "./PlaceholderCover";

export function NoteCover({ note, detail = false }: { note: DuomeiNote; detail?: boolean }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [note.coverImageUrl]);

  if (!note.coverImageUrl || failed) {
    return <PlaceholderCover location={note.location} title={note.title} />;
  }

  return (
    <img
      className={[
        "note-real-image",
        "duomei-photography-media",
        "duomei-progressive-image-media",
        loaded ? "is-loaded" : "",
        detail ? "detail-image" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      src={note.coverImageUrl}
      alt={note.title}
      loading={detail ? "eager" : "lazy"}
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}
