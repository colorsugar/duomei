import { useEffect, useRef, useState, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearJourneyListState } from "../motion";
import { useDuomeiEdit } from "./DuomeiEditProvider";

// Primary links render two stacked faces: the ink word rolls up and out on hover while a tinted twin rolls in.
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
  const lastTouchActivationRef = useRef(Number.NEGATIVE_INFINITY);
  // Mouse hover on the menu button opens the dropdown; leaving the header closes it after a short grace
  // period so the pointer can cross the gap between the button and the dropdown. Touch is unaffected.
  const hoverCloseTimerRef = useRef(0);
  const cancelHoverClose = () => {
    window.clearTimeout(hoverCloseTimerRef.current);
    hoverCloseTimerRef.current = 0;
  };
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
        setMenuOpen(false);
        setHoverRevealed(false);
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

  useEffect(() => () => window.clearTimeout(hoverCloseTimerRef.current), []);

  // A small dot under the nav slides to the section currently on screen (html[data-current-section]),
  // and follows the pointer across the items while hovering.
  useEffect(() => {
    const header = headerRef.current;
    const nav = header?.querySelector<HTMLElement>("nav");
    if (!header || !nav) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const hrefFor = (id: string) => (id === "home" ? "/" : id === "xunji" ? "/xunji" : id === "skills" ? "/skills" : `/#${id}`);
    const place = (target: HTMLElement | null) => {
      if (!target) {
        nav.style.setProperty("--nav-dot-opacity", "0");
        return;
      }
      nav.style.setProperty("--nav-dot-x", `${target.offsetLeft + target.offsetWidth / 2}px`);
      nav.style.setProperty("--nav-dot-w", `${Math.max(14, target.offsetWidth * 0.5)}px`);
      nav.style.setProperty("--nav-dot-opacity", "1");
    };
    const current = () => {
      const id = document.documentElement.dataset.currentSection;
      if (!id || location.pathname !== "/") return null;
      return nav.querySelector<HTMLElement>(`a[href="${hrefFor(id)}"]`);
    };
    const settle = () => place(current());
    const observer = new MutationObserver(settle);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-current-section"] });
    // A soft pill slides behind whichever item is under the pointer, and that item leans a little toward it.
    let hovered: HTMLElement | null = null;
    const pill = (target: HTMLElement | null) => {
      if (!target) {
        nav.style.setProperty("--nav-pill-opacity", "0");
        return;
      }
      nav.style.setProperty("--nav-pill-x", `${target.offsetLeft + target.offsetWidth / 2}px`);
      nav.style.setProperty("--nav-pill-w", `${target.offsetWidth + 22}px`);
      nav.style.setProperty("--nav-pill-opacity", "1");
    };
    const relax = () => {
      if (!hovered) return;
      hovered.style.removeProperty("--mx");
      hovered.style.removeProperty("--my");
      hovered = null;
    };
    const onOver = (event: PointerEvent) => {
      const link = event.target instanceof Element ? event.target.closest<HTMLElement>("nav > a, nav > button") : null;
      if (!link) return;
      if (link !== hovered) relax();
      hovered = link;
      pill(link);
      if (link.tagName === "A") place(link);
    };
    const onLeave = () => {
      relax();
      pill(null);
      settle();
    };
    const onMove = (event: PointerEvent) => {
      const box = header.getBoundingClientRect();
      header.style.setProperty("--hx", `${(((event.clientX - box.left) / Math.max(1, box.width)) * 100).toFixed(2)}%`);
      if (!hovered) return;
      const rect = hovered.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / Math.max(1, rect.width);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / Math.max(1, rect.height);
      hovered.style.setProperty("--mx", `${(dx * 7).toFixed(2)}px`);
      hovered.style.setProperty("--my", `${(dy * 4).toFixed(2)}px`);
    };
    nav.addEventListener("pointerover", onOver);
    nav.addEventListener("pointerleave", onLeave);
    header.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", settle);
    settle();
    return () => {
      observer.disconnect();
      nav.removeEventListener("pointerover", onOver);
      nav.removeEventListener("pointerleave", onLeave);
      header.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", settle);
    };
  }, [location.pathname]);

  // Fold the hover-revealed header once the pointer has left both the header and the music player.
  useEffect(() => {
    if (!hoverRevealed || !scrolled || menuOpen) return;
    const onPointerOver = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".duomei-header, .duomei-header-hover-zone, .duomei-music-player")) return;
      setHoverRevealed(false);
    };
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    return () => document.removeEventListener("pointerover", onPointerOver);
  }, [hoverRevealed, menuOpen, scrolled]);

  useEffect(() => {
    if (!menuOpen) return;

    const dismissMenu = () => {
      setMenuOpen(false);
      setHoverRevealed(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const header = headerRef.current;
      if (header && event.target instanceof Node && !header.contains(event.target)) dismissMenu();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      dismissMenu();
      if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

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

  // Mouse/keyboard clicks on plain routes stay inside the SPA (route board + no reload); hash links keep the
  // native behaviour (same-page hash scroll, or a full load from an inner page), and touch never reaches
  // here because the touchend handler above commits the native link itself (iOS in-app WebViews).
  const navigateFromNav = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (href === "/") {
      event.preventDefault();
      goHomeTop();
      return;
    }
    if (href.startsWith("/#") || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      closeAfterNativeNavigation();
      return;
    }
    event.preventDefault();
    closeMenu();
    navigate(href);
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
      onPointerEnter={(event) => {
        setHoverRevealed(true);
        if (event.pointerType === "mouse") cancelHoverClose();
      }}
      onPointerLeave={(event) => {
        // The music orb is portalled outside the header but sits inside it visually: moving onto it
        // must not fold the header away (that fold used to flicker the orb in and out under the pointer).
        if (event.relatedTarget instanceof Element && event.relatedTarget.closest(".duomei-music-player")) return;
        if (event.pointerType === "mouse" && menuOpen && headerRef.current?.dataset.menuHoverOpened === "true") {
          cancelHoverClose();
          hoverCloseTimerRef.current = window.setTimeout(() => {
            hoverCloseTimerRef.current = 0;
            if (headerRef.current) delete headerRef.current.dataset.menuHoverOpened;
            closeMenu();
          }, 400);
          return;
        }
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
        <span>多美</span>
      </Link>

      <button
        className="duomei-menu-toggle"
        type="button"
        aria-expanded={menuOpen}
        aria-label={menuOpen ? "关闭导航" : "打开导航"}
        onPointerEnter={(event) => {
          if (event.pointerType !== "mouse" || menuOpen) return;
          cancelHoverClose();
          if (headerRef.current) headerRef.current.dataset.menuHoverOpened = "true";
          setMenuOpen(true);
        }}
        onClick={(event) => {
          // A mouse that already opened the menu by hovering keeps it open on click instead of toggling it shut.
          if (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "mouse" && headerRef.current?.dataset.menuHoverOpened === "true") {
            delete headerRef.current.dataset.menuHoverOpened;
            return;
          }
          setMenuOpen((value) => !value);
        }}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        aria-label="主导航"
        data-native-navigation
      >
        <a href="/" onClick={(event) => navigateFromNav(event, "/")}>
          <span className="nav-face">首页</span><span className="nav-face nav-face-alt" aria-hidden="true">首页</span>
        </a>
        <a href="/#zaobao" onClick={(event) => navigateFromNav(event, "/#zaobao")}>
          <span className="nav-face">早报</span><span className="nav-face nav-face-alt" aria-hidden="true">早报</span>
        </a>
        <a href="/#notes" onClick={(event) => navigateFromNav(event, "/#notes")}>
          <span className="nav-face">小记</span><span className="nav-face nav-face-alt" aria-hidden="true">小记</span>
        </a>
        <a href="/#guyu" onClick={(event) => navigateFromNav(event, "/#guyu")}>
          <span className="nav-face">故语</span><span className="nav-face nav-face-alt" aria-hidden="true">故语</span>
        </a>
        <a href="/xunji" onClick={(event) => navigateFromNav(event, "/xunji")}>
          <span className="nav-face">寻迹</span><span className="nav-face nav-face-alt" aria-hidden="true">寻迹</span>
        </a>
        <a href="/#dalu" onClick={(event) => navigateFromNav(event, "/#dalu")}>
          <span className="nav-face">大陆</span><span className="nav-face nav-face-alt" aria-hidden="true">大陆</span>
        </a>
        <a href="/#yunyou" onClick={(event) => navigateFromNav(event, "/#yunyou")}>
          <span className="nav-face">云游</span><span className="nav-face nav-face-alt" aria-hidden="true">云游</span>
        </a>
        <a href="/#color" onClick={(event) => navigateFromNav(event, "/#color")}>
          <span className="nav-face">颜色</span><span className="nav-face nav-face-alt" aria-hidden="true">颜色</span>
        </a>
        <a href="/#weiyan" onClick={(event) => navigateFromNav(event, "/#weiyan")}>
          <span className="nav-face">微言</span><span className="nav-face nav-face-alt" aria-hidden="true">微言</span>
        </a>
        <a href="/skills" onClick={(event) => navigateFromNav(event, "/skills")}>
          <span className="nav-face">Skill</span><span className="nav-face nav-face-alt" aria-hidden="true">Skill</span>
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
