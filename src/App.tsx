import { useLayoutEffect, useRef, useState } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { DuomeiAdmin } from "./pages/DuomeiAdmin";
import { DuomeiHomePage } from "./pages/DuomeiHomePage";
import { DuomeiNoteDetailPage } from "./pages/DuomeiNoteDetailPage";
import { DuomeiTimePage } from "./pages/DuomeiTimePage";
import { DuomeiNotFoundPage } from "./pages/DuomeiNotFoundPage";
import { DuomeiGuyuPage } from "./pages/DuomeiGuyuPage";
import { DuomeiGuyuReaderPage } from "./pages/DuomeiGuyuReaderPage";
import { DuomeiSkillsPage } from "./pages/DuomeiSkillsPage";
import { DuomeiZaobaoPage } from "./pages/DuomeiZaobaoPage";
import { DuomeiZaobaoArchivePage } from "./pages/DuomeiZaobaoArchivePage";
import { DuomeiHeader } from "./components/DuomeiHeader";
import { DuomeiFooter } from "./components/DuomeiFooter";
import { BackToTopButton } from "./components/BackToTopButton";
import { DuomeiEditProvider } from "./components/DuomeiEditProvider";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { MotionProvider } from "./motion";
import { DuomeiCompanion } from "./components/companion";
import { DuomeiMusicPlayer } from "./components/DuomeiMusicPlayer";

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

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isTimePage = location.pathname === "/time";
  const isGuyuReader = location.pathname.startsWith("/guyu/");
  const isZaobao = location.pathname === "/zaobao" || location.pathname.startsWith("/zaobao/");
  const bareChrome = isAdmin || isGuyuReader || isZaobao;
  useSmoothScroll(bareChrome || isTimePage);

  return (
    <DuomeiEditProvider>
      <RouteScrollManager />
      {!bareChrome ? <DuomeiHeader /> : null}
      <Routes>
        <Route path="/" element={<DuomeiHomePage />} />
        <Route path="/zaobao" element={<DuomeiZaobaoPage />} />
        <Route path="/zaobao/archive" element={<DuomeiZaobaoArchivePage />} />
        <Route path="/zaobao/:date" element={<DuomeiZaobaoPage />} />
        <Route path="/time" element={<DuomeiTimePage />} />
        <Route path="/note/:slug" element={<DuomeiNoteDetailPage />} />
        <Route path="/guyu" element={<DuomeiGuyuPage />} />
        <Route path="/guyu/:bookId" element={<DuomeiGuyuReaderPage />} />
        <Route path="/skills" element={<DuomeiSkillsPage />} />
        <Route path="/about" element={<Navigate to="/#kuaihuo" replace />} />
        <Route path="/admin/login" element={<DuomeiAdmin mode="login" />} />
        <Route path="/admin" element={<DuomeiAdmin mode="notes" />} />
        <Route path="/admin/notes" element={<DuomeiAdmin mode="notes" />} />
        <Route path="*" element={<DuomeiNotFoundPage />} />
      </Routes>
      <PublicRoutePaperVeil pathname={location.pathname} disabled={isAdmin || isGuyuReader} />
      {!bareChrome ? <DuomeiFooter /> : null}
      {!isAdmin ? <DuomeiMusicPlayer compactContext={isGuyuReader || isZaobao} /> : null}
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
