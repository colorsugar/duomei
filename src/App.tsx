import { type CSSProperties, Suspense, lazy, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DuomeiHomePage } from "./pages/DuomeiHomePage";
import { DuomeiNoteDetailPage } from "./pages/DuomeiNoteDetailPage";
import { DuomeiHeader } from "./components/DuomeiHeader";
import { DuomeiFooter } from "./components/DuomeiFooter";
import { BackToTopButton } from "./components/BackToTopButton";
import { BackHomeButton } from "./components/BackHomeButton";
import { DuomeiEditProvider } from "./components/DuomeiEditProvider";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { MotionProvider } from "./motion";
import { CursorGlow } from "./components/CursorGlow";
import { sectionAccents, type SectionAccentId } from "./lib/sectionAccents";
import { CardTilt } from "./components/CardTilt";
import { DuomeiMusicPlayer } from "./components/DuomeiMusicPlayer";

// Only the home page and the note reader (reached from the home carousel with a shared-element
// transition) stay in the main bundle; every other route loads on first visit.
const pageLoaders = {
  DuomeiZaobaoPage: () => import("./pages/DuomeiZaobaoPage"),
  DuomeiZaobaoArchivePage: () => import("./pages/DuomeiZaobaoArchivePage"),
  DuomeiXunjiPage: () => import("./pages/DuomeiXunjiPage"),
  DuomeiXunjiArchivePage: () => import("./pages/DuomeiXunjiArchivePage"),
  DuomeiGuyuPage: () => import("./pages/DuomeiGuyuPage"),
  DuomeiGuyuReaderPage: () => import("./pages/DuomeiGuyuReaderPage"),
  DuomeiDaluPage: () => import("./pages/DuomeiDaluPage"),
  DuomeiYunyouPage: () => import("./pages/DuomeiYunyouPage"),
  DuomeiXiaoyuanPage: () => import("./pages/DuomeiXiaoyuanPage"),
  DuomeiJiangnanPage: () => import("./pages/DuomeiJiangnanPage"),
  DuomeiHongloumengPage: () => import("./pages/DuomeiHongloumengPage"),
  DuomeiAtlasPage: () => import("./pages/DuomeiAtlasPage"),
  DuomeiChaojiMapPage: () => import("./pages/DuomeiChaojiMapPage"),
  DuomeiSkillsPage: () => import("./pages/DuomeiSkillsPage"),
  DuomeiTimePage: () => import("./pages/DuomeiTimePage"),
};

// Inner pages carry their section's hue the same way the home sections do (src/colorful.css reads
// html[data-current-section]); the home page sets it from scroll position instead.
function routeSectionOf(pathname: string): SectionAccentId {
  return pathname.startsWith("/zaobao") ? "zaobao"
    : pathname.startsWith("/note/") ? "notes"
    : pathname.startsWith("/guyu") ? "guyu"
    : pathname.startsWith("/xunji") ? "xunji"
    : pathname.startsWith("/dalu") || pathname.startsWith("/atlas") ? "dalu"
    : pathname.startsWith("/chaoji") ? "dalu"
    : pathname.startsWith("/yunyou") || pathname === "/xiaoyuan" || pathname === "/jiangnan" || pathname.startsWith("/honglou") || pathname.startsWith("/hongloumeng-ying") ? "yunyou"
    : pathname.startsWith("/skills") ? "skills"
    : pathname.startsWith("/time") ? "weiyan"
    : "home";
}

function useRouteSection(pathname: string) {
  useEffect(() => {
    if (pathname === "/") return;
    const section = routeSectionOf(pathname);
    const root = document.documentElement;
    root.dataset.currentSection = section;
    root.style.setProperty("--current-accent", `var(--accent-${section})`);
    root.style.setProperty("--current-accent-ink", `var(--accent-${section}-ink)`);
    root.style.setProperty("--current-accent-soft", `var(--accent-${section}-soft)`);
    return () => {
      delete root.dataset.currentSection;
      for (const name of ["--current-accent", "--current-accent-ink", "--current-accent-soft"]) root.style.removeProperty(name);
    };
  }, [pathname]);
}

// Warm the public routes once the home page is idle, so the first click never waits on a download.
function usePrefetchPages() {
  useEffect(() => {
    let idle = 0;
    let timer = 0;
    const warm = () => {
      for (const load of Object.values(pageLoaders)) void load().catch(() => undefined);
    };
    const schedule = () => {
      timer = window.setTimeout(() => {
        if (typeof window.requestIdleCallback === "function") idle = window.requestIdleCallback(warm, { timeout: 6_000 });
        else warm();
      }, 2_500);
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      window.clearTimeout(timer);
      if (idle && typeof window.cancelIdleCallback === "function") window.cancelIdleCallback(idle);
    };
  }, []);
}

