import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { HomeSectionHold } from "./HomeSectionHold";
import "./XunjiSection.css";

export const XUNJI_ROUTE = "/xunji";
export const XUNJI_ARCHIVE_ROUTE = "/xunji/archive";
export const XUNJI_URL = "https://xihuan.vercel.app";
export const XUNJI_ARCHIVE_URL = `${XUNJI_URL}/archive/`;
// Same-origin edge relay (edge-functions/xunji-src*) — the visitor's browser never
// has to reach vercel.app, which is unreachable from mainland China.
export const XUNJI_PROXY_ROUTE = "/xunji-src";

type XunjiDaily = {
  headline: string;
  date: string;
  lede: string;
};

function todayLabel() {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

async function fetchXunjiDaily(signal: AbortSignal): Promise<XunjiDaily | null> {
  const response = await fetch(XUNJI_PROXY_ROUTE, { signal });
  if (!response.ok) return null;
  const doc = new DOMParser().parseFromString(await response.text(), "text/html");
  const headline = doc.querySelector("h1")?.textContent?.trim();
  if (!headline) return null;
  const lede = Array.from(doc.querySelectorAll("main p"))
    .map((node) => node.textContent?.trim() ?? "")
    .find((text) => text && !/往期/.test(text)) ?? "";
  return {
    headline,
    date: doc.querySelector("main h2, h2, .date")?.textContent?.trim() ?? "",
    lede,
  };
}

export function XunjiSection() {
  const [daily, setDaily] = useState<XunjiDaily | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchXunjiDaily(controller.signal)
      .then((next) => {
        if (next) setDaily(next);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <HomeSectionHold id="xunji" className="xunji-home" ariaLabelledBy="xunji-title">
      <header className="xunji-heading">
        <span className="xunji-eyebrow">西幻写作素材</span>
        <h2 id="xunji-title">寻迹</h2>
        <p>从琐事里，摘出可直接开写的西幻故事骨架。</p>
        <Link className="xunji-heading-archive" to={XUNJI_ARCHIVE_ROUTE}>
          往期寻迹 →
        </Link>
      </header>

      <Link className="xunji-home-card" to={XUNJI_ROUTE} aria-label={daily ? `打开寻迹：${daily.lede || daily.headline}` : "打开寻迹"}>
        <span className="xunji-home-kicker">
          <small>寻迹 · XUNJI</small>
          <small>{daily?.date || todayLabel()}</small>
        </span>
        <strong className="xunji-home-title">{daily?.headline ?? "寻迹"}</strong>
        <span className="xunji-home-copy">{daily?.lede || "每天一束西幻素材，给多美的写作台。"}</span>
        <span className="xunji-cta">打开寻迹 →</span>
      </Link>
    </HomeSectionHold>
  );
}
