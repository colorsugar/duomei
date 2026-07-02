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
      ↑
    </button>,
    document.body,
  );
}
