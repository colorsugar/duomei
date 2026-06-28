import { Link } from "react-router-dom";

const footerLinks = ["Journey", "Photo", "Notes", "Essays", "About"];

export function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <Link className="logo" to="/">
          <span>TAMI</span>
          <span>多美</span>
        </Link>
      </div>
      <nav aria-label="Footer navigation">
        {footerLinks.map((link) => (
          <Link key={link} to={link === "Journey" ? "/journey" : link === "Photo" ? "/photo" : link === "Notes" ? "/notes" : link === "Essays" ? "/essays" : "/#about"}>
            {link}
          </Link>
        ))}
      </nav>
      <p>© 2026 TAMI. Personal archive of travel, photography and words.</p>
    </footer>
  );
}
