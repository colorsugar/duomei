import type { ReactNode } from "react";

function PaperCurve() {
  return (
    <div className="paper-curve" aria-hidden="true">
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
        <path className="paper-fill" d="M0,90 C360,10 1080,10 1440,90 L1440,180 L0,180 Z" />
        <path className="paper-stroke-base" d="M0,90 C360,10 1080,10 1440,90" />
        <path className="paper-stroke" pathLength="1000" d="M0,90 C360,10 1080,10 1440,90" />
      </svg>
    </div>
  );
}

export function PaperLayer({ children }: { children: ReactNode }) {
  return (
    <section className="paper-layer" id="notes">
      <PaperCurve />
      <div className="paper-body">{children}</div>
    </section>
  );
}
