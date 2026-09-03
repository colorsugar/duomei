import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { DuomeiAdmin } from "./pages/DuomeiAdmin";
import { DuomeiHomePage } from "./pages/DuomeiHomePage";
import { DuomeiNoteDetailPage } from "./pages/DuomeiNoteDetailPage";
import { DuomeiTimePage } from "./pages/DuomeiTimePage";
import { DuomeiNotFoundPage } from "./pages/DuomeiNotFoundPage";
import { DuomeiGuyuPage } from "./pages/DuomeiGuyuPage";
import { DuomeiGuyuReaderPage } from "./pages/DuomeiGuyuReaderPage";
import { DuomeiSkillsPage } from "./pages/DuomeiSkillsPage";
import { DuomeiHeader } from "./components/DuomeiHeader";
import { DuomeiFooter } from "./components/DuomeiFooter";
import { BackToTopButton } from "./components/BackToTopButton";
import { DuomeiEditProvider } from "./components/DuomeiEditProvider";
import { RouteScrollManager } from "./components/RouteScrollManager";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { MotionProvider } from "./motion";
import { DuomeiCompanion } from "./components/companion";

function AppRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const isTimePage = location.pathname === "/time";
  const isGuyuReader = location.pathname.startsWith("/guyu/");
  const reduceMotion = useReducedMotion() ?? false;
  useSmoothScroll(isAdmin || isTimePage || isGuyuReader || reduceMotion);

  return (
    <DuomeiEditProvider>
      <RouteScrollManager />
      {!isAdmin && !isGuyuReader ? <DuomeiHeader /> : null}
      <Routes>
        <Route path="/" element={<DuomeiHomePage />} />
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
      {!isAdmin && !isGuyuReader ? <DuomeiFooter /> : null}
      {!isAdmin && !isGuyuReader ? <DuomeiCompanion /> : null}
      {!isAdmin && !isGuyuReader ? <BackToTopButton /> : null}
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
