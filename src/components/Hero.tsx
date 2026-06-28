import { Link } from "react-router-dom";
import { getSettings } from "../lib/cmsStore";

export function Hero() {
  const settings = getSettings();

  return (
    <section className="hero" id="top" aria-label="TAMI personal archive">
      <div className="hero-copy" data-reveal>
        <p className="eyebrow">TAMI PERSONAL ARCHIVE</p>
        <h1>多美数字档案馆</h1>
        <p className="hero-text">
          这里保存多美的旅程、摄影、古文札记、文章、日本生活、介护工作记忆，以及 AI 旅伴留下的留言。
        </p>
        <p className="hero-subtitle">{settings.siteSubtitle}</p>
        <div className="hero-actions">
          <Link className="button primary" to="/journey">
            查看旅程
          </Link>
          <Link className="button secondary" to="/essays">
            阅读文章
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
