import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import "./SectionTitle.css";

// One heading system for every home section. Each section owns a colour, an index and an
// English kicker; the title reveals character by character with a coloured brush stroke
// underneath, and a soft glow in the same hue sits behind the heading.
export type SectionAccent = "zaobao" | "notes" | "kuaihuo" | "guyu" | "xunji" | "dalu" | "yunyou" | "color" | "weiyan" | "skills";

type SectionTitleProps = {
  id: string;
  accent: SectionAccent;
  index: string;
  kicker: string;
  title: string;
  lede?: ReactNode;
  link?: { to: string; label: string };
  className?: string;
};

export function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

export function SectionTitle({ id, accent, index, kicker, title, lede, link, className }: SectionTitleProps) {
  const { ref, inView } = useInView<HTMLElement>();
  const characters = Array.from(title);

  return (
    <header
      ref={ref}
      className={["duomei-sec-head", className, inView ? "is-in" : ""].filter(Boolean).join(" ")}
      data-accent={accent}
    >
      <div className="duomei-sec-main">
        <p className="duomei-sec-kicker" aria-hidden="true">
          <span className="duomei-sec-index">{index}</span>
          <i className="duomei-sec-dot" />
          <span className="duomei-sec-kicker-text">{kicker}</span>
        </p>
        <h2 id={id} className="duomei-sec-title">
          <span className="duomei-sec-word">
            {characters.map((character, position) => (
              <span
                key={`${character}-${position}`}
                className="duomei-sec-char"
                style={{ "--char-index": position } as React.CSSProperties}
              >
                {character}
              </span>
            ))}
            <i className="duomei-sec-stroke" aria-hidden="true" />
          </span>
        </h2>
      </div>
      {lede || link ? (
        <div className="duomei-sec-aside">
          {lede ? <p className="duomei-sec-lede">{lede}</p> : null}
          {link ? (
            <Link className="duomei-sec-link" to={link.to}>
              <span>{link.label}</span>
              <span className="duomei-sec-arrow" aria-hidden="true">→</span>
            </Link>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
