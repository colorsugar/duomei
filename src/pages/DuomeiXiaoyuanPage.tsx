import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSceneNavigation } from "../lib/sceneNavigation";
import { useI18n } from "../i18n/I18nProvider";
import { LangToggle } from "../i18n/LangToggle";
import "../xiaoyuan-page.css";

export function DuomeiXiaoyuanPage() {
  useSceneNavigation();
  const { lang, t } = useI18n();
  const frameRef = useRef<HTMLIFrameElement>(null);
  // The scene reads its starting language from the URL once; later switches are posted to it,
  // so toggling never reloads the 3D scene.
  const [initialLang] = useState(lang);
  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ type: "duomei-lang", lang }, window.location.origin);
  }, [lang]);
  useEffect(() => {
    const previousTitle = document.title;
    document.title = t("xiaoyuan.docTitle");
    return () => {
      document.title = previousTitle;
    };
  }, [t]);

  return (
    <main className="xiaoyuan-page" aria-label={t("xiaoyuan.title")}>
      <Link className="xiaoyuan-back" to="/#yunyou">
        <span aria-hidden="true">←</span> {t("scene.back")}
      </Link>
      <LangToggle className="xiaoyuan-lang" />
      <iframe
        ref={frameRef}
        key="xiaoyuan"
        className="xiaoyuan-frame"
        src={`/xiaoyuan-scene/index.html?embed=1${initialLang === "en" ? "&lang=en" : ""}`}
        title={t("xiaoyuan.frameTitle")}
        loading="eager"
        allow="fullscreen; autoplay"
        allowFullScreen
      />
    </main>
  );
}
