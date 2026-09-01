import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearJourneyListState } from "../motion";
import { useDuomeiEdit } from "./DuomeiEditProvider";

export function DuomeiHeader() {
  const { isLoggedIn, editMode, toggleEditMode, logout } = useDuomeiEdit();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoverRevealed, setHoverRevealed] = useState(false);
  const [scrollRevealed, setScrollRevealed] = useState(true);
  const lastScrollYRef = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const scrollFrameRef = useRef(0);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const update = () => {
      scrollFrameRef.current = 0;
      const currentScrollY = window.scrollY;
      const nextScrolled = window.scrollY > 36;
      setScrolled(nextScrolled);
      if (!nextScrolled) {
        setHoverRevealed(false);
        setScrollRevealed(true);
      } else if (currentScrollY - lastScrollYRef.current > 6) {
        setScrollRevealed(false);
      } else if (lastScrollYRef.current - currentScrollY > 6) {
        setScrollRevealed(true);
      }
      lastScrollYRef.current = currentScrollY;
    };
    const onScroll = () => {
      if (scrollFrameRef.current) return;
      scrollFrameRef.current = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (scrollFrameRef.current) window.cancelAnimationFrame(scrollFrameRef.current);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setHoverRevealed(false);
    setScrollRevealed(true);
  }, [location.hash, location.key, location.pathname, location.search]);

  const closeMenu = () => {
    setMenuOpen(false);
    setHoverRevealed(false);
  };

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

  return createPortal(
    <>
    <div className="duomei-header-hover-zone" aria-hidden="true" onPointerEnter={() => setHoverRevealed(true)} />
    <header
      className={`duomei-header${menuOpen ? " is-menu-open" : ""}${scrolled ? " is-scrolled" : ""}${scrollRevealed ? " is-scroll-visible" : " is-scroll-hidden"}${hoverRevealed ? " is-hover-revealed" : ""}`}
      onPointerEnter={() => setHoverRevealed(true)}
      onPointerLeave={() => {
        if (scrolled && !menuOpen) setHoverRevealed(false);
      }}
    >
      <Link
        className="duomei-brand duomei-motion-ambient-logo"
        to="/"
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
        aria-label={menuOpen ? "关闭导航" : "打开导航"}
        onClick={() => setMenuOpen((value) => !value)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav aria-label="主导航">
        <a href="/" onClick={closeMenu}>
          首页
        </a>
        <a href="/#notes" onClick={closeMenu}>
          小记
        </a>
        <a href="/guyu" onClick={closeMenu}>
          故语
        </a>
        <a href="/#color" onClick={closeMenu}>
          颜色
        </a>
        <a href="/#weiyan" onClick={closeMenu}>
          微言
        </a>
        <a href="/skills" onClick={closeMenu}>
          技能
        </a>
        {!isLoggedIn ? (
          <a href="/admin/login" onClick={closeMenu}>
            管理
          </a>
        ) : null}
        {isLoggedIn ? (
          <>
            <button type="button" onClick={toggleEdit}>
              编辑：{editMode ? "开" : "关"}
            </button>
            <a href="/admin/notes" onClick={closeMenu}>
              管理
            </a>
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
