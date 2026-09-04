import { HomeSectionHold } from "./HomeSectionHold";
import "./ZaobaoSection.css";

export const ZAOBAO_ROUTE = "/zaobao";
export const ZAOBAO_URL = "https://zaobao-six.vercel.app";

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export function ZaobaoSection() {
  return (
    <HomeSectionHold id="zaobao" className="zaobao-section" ariaLabelledBy="zaobao-title">
      <header className="zaobao-heading">
        <h2 id="zaobao-title">早报</h2>
        <p>每日一纸，给多美的今早。</p>
      </header>

      <a className="zaobao-card" href={ZAOBAO_ROUTE} aria-label="打开今日早报">
        <span className="zaobao-card-cover" aria-hidden="true">
          <img
            className="zaobao-cover-image"
            src="/images/note-default-covers/duomei-default-cover-02.png"
            alt=""
            width="1448"
            height="1086"
            loading="lazy"
            decoding="async"
          />
          <span className="zaobao-cover-topline">
            <small>Duomei Daily</small>
            <small>Morning Edition</small>
          </span>
          <span className="zaobao-masthead">
            <small>今日读本</small>
            <strong>早报</strong>
            <em>{todayLabel()}</em>
          </span>
          <span className="zaobao-cover-topics">世界 · 科技 · AI · 大阪</span>
        </span>
        <span className="zaobao-card-kicker" aria-hidden="true">Daily · 今日</span>
        <strong className="zaobao-card-title">今日早报</strong>
        <span className="zaobao-card-copy">国际、国内、科技、AI、兴趣、日常，加上堺与大阪本周能去的展和祭。每天早上更新一版。</span>
        <span className="zaobao-card-cta">翻开今早 →</span>
      </a>
    </HomeSectionHold>
  );
}
