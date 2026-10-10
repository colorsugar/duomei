import { createPortal } from "react-dom";
import { Link } from "react-router-dom";

// A fixed way back on every inner page, bottom-left, mirroring the back-to-top button: the header
// hides itself on scroll, so without this the only way home was scrolling back up first.
export function BackHomeButton({ to = "/", label = "首页" }: { to?: string; label?: string }) {
  return createPortal(
    <Link className="duomei-back-home" to={to} aria-label={`返回${label}`}>
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 5 8 12l7 7" />
      </svg>
      <span>{label}</span>
    </Link>,
    document.body,
  );
}
