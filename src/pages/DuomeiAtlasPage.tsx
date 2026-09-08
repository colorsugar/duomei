import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../atlas-page.css";

export function DuomeiAtlasPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const entry = new URLSearchParams(location.search).get("entry");
  const query = `?embed=duomei${entry ? `&entry=${encodeURIComponent(entry)}` : ""}`;
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "七国战略图志 · V6 | 多美小记";
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      if (event.data?.type === "atlas-open-artbook") navigate("/guyu/hanhai-realms-artbook");
    };
    window.addEventListener("message", onMessage);
    return () => { document.title = previousTitle; window.removeEventListener("message", onMessage); };
  }, [navigate]);
  return <main className="duomei-atlas-page" aria-label="七国战略图志">
    <iframe ref={frame} src={`/atlas/v6/index.html${query}`} title="七国战略图志 · 可交互地图" />
  </main>;
}
