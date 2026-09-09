import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "../atlas-page.css";

export function DuomeiChaojiMapPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "超级大陆 · 骨架地图 | 多美小记";
    return () => { document.title = previousTitle; };
  }, []);
  return <main className="duomei-atlas-page" aria-label="超级大陆骨架地图">
    <nav className="dalu-map-nav" aria-label="超级大陆导航">
      <Link to="/">← 返回多美</Link>
    </nav>
    <iframe ref={frame} src="/atlas/chaoji/index.html" title="超级大陆 · 骨架地图" />
  </main>;
}
