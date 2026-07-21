import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearJourneyListState } from "../motion";
import { useDuomeiEdit } from "./DuomeiEditProvider";

export function DuomeiHeader() {
  const { isLoggedIn, editMode, toggleEditMode, logout } = useDuomeiEdit();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoverRevealed, setHoverRevealed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const nextScrolled = window.scrollY > 36;
      setScrolled(nextScrolled);
      if (!nextScrolled) setHoverRevealed(false);
    };
    const scheduleUpdate = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", scheduleUpdate, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const scrollHomeTop = (behavior: ScrollBehavior = "smooth") => {
    const scroll = () => {
      window.scrollTo({ top: 0, left: 0, behavior });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };

    scroll();
    requestAnimationFrame(scroll);
  };

  const goHomeTop = () => {
    closeMenu();
    clearJourneyListState();

    if (location.pathname !== "/" || location.search || location.hash) {
      navigate("/", { replace: true });
      window.setTimeout(() => scrollHomeTop(), 0);
      return;
    }

    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    scrollHomeTop();
  };

  const toggleEdit = () => {
    toggleEditMode();
    closeMenu();
  };

  const logoutAndClose = () => {
    logout();
    closeMenu();
  };

  const goKuaihuo = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    closeMenu();
    const scroll = () => document.getElementById("kuaihuo")?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (location.pathname !== "/") {
      navigate("/#kuaihuo");
      window.setTimeout(scroll, 80);
      return;
    }
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#kuaihuo`);
    scroll();
  };

  return createPortal(
    <>
    <div className="duomei-header-hover-zone" aria-hidden="true" onPointerEnter={() => setHoverRevealed(true)} />
    <header
      className={`duomei-header${menuOpen ? " is-menu-open" : ""}${scrolled ? " is-scrolled" : ""}${hoverRevealed ? " is-hover-revealed" : ""}`}
      onPointerEnter={() => setHoverRevealed(true)}
      onPointerLeave={() => {
        if (scrolled && !menuOpen) setHoverRevealed(false);
      }}
    >
      <Link
        className="duomei-brand duomei-motion-ambient-logo"
        to="/"
        aria-label="多美小记首页"
        onClick={(event) => {
          event.preventDefault();
          goHomeTop();
        }}
      >
        <strong>DUOMEI</strong>
        <span>多美小记</span>
      </Link>

      <button
        className="duomei-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-controls="duomei-primary-navigation"
        aria-label={menuOpen ? "关闭导航" : "打开导航"}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav id="duomei-primary-navigation" aria-label="主导航">
        <Link
          to="/"
          onClick={(event) => {
            event.preventDefault();
            goHomeTop();
          }}
        >
          首页
        </Link>
        <Link to="/#notes" onClick={closeMenu}>
          小记
        </Link>
        <Link to="/#kuaihuo" onClick={goKuaihuo}>
          微言
        </Link>
        {!isLoggedIn ? (
          <Link to="/admin/login" onClick={closeMenu}>
            管理
          </Link>
        ) : null}
        {isLoggedIn ? (
          <>
            <button type="button" onClick={toggleEdit}>
              编辑：{editMode ? "开" : "关"}
            </button>
            <Link to="/admin/notes" onClick={closeMenu}>
              管理
            </Link>
            <button type="button" onClick={logoutAndClose}>
              退出
            </button>
          </>
        ) : null}
      </nav>
    </header>
    </>,
    document.body,
  );
}
