import { useEffect, useRef, useState, type MouseEvent } from "react";
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
  const headerRef = useRef<HTMLElement>(null);
  const lastScrollYRef = useRef(typeof window === "undefined" ? 0 : window.scrollY);
  const scrollFrameRef = useRef(0);
  const menuTouchStartRef = useRef<{ x: number; y: number } | null>(null);
  const lastTouchActivationRef = useRef(0);
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

  useEffect(() => {
    const finishHashNavigation = () => {
      setMenuOpen(false);
      setHoverRevealed(false);
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };
    window.addEventListener("hashchange", finishHashNavigation);
    return () => window.removeEventListener("hashchange", finishHashNavigation);
  }, []);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    header.dataset.menuTouchListener = "ready";

    const beginMenuTouch = (event: TouchEvent) => {
      if (event.touches.length !== 1) {
        menuTouchStartRef.current = null;
        return;
      }

      const touch = event.touches[0];
      menuTouchStartRef.current = { x: touch.clientX, y: touch.clientY };
    };

    const finishMenuTouch = (event: TouchEvent) => {
      const start = menuTouchStartRef.current;
      menuTouchStartRef.current = null;
      const touch = event.changedTouches[0];
      if (!start || !touch || Math.hypot(touch.clientX - start.x, touch.clientY - start.y) > 10) return;

      const target = event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement | HTMLButtonElement>("a, button")
        : null;
      if (!target || !header.contains(target)) return;

      // Bind directly to the portal DOM so iOS in-app WebViews cannot lose the
      // short tap inside React's delegated compatibility-click chain.
      header.dataset.menuLastActivation = "touch";
      event.preventDefault();
      lastTouchActivationRef.current = window.performance.now();
      if (target.tagName === "A") {
        window.location.assign((target as HTMLAnchorElement).href);
        return;
      }
      target.click();
    };

    const cancelMenuTouch = () => {
      menuTouchStartRef.current = null;
    };

    header.addEventListener("touchstart", beginMenuTouch, { capture: true, passive: true });
    header.addEventListener("touchend", finishMenuTouch, { capture: true, passive: false });
    header.addEventListener("touchcancel", cancelMenuTouch, { capture: true, passive: true });
    return () => {
      header.removeEventListener("touchstart", beginMenuTouch, true);
      header.removeEventListener("touchend", finishMenuTouch, true);
      header.removeEventListener("touchcancel", cancelMenuTouch, true);
      delete header.dataset.menuTouchListener;
      delete header.dataset.menuLastActivation;
    };
  }, []);

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

  const blockDuplicateTouchClick = (event: MouseEvent<HTMLElement>) => {
    if (!event.nativeEvent.isTrusted) return;
    if (window.performance.now() - lastTouchActivationRef.current > 700) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const closeAfterNativeNavigation = () => {
    // Let iOS Safari commit the native link before hiding its fixed navigation layer.
    window.setTimeout(() => {
      closeMenu();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    }, 0);
  };

  return createPortal(
    <>
    <div className="duomei-header-hover-zone" aria-hidden="true" onPointerEnter={() => setHoverRevealed(true)} />
    <header
      ref={headerRef}
      className={`duomei-header${menuOpen ? " is-menu-open" : ""}${scrolled ? " is-scrolled" : ""}${scrollRevealed ? " is-scroll-visible" : " is-scroll-hidden"}${hoverRevealed ? " is-hover-revealed" : ""}`}
      onClickCapture={blockDuplicateTouchClick}
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
        data-native-navigation
      >
        <a href="/" onClick={closeAfterNativeNavigation}>
          首页
        </a>
        <a href="/#notes" onClick={closeAfterNativeNavigation}>
          小记
        </a>
        <a href="/#guyu" onClick={closeAfterNativeNavigation}>
          故语
        </a>
        <a href="/#color" onClick={closeAfterNativeNavigation}>
          颜色
        </a>
        <a href="/#weiyan" onClick={closeAfterNativeNavigation}>
          微言
        </a>
        <a href="/skills" onClick={closeAfterNativeNavigation}>
          技能
        </a>
        {!isLoggedIn ? (
          <a href="/admin/login" onClick={closeAfterNativeNavigation}>
            管理
          </a>
        ) : null}
        {isLoggedIn ? (
          <>
            <button type="button" onClick={toggleEdit}>
              编辑：{editMode ? "开" : "关"}
            </button>
            <a href="/admin/notes" onClick={closeAfterNativeNavigation}>
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