const DuomeiAdmin = lazy(() => import("./pages/DuomeiAdmin").then((m) => ({ default: m.DuomeiAdmin })));
const DuomeiTimePage = lazy(() => import("./pages/DuomeiTimePage").then((m) => ({ default: m.DuomeiTimePage })));
const DuomeiNotFoundPage = lazy(() => import("./pages/DuomeiNotFoundPage").then((m) => ({ default: m.DuomeiNotFoundPage })));
const DuomeiGuyuPage = lazy(() => import("./pages/DuomeiGuyuPage").then((m) => ({ default: m.DuomeiGuyuPage })));
const DuomeiGuyuReaderPage = lazy(() => import("./pages/DuomeiGuyuReaderPage").then((m) => ({ default: m.DuomeiGuyuReaderPage })));
const DuomeiSkillsPage = lazy(() => import("./pages/DuomeiSkillsPage").then((m) => ({ default: m.DuomeiSkillsPage })));
const DuomeiZaobaoPage = lazy(() => import("./pages/DuomeiZaobaoPage").then((m) => ({ default: m.DuomeiZaobaoPage })));
const DuomeiZaobaoArchivePage = lazy(() => import("./pages/DuomeiZaobaoArchivePage").then((m) => ({ default: m.DuomeiZaobaoArchivePage })));
const DuomeiXunjiPage = lazy(() => import("./pages/DuomeiXunjiPage").then((m) => ({ default: m.DuomeiXunjiPage })));
const DuomeiXunjiArchivePage = lazy(() => import("./pages/DuomeiXunjiArchivePage").then((m) => ({ default: m.DuomeiXunjiArchivePage })));
const DuomeiYunyouPage = lazy(() => import("./pages/DuomeiYunyouPage").then((m) => ({ default: m.DuomeiYunyouPage })));
const DuomeiXiaoyuanPage = lazy(() => import("./pages/DuomeiXiaoyuanPage").then((m) => ({ default: m.DuomeiXiaoyuanPage })));
const DuomeiJiangnanPage = lazy(() => import("./pages/DuomeiJiangnanPage").then((m) => ({ default: m.DuomeiJiangnanPage })));
const DuomeiHongloumengPage = lazy(() => import("./pages/DuomeiHongloumengPage").then((m) => ({ default: m.DuomeiHongloumengPage })));
const DuomeiDaluPage = lazy(() => import("./pages/DuomeiDaluPage").then((m) => ({ default: m.DuomeiDaluPage })));
const DuomeiAtlasPage = lazy(() => import("./pages/DuomeiAtlasPage").then((m) => ({ default: m.DuomeiAtlasPage })));
const DuomeiChaojiPage = lazy(() => import("./pages/DuomeiChaojiPage").then((m) => ({ default: m.DuomeiChaojiPage })));
const DuomeiChaojiMapPage = lazy(() => import("./pages/DuomeiChaojiMapPage").then((m) => ({ default: m.DuomeiChaojiMapPage })));

