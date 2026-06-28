import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AdminApp } from "./admin/AdminApp";
import { Header } from "./components/Header";
import { IntroOverlay } from "./components/IntroOverlay";
import { PageTransition } from "./components/PageTransition";
import { Footer } from "./components/Footer";
import { useReveal } from "./hooks/useReveal";
import { useSmoothScroll } from "./hooks/useSmoothScroll";
import { DetailPage } from "./pages/DetailPage";
import { HomePage } from "./pages/HomePage";
import { ListingPage } from "./pages/ListingPage";
import { NotFoundPage } from "./pages/NotFoundPage";

function SiteRoutes() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  useReveal(location.pathname);
  useSmoothScroll(isAdmin);

  return (
    <>
      {!isAdmin ? <IntroOverlay /> : null}
      {!isAdmin ? <Header /> : null}
      <PageTransition transitionKey={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/journey" element={<ListingPage type="journey" />} />
          <Route path="/photo" element={<ListingPage type="photo" />} />
          <Route path="/notes" element={<ListingPage type="note" />} />
          <Route path="/essays" element={<ListingPage type="essay" />} />
          <Route path="/journey/:slug" element={<DetailPage type="journey" />} />
          <Route path="/photo/:slug" element={<DetailPage type="photo" />} />
          <Route path="/note/:slug" element={<DetailPage type="note" />} />
          <Route path="/essay/:slug" element={<DetailPage type="essay" />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/home" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </PageTransition>
      {!isAdmin ? <Footer /> : null}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SiteRoutes />
    </BrowserRouter>
  );
}
