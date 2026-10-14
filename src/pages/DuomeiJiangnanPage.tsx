import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSceneNavigation } from "../lib/sceneNavigation";
import "../xiaoyuan-page.css";

// 诗语江南: the 江南园林 scene of the same /xiaoyuan-scene runtime, opened at ?scene=garden.
export function DuomeiJiangnanPage() {
  useSceneNavigation();
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "诗语江南 | DUOMEI";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="xiaoyuan-page" aria-label="诗语江南">
      <Link className="xiaoyuan-back" to="/#yunyou">
        <span aria-hidden="true">←</span> 返回多美
      </Link>
      <iframe
        key="jiangnan"
        className="xiaoyuan-frame"
        src="/xiaoyuan-scene/index.html?embed=1&scene=garden"
        title="诗语江南 · 3D 园林"
        loading="eager"
        allow="fullscreen; autoplay"
        allowFullScreen
      />
    </main>
  );
}
