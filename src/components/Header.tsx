import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const navItems = [
  { label: "Journey", href: "/journey" },
  { label: "Photo", href: "/photo" },
  { label: "Notes", href: "/notes" },
  { label: "Essays", href: "/essays" },
  { label: "AI Wall", href: "/#ai-wall" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

export function Header() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("menu-open", isOpen);
    return () => document.body.classList.remove("menu-open");
  }, [isOpen]);

  const close = () => setIsOpen(false);

  return (
    <header className="site-header">
      <Link className="logo" to="/" onClick={close}>
        <span>TAMI</span>
        <span>多美</span>
      </Link>

      <nav className="desktop-nav" aria-label="Primary navigation">
        {navItems.map((item) => (
          <Link key={item.href} to={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <button
        className="menu-toggle"
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        aria-expanded={isOpen}
        aria-controls="mobile-menu"
      >
        {isOpen ? "CLOSE" : "MENU"}
      </button>

      <div className={`mobile-menu ${isOpen ? "is-open" : ""}`} id="mobile-menu">
        <nav aria-label="Mobile navigation">
          {navItems.map((item, index) => (
            <Link key={item.href} to={item.href} onClick={close} style={{ "--i": index } as React.CSSProperties}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
