import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { guyuBooks } from "../content/guyuBooks";
import { HomeSectionHold } from "./HomeSectionHold";

export function GuyuShelfPreview() {
  const [bookIndex, setBookIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const bookCount = guyuBooks.length;
  const book = guyuBooks[bookIndex] ?? guyuBooks[0];

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotionPreference = () => setReducedMotion(mediaQuery.matches);
    updateMotionPreference();
    mediaQuery.addEventListener("change", updateMotionPreference);
    return () => mediaQuery.removeEventListener("change", updateMotionPreference);
  }, []);

  useEffect(() => {
    if (reducedMotion || bookCount < 2) return;
    let dwellTimer = 0;
    let switchTimer = 0;

    const queueNextBook = () => {
      dwellTimer = window.setTimeout(() => {
        setIsTransitioning(true);
        switchTimer = window.setTimeout(() => {
          setBookIndex((current) => (current + 1) % bookCount);
          setIsTransitioning(false);
          queueNextBook();
        }, 420);
      }, 2500);
    };

    queueNextBook();
    return () => {
      window.clearTimeout(dwellTimer);
      window.clearTimeout(switchTimer);
    };
  }, [bookCount, reducedMotion]);

  if (!book) return null;
  const isNewStory = book.chapter === "新说";
  const sectionLabel = isNewStory ? "新说" : "故语";
  const shelfLabel = book.kind;

  return (
    <HomeSectionHold id="guyu" className="guyu-home-shelf" ariaLabelledBy="guyu-home-shelf-title">
      <header className="guyu-home-shelf-heading">
        <h2 id="guyu-home-shelf-title">故语</h2>
        <p>把旧日收好，等后来的人翻阅。</p>
      </header>

      <Link
        className={`guyu-home-work${isTransitioning ? " is-transitioning" : ""}`}
        to="/guyu"
        aria-label={`前往故语书架，查看${sectionLabel}《${book.title}》`}
      >
        <span className="guyu-home-book" aria-hidden="true">
          <img
            src={book.previewCoverSrc}
            width="1100"
            height="1684"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </span>

        <span className="guyu-home-work-copy">
          <span className="guyu-home-work-kind">{sectionLabel} · {shelfLabel}</span>
          <strong className="guyu-title-phrases" aria-label={book.title}>
            {book.title.split(/\s+/u).map((part) => <span key={part}>{part}</span>)}
          </strong>
          <span>{book.description}</span>
          <span className="guyu-home-work-open">翻开这一本</span>
        </span>
      </Link>

      <p className="guyu-home-shelf-note">有些话，只适合留在纸页之间。</p>
    </HomeSectionHold>
  );
}
