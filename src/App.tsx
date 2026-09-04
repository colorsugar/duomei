import { lazy, Suspense, useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
const DuomeiAdmin = lazy(() => import("./pages/DuomeiAdmin").then(module => ({ default: module.DuomeiAdmin })));
import { DuomeiHomePage } from "./pages/DuomeiHomePage";
const DuomeiNoteDetailPage = lazy(() => import("./pages/DuomeiNoteDetailPage").then(module => ({ default: module.DuomeiNoteDetailPage })));
const DuomeiTimePage = lazy(() => import("./pages/DuomeiTimePage").then(module => ({ default: module.DuomeiTimePage })));
import { DuomeiNotFoundPage } from "./pages/DuomeiNotFoundPage";
const DuomeiGuyuPage = lazy(() => import("./pages/DuomeiGuyuPage").then(module => ({ default: module.DuomeiGuyuPage })));
const DuomeiGuyuReaderPage = lazy(() => import("./pages/DuomeiGuyuReaderPage").then(module => ({ default: module.DuomeiGuyuReaderPage })));
const DuomeiSkillsPage = lazy(() => import("./pages/DuomeiSkillsPage").then(module => ({ default: module.DuomeiSkillsPage })));
const DuomeiZaobaoPage = lazy(() => import("./pages/DuomeiZaobaoPage").then(module => ({ default: module.DuomeiZaobaoPage })));
const DuomeiZaobaoArchivePage = lazy(() => import("./pages/DuomeiZaobaoArchivePage").then(module => ({ default: module.DuomeiZaobaoArchivePage })));
import { DuomeiHeader } from "./components/DuomeiHeader";
import { DuomeiFooter } from "./components/DuomeiFooter";
import { BackToTopButton } from "./components/BackToTopButton";
import { DuomeiEditProvider } from "./components/DuomeiEditProvider";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { MotionProvider } from "./motion";
import { DuomeiCompanion } from "./components/companion";
import { DuomeiMusicPlayer } from "./components/DuomeiMusicPlayer";
const DuomeiYunyouPage = lazy(() => import("./pages/DuomeiYunyouPage").then(module => ({ default: module.DuomeiYunyouPage })));

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
  return (
    <span
      key={transition.key}
      className={`duomei-route-paper-veil${transition.noteDetail ? " is-note-detail" : ""}`}
      aria-hidden="true"
      onAnimationEnd={() => setTransition((current) => current?.key === transition.key ? null : current)}
    />
  );
}

function PreviewProtectedRoute({ admin = false }: {admin?: boolean}) {
  return <main className="cinema-preview-gate"><h1>{admin ? '内容管理' : '没有遇见，何来艳遇'}</h1><p>这一版用于预览新的视觉与交互。{admin ? '内容编辑' : '同学录的验证与阅读'}仍在多美正式站进行。</p><a href={admin ? 'https://duomei.site/admin' : 'https://duomei.site/guyu/meiyou-yujian'} target="_blank" rel="noreferrer">在正式站打开 ↗</a><a href="/">返回候选版</a></main>;
}
const isCandidatePreview = import.meta.env.VITE_CINEMATIC_PREVIEW === '1';

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isTimePage = location.pathname === "/time";
  const isGuyuReader = location.pathname.startsWith("/guyu/");
  const isZaobao = location.pathname === "/zaobao" || location.pathname.startsWith("/zaobao/");
  const isYunyouMap = location.pathname === "/yunyou-map";
  const bareChrome = isAdmin || isGuyuReader || isZaobao || isYunyouMap;
  useSmoothScroll(bareChrome || isTimePage);

  return (
    <DuomeiEditProvider>
      <RouteScrollManager />
      {!bareChrome ? <DuomeiHeader /> : null}
      <Suspense fallback={<main className="cinema-route-loading" aria-busy="true" aria-label="正在打开页面"><span>DUOMEI</span><p>正在打开…</p></main>}>
      <Routes>
        <Route path="/" element={<DuomeiHomePage />} />
        <Route path="/zaobao" element={<DuomeiZaobaoPage />} />
        <Route path="/zaobao/archive" element={<DuomeiZaobaoArchivePage />} />
        <Route path="/zaobao/:date" element={<DuomeiZaobaoPage />} />
        <Route path="/time" element={<DuomeiTimePage />} />
        <Route path="/note/:slug" element={<DuomeiNoteDetailPage />} />
        <Route path="/guyu" element={<DuomeiGuyuPage />} />
        <Route path="/guyu/meiyou-yujian" element={isCandidatePreview ? <PreviewProtectedRoute /> : <DuomeiGuyuReaderPage />} />
        <Route path="/guyu/:bookId" element={<DuomeiGuyuReaderPage />} />
        <Route path="/skills" element={<DuomeiSkillsPage />} />
        <Route path="/yunyou-map" element={<DuomeiYunyouPage />} />
        <Route path="/about" element={<Navigate to="/#kuaihuo" replace />} />
        <Route path="/admin/login" element={isCandidatePreview ? <PreviewProtectedRoute admin /> : <DuomeiAdmin mode="login" />} />
        <Route path="/admin" element={isCandidatePreview ? <PreviewProtectedRoute admin /> : <DuomeiAdmin mode="notes" />} />
        <Route path="/admin/notes" element={isCandidatePreview ? <PreviewProtectedRoute admin /> : <DuomeiAdmin mode="notes" />} />
        <Route path="*" element={<DuomeiNotFoundPage />} />
      </Routes>
      </Suspense>
      <PublicRoutePaperVeil pathname={location.pathname} disabled={isAdmin || isGuyuReader} />
      {!bareChrome ? <DuomeiFooter /> : null}
      {!isAdmin ? <DuomeiMusicPlayer compactContext={isGuyuReader || isZaobao || isYunyouMap} /> : null}
      {!bareChrome ? <DuomeiCompanion /> : null}
      {!bareChrome ? <BackToTopButton /> : null}
    </DuomeiEditProvider>
  );
}

export default function App() {
  const basename = window.location.pathname.startsWith("/duomei") ? "/duomei" : "/";

  return (
    <BrowserRouter basename={basename}>
      <MotionProvider>
        <AppRoutes />
      </MotionProvider>
    </BrowserRouter>
  );
}
