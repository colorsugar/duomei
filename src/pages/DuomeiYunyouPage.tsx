import { useEffect } from "react";
import { Link } from "react-router-dom";
import "../yunyou-page.css";

export function DuomeiYunyouPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "云游桂林 | DUOMEI";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="yunyou-map-page" aria-label="云游桂林">
      <Link className="yunyou-map-back" to="/#yunyou">
        <span aria-hidden="true">←</span> 返回多美
      </Link>
      <iframe className="yunyou-map-frame" src="/yunyou/index.html?embed=1" title="桂林两江四湖 · 3D 景点地图" loading="eager" />
    </main>
  );
}