function PublicRoutePaperVeil({ pathname, disabled }: { pathname: string; disabled: boolean }) {
  const previousPathRef = useRef(pathname);
  const [transition, setTransition] = useState<{ key: string; noteDetail: boolean } | null>(null);

  useLayoutEffect(() => {
    if (previousPathRef.current === pathname) return;
    previousPathRef.current = pathname;
    if (disabled) {
      setTransition(null);
      return;
    }
    setTransition({ key: pathname, noteDetail: pathname.startsWith("/note/") });
  }, [disabled, pathname]);

  if (!transition) return null;
  // A board in the destination section's hue covers the swap, shows the section name, and lifts away.
  const section = routeSectionOf(transition.key);
  const accent = sectionAccents.find((entry) => entry.id === section) ?? sectionAccents[0];
  const index = sectionAccents.indexOf(accent);
  return (
    <span
      key={transition.key}
      className={`duomei-route-paper-veil${transition.noteDetail ? " is-note-detail" : ""}`}
      style={{ "--veil": `var(--accent-${section})`, "--veil-ink": `var(--accent-${section}-ink)` } as CSSProperties}
      aria-hidden="true"
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        setTransition((current) => (current?.key === transition.key ? null : current));
      }}
    >
      <b>{section === "home" ? "多美" : accent.label}</b>
      <i>{section === "home" ? "Duomei" : `${String(index).padStart(2, "0")} · ${accent.english}`}</i>
    </span>
  );
}

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isTimePage = location.pathname === "/time";
  const isGuyuReader = location.pathname.startsWith("/guyu/");
  const isZaobao = location.pathname === "/zaobao" || location.pathname.startsWith("/zaobao/");
  const isXunji = location.pathname === "/xunji" || location.pathname.startsWith("/xunji/");
  const isYunyouMap = location.pathname === "/yunyou-map";
  const isXiaoyuan = location.pathname === "/xiaoyuan" || location.pathname === "/jiangnan";
  const isHongloumeng = location.pathname === "/honglou" || location.pathname === "/honglou/";
  const isAtlasMap = location.pathname === "/atlas-v6" || location.pathname === "/dalu/map" || location.pathname === "/chaoji/map";
  const bareChrome = isAdmin || isGuyuReader || isZaobao || isXunji || isYunyouMap || isAtlasMap || isXiaoyuan || isHongloumeng;
  useSmoothScroll(bareChrome || isTimePage);
  usePrefetchPages();
  useRouteSection(location.pathname);

  return (
    <DuomeiEditProvider>
      <RouteScrollManager />
      {!bareChrome ? <DuomeiHeader /> : null}
      <Suspense fallback={null}>
      <Routes>
        <Route path="/" element={<DuomeiHomePage />} />
        <Route path="/zaobao" element={<DuomeiZaobaoPage />} />
        <Route path="/zaobao/archive" element={<DuomeiZaobaoArchivePage />} />
        <Route path="/zaobao/i/:storyId" element={<DuomeiZaobaoPage />} />
        <Route path="/zaobao/:date" element={<DuomeiZaobaoPage />} />
        <Route path="/zaobao/:date/i/:storyId" element={<DuomeiZaobaoPage />} />
        <Route path="/xunji" element={<DuomeiXunjiPage />} />
        <Route path="/xunji/archive" element={<DuomeiXunjiArchivePage />} />
        <Route path="/xunji/:date" element={<DuomeiXunjiPage />} />
        <Route path="/time" element={<DuomeiTimePage />} />
        <Route path="/note/:slug" element={<DuomeiNoteDetailPage />} />
        <Route path="/guyu" element={<DuomeiGuyuPage />} />
        <Route path="/guyu/:bookId" element={<DuomeiGuyuReaderPage />} />
        <Route path="/skills" element={<DuomeiSkillsPage />} />
        <Route path="/yunyou-map" element={<DuomeiYunyouPage />} />
        <Route path="/xiaoyuan" element={<DuomeiXiaoyuanPage />} />
        <Route path="/jiangnan" element={<DuomeiJiangnanPage />} />
        <Route path="/honglou" element={<DuomeiHongloumengPage />} />
        {/* 旧网址（已经发出去的链接）跳到新址 */}
        <Route path="/hongloumeng-ying/*" element={<Navigate to="/honglou" replace />} />
        <Route path="/dalu" element={<DuomeiDaluPage />} />
        <Route path="/dalu/map" element={<DuomeiAtlasPage />} />
        <Route path="/atlas-v6" element={<DuomeiAtlasPage />} />
        <Route path="/chaoji" element={<DuomeiChaojiPage />} />
        <Route path="/chaoji/map" element={<DuomeiChaojiMapPage />} />
        <Route path="/about" element={<Navigate to="/#kuaihuo" replace />} />
        <Route path="/admin/login" element={<DuomeiAdmin mode="login" />} />
        <Route path="/admin" element={<DuomeiAdmin mode="notes" />} />
        <Route path="/admin/notes" element={<DuomeiAdmin mode="notes" />} />
        <Route path="*" element={<DuomeiNotFoundPage />} />
      </Routes>
      </Suspense>
      <PublicRoutePaperVeil pathname={location.pathname} disabled={isAdmin || isGuyuReader} />
      {!bareChrome ? <DuomeiFooter /> : null}
      {!isAdmin ? <DuomeiMusicPlayer compactContext={isGuyuReader || isZaobao || isXunji || isYunyouMap || isAtlasMap || isXiaoyuan} /> : null}
      {!bareChrome ? <BackToTopButton /> : null}
      {!bareChrome && location.pathname !== "/" ? <BackHomeButton to={location.pathname.startsWith("/guyu/") ? "/guyu" : "/"} label={location.pathname.startsWith("/guyu/") ? "故语" : "首页"} /> : null}
    </DuomeiEditProvider>
  );
}

export default function App() {
  const basename = window.location.pathname.startsWith("/duomei") ? "/duomei" : "/";

  return (
    <BrowserRouter basename={basename}>
      <MotionProvider>
        <AppRoutes />
        <CursorGlow />
        <CardTilt />
      </MotionProvider>
    </BrowserRouter>
  );
}
