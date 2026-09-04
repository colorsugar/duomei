import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HomeSectionHold } from "./HomeSectionHold";
import "./ZaobaoSection.css";

export const ZAOBAO_ROUTE = "/zaobao";
export const ZAOBAO_ARCHIVE_ROUTE = "/zaobao/archive";
export const ZAOBAO_URL = "https://zaobao-six.vercel.app";
export const ZAOBAO_ARCHIVE_URL = `${ZAOBAO_URL}/archive/`;
const ZAOBAO_FALLBACK_COVER = "/images/note-default-covers/duomei-default-cover-02.png";

type ZaobaoDaily = {
  headline: string;
  date: string;
  image: string | null;
  source: string | null;
};

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Tokyo",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

// zaobao-six serves its HTML with `access-control-allow-origin: *`; the headline
// is its <h1> and the lead story's <figure><img> is the cover photo of the day.
async function fetchZaobaoDaily(signal: AbortSignal): Promise<ZaobaoDaily | null> {
  const response = await fetch(ZAOBAO_URL, { signal, mode: "cors" });
  if (!response.ok) return null;
  const doc = new DOMParser().parseFromString(await response.text(), "text/html");
  const headline = doc.querySelector("h1")?.textContent?.trim();
  if (!headline) return null;
  const image = doc.querySelector("article figure img")?.getAttribute("src") ?? null;
  return {
    headline,
    date: doc.querySelector(".date")?.textContent?.trim() ?? "",
    image: image && /^https:\/\//.test(image) ? image : null,
    source: doc.querySelector("article figcaption")?.textContent?.trim() ?? null,
  };
}

export function ZaobaoSection() {
  const [daily, setDaily] = useState<ZaobaoDaily | null>(null);
  const [coverBroken, setCoverBroken] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetchZaobaoDaily(controller.signal)
      .then((next) => {
        if (next) setDaily(next);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const coverSrc = daily?.image && !coverBroken ? daily.image : ZAOBAO_FALLBACK_COVER;
  const isLiveCover = coverSrc !== ZAOBAO_FALLBACK_COVER;

  return (
    <HomeSectionHold id="zaobao" className="zaobao-section" ariaLabelledBy="zaobao-title">
      <header className="zaobao-heading">
        <h2 id="zaobao-title">早报</h2>
        <div className="zaobao-heading-copy">
          <p>每日一纸，给多美的今早。</p>
          <Link className="zaobao-heading-archive" to={ZAOBAO_ARCHIVE_ROUTE}>
            往期早报 →
          </Link>
        </div>
      </header>

      <Link className="zaobao-card" to={ZAOBAO_ROUTE} aria-label={daily ? `打开今日早报：${daily.headline}` : "打开今日早报"}>
        <span className="zaobao-card-cover" aria-hidden="true">
          <img
            key={coverSrc}
            className="zaobao-cover-image"
            src={coverSrc}
            alt=""
            width="1448"
            height="1086"
            loading="lazy"
            decoding="async"
            referrerPolicy="no-referrer"
            onError={() => setCoverBroken(true)}
          />
          <span className="zaobao-cover-topline">
            <small>Duomei Daily</small>
            <small>Morning Edition</small>
          </span>
          <span className="zaobao-masthead">
            <small>今日读本</small>
            <strong>早报</strong>
            <em>{daily?.date || todayLabel()}</em>
          </span>
          <span className="zaobao-cover-headline">
            <b>{daily?.headline ?? "世界 · 科技 · AI · 大阪"}</b>
            {isLiveCover && daily?.source ? <small>封面 · {daily.source}</small> : null}
          </span>
        </span>
        <span className="zaobao-card-kicker" aria-hidden="true">Daily · 今日</span>
        <strong className="zaobao-card-title">今日早报</strong>
        <span className="zaobao-card-copy">国际、国内、科技、AI、兴趣、日常，加上堺与大阪本周能去的展和祭。每天早上更新一版。</span>
        <span className="zaobao-card-cta">翻开今早 →</span>
      </Link>
    </HomeSectionHold>
  );
}
