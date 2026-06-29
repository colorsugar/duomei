import type { CSSProperties } from "react";

export function BounceName() {
  const letters = "DUOMEI".split("");

  return (
    <div className="bounce-name">
      <h1 aria-label="DUOMEI">
        {letters.map((letter, index) => (
          <span key={letter} style={{ "--i": index } as CSSProperties}>
            {letter}
          </span>
        ))}
      </h1>
    </div>
  );
}
