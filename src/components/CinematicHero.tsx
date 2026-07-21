import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Link } from "react-router-dom";
import type { DuomeiNote } from "../lib/noteTypes";
import { NoteCover } from "./NoteCover";

export function CinematicHero({ note }: { note?: DuomeiNote }) {
  const heroRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    return () => {
      if (frameRef.current) window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  const updateDepth = (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pendingRef.current = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
    };
    event.currentTarget.classList.add("is-depth-active");
    if (frameRef.current) return;
    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const point = pendingRef.current;
      const hero = heroRef.current;
      if (!point || !hero) return;
      hero.style.setProperty("--dm3-rotate-x", `${(point.y - 0.5) * -7}deg`);
      hero.style.setProperty("--dm3-rotate-y", `${(point.x - 0.5) * 9}deg`);
      hero.style.setProperty("--dm3-light-x", `${point.x * 100}%`);
      hero.style.setProperty("--dm3-light-y", `${point.y * 100}%`);
    });
  };

  const resetDepth = () => {
    const hero = heroRef.current;
    if (!hero) return;
    hero.classList.remove("is-depth-active");
    hero.style.setProperty("--dm3-rotate-x", "0deg");
    hero.style.setProperty("--dm3-rotate-y", "0deg");
    hero.style.setProperty("--dm3-light-x", "50%");
    hero.style.setProperty("--dm3-light-y", "50%");
  };

  return (
    <section
      ref={heroRef}
      className="dm3-hero"
      aria-labelledby="dm3-hero-title"
      onPointerMove={updateDepth}
      onPointerLeave={resetDepth}
    >
      {note ? (
        <>
          <div className="dm3-hero-backdrop" aria-hidden="true">
            <NoteCover note={note} detail />
          </div>
          <div className="dm3-hero-photo" data-motion-key={`hero-image-${note.id}`}>
            <NoteCover note={note} detail />
            <button
              className="dm3-hero-focus-trigger"
              type="button"
              aria-label={`完整查看《${note.title}》的封面照片`}
              onClick={() => dialogRef.current?.showModal()}
            >
              <span>聚焦影像</span>
            </button>
          </div>
        </>
      ) : (
        <div className="dm3-hero-empty" aria-hidden="true" />
      )}

      <div className="dm3-hero-copy">
        <h1 id="dm3-hero-title">DUOMEI</h1>
        <p className="dm3-hero-cn">多美小记</p>
        {note ? (
          <div className="dm3-hero-note">
            <strong>{note.title}</strong>
            <span>{[note.location, note.date].filter(Boolean).join(" · ")}</span>
          </div>
        ) : (
          <p className="dm3-hero-note">影像与文字，按真实的路程留下。</p>
        )}
      </div>

      <div className="dm3-hero-actions">
        <a href="#notes">浏览小记</a>
        {note ? <Link to={`/note/${note.slug}`}>打开这一篇</Link> : null}
      </div>

      {note ? (
        <dialog
          ref={dialogRef}
          className="dm3-hero-dialog"
          aria-label={`《${note.title}》封面照片`}
          onClick={(event) => {
            if (event.target === event.currentTarget) event.currentTarget.close();
          }}
        >
          <div className="dm3-hero-dialog-inner">
            <NoteCover note={note} detail />
            <button type="button" onClick={() => dialogRef.current?.close()}>关闭影像</button>
          </div>
        </dialog>
      ) : null}
    </section>
  );
}
