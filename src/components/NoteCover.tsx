import { useEffect, useRef, useState } from "react";
import type { DuomeiNote } from "../lib/noteTypes";
import { getDefaultCoverForNote } from "../lib/defaultCovers";
import { PlaceholderCover } from "./PlaceholderCover";

export function NoteCover({ note, detail = false }: { note: DuomeiNote; detail?: boolean }) {
  const imageRef = useRef<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFailed(false);
    setLoaded(false);
  }, [note.coverImageUrl, note.id, note.slug]);

  const coverSrc = note.coverImageUrl || getDefaultCoverForNote(note);

  useEffect(() => {
    const image = imageRef.current;
    if (!image) return;
    if (image.complete && image.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [coverSrc]);

  if (!coverSrc || failed) {
    return <PlaceholderCover location={note.location} title={note.title} />;
  }

  return (
    <img
      ref={imageRef}
      className={[
        "note-real-image",
        "duomei-photography-media",
        detail ? "" : "duomei-progressive-image-media",
        loaded ? "is-loaded" : "",
        detail ? "detail-image" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      src={coverSrc}
      alt={note.title}
      loading={detail ? "eager" : "lazy"}
      fetchPriority={detail ? "high" : "auto"}
      decoding="async"
      onLoad={(event) => {
        if (event.currentTarget.naturalWidth > 0) setLoaded(true);
      }}
      onError={() => setFailed(true)}
    />
  );
}
