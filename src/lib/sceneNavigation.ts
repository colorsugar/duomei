import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// The embedded /xiaoyuan-scene runtime posts {type: "duomei-scene-goto", scene} when a visitor walks
// between 多美的夏日小院 and 诗语江南 (the hall's handscroll, the garden's gate or 回小院 button).
// The shell turns that into an in-app route change so the address bar, back link and music survive.
const SCENE_ROUTES: Record<string, string> = { xiaoyuan: "/xiaoyuan", jiangnan: "/jiangnan" };

export function useSceneNavigation() {
  const navigate = useNavigate();
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: unknown; scene?: unknown } | null;
      if (!data || data.type !== "duomei-scene-goto" || typeof data.scene !== "string") return;
      const to = SCENE_ROUTES[data.scene];
      if (to) navigate(to);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);
}
