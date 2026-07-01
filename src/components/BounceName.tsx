import type { CSSProperties } from "react";
import { AnimatedTitle } from "../motion";

export function BounceName() {
  const letters = "DUOMEI".split("");

  return (
    <div className="bounce-name">
      <AnimatedTitle as="h1" aria-label="DUOMEI">
        {letters.map((letter, index) => (
          <span key={letter} style={{ "--i": index } as CSSProperties}>
            {letter}
          </span>
        ))}
      </AnimatedTitle>
    </div>
  );
}
