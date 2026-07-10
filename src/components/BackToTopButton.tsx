import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY > 520);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return createPortal(
    <button
      className={`back-to-top${visible ? " is-visible" : ""}`}
      type="button"
      aria-label="返回顶部"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <path d="M8.5 15.5 16 8l7.5 7.5" />
        <path d="M16 8v16" />
      </svg>
    </button>,
    document.body,
  );
}
