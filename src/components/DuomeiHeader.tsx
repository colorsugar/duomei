import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Link, clearJourneyListState, useTransitionNavigate } from "../motion";
import { useDuomeiEdit } from "./DuomeiEditProvider";
import { scrollWindowTo } from "../hooks/useSmoothScroll";

export function DuomeiHeader() {
  const { isLoggedIn, editMode, toggleEditMode, logout } = useDuomeiEdit();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoverRevealed, setHoverRevealed] = useState(false);
  const menuTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchActivationRef = useRef(0);
  const navigate = useTransitionNavigate();
  const location = useLocation();

  useEffect(() => {
    const update = () => {
      const nextScrolled = window.scrollY > 36;
      setScrolled(nextScrolled);
      if (!nextScrolled) setHoverRevealed(false);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setHoverRevealed(false);
  }, [location.hash, location.key, location.pathname, location.search]);

  const closeMenu = () => {
    setMenuOpen(false);
    setHoverRevealed(false);
  };

  const scrollHomeTop = () => scrollWindowTo(0);

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

  const beginMenuTouch = (event: React.TouchEvent<HTMLElement>) => {
    if (event.touches.length !== 1) {
      menuTouchStartRef.current = null;
      return;
    }

    const touch = event.touches[0];
    menuTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const finishMenuTouch = (event: React.TouchEvent<HTMLElement>) => {
    const start = menuTouchStartRef.current;
    menuTouchStartRef.current = null;
    const touch = event.changedTouches[0];
    if (!start || !touch || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10) return;

    const target = event.target instanceof Element
      ? event.target.closest<HTMLAnchorElement | HTMLButtonElement>("a, button")
      : null;
    if (!target || !event.currentTarget.contains(target)) return;

    // iOS Safari can leave :hover active and suppress the compatibility click.
    // Activate the settled target directly after a genuine, non-drag touch.
    event.preventDefault();
    lastTouchActivationRef.current = window.performance.now();
    target.click();
  };

  const blockDuplicateTouchClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!event.nativeEvent.isTrusted || window.performance.now() - lastTouchActivationRef.current > 700) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const goKuaihuo = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    closeMenu();
    const scroll = () => {
      const target = document.getElementById("kuaihuo");
      if (target) scrollWindowTo(target);
    };
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

      <nav
        aria-label="主导航"
        onClickCapture={blockDuplicateTouchClick}
        onTouchStart={beginMenuTouch}
        onTouchEnd={finishMenuTouch}
        onTouchCancel={() => { menuTouchStartRef.current = null; }}
      >
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
        <Link to="/guyu" onClick={closeMenu}>
          故语
        </Link>
        <Link to="/#kuaihuo" onClick={goKuaihuo}>
          微言
        </Link>
        <Link to="/skills" onClick={closeMenu}>
          技能
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
