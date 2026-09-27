import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../xiaoyuan-page.css";

export function DuomeiXiaoyuanPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "多美的夏日小院 | DUOMEI";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="xiaoyuan-page" aria-label="多美的夏日小院">
      <Link className="xiaoyuan-back" to="/#yunyou">
        <span aria-hidden="true">←</span> 返回多美
      </Link>
      <iframe
        className="xiaoyuan-frame"
        src="/xiaoyuan-scene/index.html?embed=1"
        title="多美的夏日小院 · 3D 场景"
        loading="eager"
        allow="fullscreen; autoplay"
        allowFullScreen
      />
    </main>
  );
}
