import { Link } from "react-router-dom";
import { getSettings } from "../lib/cmsStore";
import { useInlineEdit } from "./InlineEditProvider";

export function Hero() {
  const settings = getSettings();
  const { isLoggedIn, editMode, openSettingsEditor } = useInlineEdit();

  return (
    <section className={`hero ${isLoggedIn && editMode ? "editable-block" : ""}`} id="top" aria-label="TAMI personal archive">
      {isLoggedIn && editMode ? (
        <div className="editable-actions">
          <button className="front-edit-button" type="button" onClick={() => openSettingsEditor("hero")}>
          编辑首页信息
          </button>
        </div>
      ) : null}
      <div className="hero-copy" data-reveal>
        <p className="eyebrow">{settings.heroEyebrow}</p>
        <h1>{settings.heroTitle}</h1>
        <p className="hero-text">{settings.heroDescription}</p>
        <p className="hero-subtitle">{settings.siteSubtitle}</p>
        <div className="hero-actions">
          <Link className="button primary" to="/journey">
            {settings.primaryButtonText}
          </Link>
          <Link className="button secondary" to="/essays">
            {settings.secondaryButtonText}
          </Link>
        </div>
      </div>

      <div
        className="hero-visual"
        data-reveal
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = (event.clientX - rect.left) / rect.width - 0.5;
          const y = (event.clientY - rect.top) / rect.height - 0.5;
          event.currentTarget.style.setProperty("--px", String(x * 12));
          event.currentTarget.style.setProperty("--py", String(y * -12));
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.setProperty("--px", "0");
          event.currentTarget.style.setProperty("--py", "0");
        }}
      >
        <div className="visual-card visual-card-large float-soft">
          <span>Journey</span>
          <strong>Kansai</strong>
          <em>Camera / Train / Sea</em>
        </div>
        <div className="visual-card visual-card-note float-soft delay-one">
          <span>古文ノート</span>
          <strong>山水与归乡</strong>
        </div>
        <div className="visual-card visual-card-night float-soft delay-two">
          <span>夜勤メモ</span>
          <strong>05:42</strong>
        </div>
        <div className="visual-card visual-card-photo float-soft delay-three">
          <span>写真日記</span>
          <strong>Osaka light</strong>
        </div>
      </div>
    </section>
  );
}
