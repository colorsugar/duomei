import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../atlas-page.css";

export function DuomeiAtlasPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  const entry = search.get("entry");
  // The relief map is the default; `?view=2d` keeps the flat V6 chart reachable.
  const flat = search.get("view") === "2d";
  const query = `?embed=duomei${entry ? `&entry=${encodeURIComponent(entry)}` : ""}`;
  const src = flat ? `/atlas/v6/index.html${query}` : `/atlas/v6/3d.html${query}`;
  const [immersive, setImmersive] = useState(false);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "大陆 · 七国战略图志 | 多美小记";
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "atlas-open-artbook") navigate("/guyu/hanhai-realms-artbook");
      if (event.data?.type === "atlas-immersive") setImmersive(Boolean(event.data.on));
    };
    window.addEventListener("message", onMessage);
    return () => { document.title = previousTitle; window.removeEventListener("message", onMessage); };
  }, [navigate]);
  useEffect(() => { setImmersive(false); }, [src]);
  return <main className={`duomei-atlas-page${immersive ? " is-immersive" : ""}`} aria-label="七国战略图志">
    <nav className="dalu-map-nav" aria-label="大陆专题导航" hidden={immersive}>
      <Link to="/dalu">← 返回大陆</Link>
      <span className="dalu-map-nav-actions">
        <Link to={flat ? `/dalu/map${entry ? `?entry=${encodeURIComponent(entry)}` : ""}` : `/dalu/map?view=2d${entry ? `&entry=${encodeURIComponent(entry)}` : ""}`}>
          {flat ? "立体版" : "平面版"}
        </Link>
        <a href="/downloads/fantasy-continent-artbook.pdf" target="_blank" rel="noopener noreferrer">艺术图集 PDF ↗</a>
      </span>
    </nav>
    <iframe key={src} ref={frame} src={src} title={flat ? "七国战略图志 · 平面地图" : "七国战略图志 · 立体地图"} />
  </main>;
}
