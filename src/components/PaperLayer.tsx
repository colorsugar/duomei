import type { ReactNode } from "react";

function PaperCurve() {
  return (
    <div className="paper-curve" aria-hidden="true">
      <svg viewBox="0 0 1440 180" preserveAspectRatio="none">
        <path className="paper-fill" d="M0,90 C360,10 1080,10 1440,90 L1440,180 L0,180 Z" />
      </svg>
    </div>
  );
}

export function PaperLayer({ children }: { children: ReactNode }) {
  return (
    <section className="paper-layer">
      <PaperCurve />
      <div className="paper-body">{children}</div>
    </section>
  );
}
