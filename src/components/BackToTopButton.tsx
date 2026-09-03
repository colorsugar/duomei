import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function BackToTopButton() {
  const [visible, setVisible] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);
  const [yunyouVisible, setYunyouVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      setVisible(window.scrollY > 520);
      const yunyouCard = document.querySelector(".yunyou-card");
      const bounds = yunyouCard?.getBoundingClientRect();
      setYunyouVisible(Boolean(bounds && bounds.bottom > 0 && bounds.top < window.innerHeight));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    const footer = document.querySelector(".duomei-footer");
    if (!footer || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting), { threshold: 0.15 });
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  const shown = visible && !footerVisible && !yunyouVisible;

  return createPortal(
    <button
      className={`back-to-top${shown ? " is-visible" : ""}`}
      type="button"
      aria-label="返回顶部"
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
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
