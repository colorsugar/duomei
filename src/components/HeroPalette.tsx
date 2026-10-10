import type { CSSProperties, MouseEvent } from "react";
import { sectionAccents } from "../lib/sectionAccents";

// One coloured dot per home section under the hero copy; hover names it, click glides there.
export function HeroPalette() {
  const items = sectionAccents.filter((accent) => accent.id !== "home");

  const go = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id);
    if (!target) return;
    event.preventDefault();
    const top = target.getBoundingClientRect().top + window.scrollY;
    const lenis = window.__duomeiLenis;
    if (lenis) lenis.scrollTo(top, { duration: 1.6 });
    else window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <nav className="duomei-hero-palette" aria-label="首页板块">
      {items.map((accent, index) => (
        <a
          key={accent.id}
          href={`#${accent.id}`}
          aria-label={accent.label}
          style={{ "--dot": `var(--accent-${accent.id})`, "--n": index } as CSSProperties}
          onClick={(event) => go(event, accent.id)}
        >
          <i aria-hidden="true" />
          <span aria-hidden="true">{accent.label}</span>
        </a>
      ))}
    </nav>
  );
}
