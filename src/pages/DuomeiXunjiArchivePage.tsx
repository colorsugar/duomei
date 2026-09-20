import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { XUNJI_ARCHIVE_URL, XUNJI_PROXY_ROUTE, XUNJI_ROUTE } from "../components/XunjiSection";
import { XunjiReaderBar, isoDateFromXunjiLabel, isXunjiDate } from "./DuomeiXunjiPage";
import "../components/ZaobaoSection.css";

const XUNJI_MANIFEST_URL = `${XUNJI_PROXY_ROUTE}/archive/manifest.json`;
const XUNJI_ARCHIVE_PROXY = `${XUNJI_PROXY_ROUTE}/archive/`;

type XunjiArchiveEntry = {
  date: string;
  dateLabel: string;
  h1: string;
};

function parseManifest(payload: unknown): XunjiArchiveEntry[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .flatMap((row): XunjiArchiveEntry[] => {
      if (!row || typeof row !== "object") return [];
      const { date, dateLabel, h1 } = row as Record<string, unknown>;
      const dateValue = typeof date === "string" ? date : undefined;
      if (!isXunjiDate(dateValue)) return [];
      return [{
        date: dateValue,
        dateLabel: typeof dateLabel === "string" && dateLabel.trim() ? dateLabel.trim() : dateValue,
        h1: typeof h1 === "string" ? h1.trim() : "",
      }];
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function parseArchiveHtml(html: string): XunjiArchiveEntry[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const found = new Map<string, XunjiArchiveEntry>();
  const add = (date: string, dateLabel = date, h1 = "") => {
    if (!isXunjiDate(date) || found.has(date)) return;
    found.set(date, { date, dateLabel, h1 });
  };
  doc.querySelectorAll("a[href]").forEach((anchor) => {
    const href = anchor.getAttribute("href") ?? "";
    const match = href.match(/(\d{4}-\d{2}-\d{2})/);
    if (match) add(match[1], anchor.textContent?.trim() || match[1], "");
  });
  const heading = doc.querySelector("main h2, h2, .date")?.textContent?.trim() ?? "";
  const headingDate = isoDateFromXunjiLabel(heading);
  if (headingDate) add(headingDate, heading, doc.querySelector("h1")?.textContent?.trim() ?? "");
  return [...found.values()].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function DuomeiXunjiArchivePage() {
  const [entries, setEntries] = useState<XunjiArchiveEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "往期寻迹 | DUOMEI";
    const controller = new AbortController();
    const load = async () => {
      try {
        const manifest = await fetch(XUNJI_MANIFEST_URL, { signal: controller.signal });
        if (manifest.ok) {
          const parsed = parseManifest(await manifest.json());
          if (parsed.length) {
            setEntries(parsed);
            return;
          }
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      try {
        const response = await fetch(XUNJI_ARCHIVE_PROXY, { signal: controller.signal });
        if (!response.ok) throw new Error(`Xunji archive returned ${response.status}`);
        setEntries(parseArchiveHtml(await response.text()));
      } catch (error: unknown) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      }
    };
    load();
    return () => {
      controller.abort();
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="zaobao-page">
      <XunjiReaderBar originalUrl={XUNJI_ARCHIVE_URL}>
        <Link className="zaobao-page-archive" to={XUNJI_ROUTE}>
          今日
        </Link>
      </XunjiReaderBar>

      <div className="zaobao-archive">
        <header className="zaobao-archive-hero">
          <p className="zaobao-edition-kicker">寻迹 · 往期</p>
          <h1>往期寻迹</h1>
          <p>每天一束西幻素材，按日子往回翻。点任意一天，在多美站内读那天的摘录。</p>
        </header>

        {!entries && !failed ? (
          <section className="zaobao-archive-empty" aria-live="polite" aria-busy="true">
            <p>正在翻找往期…</p>
          </section>
        ) : null}

        {failed || (entries && entries.length === 0) ? (
          <section className="zaobao-archive-empty">
            <p>往期清单暂时拿不到。可以先去原站翻一翻。</p>
            <a className="zaobao-page-open" href={XUNJI_ARCHIVE_URL} target="_blank" rel="noreferrer">
              去原站看往期 ↗
            </a>
          </section>
        ) : null}

        {entries && entries.length > 0 ? (
          <ol className="zaobao-archive-list">
            {entries.map((entry) => (
              <li key={entry.date}>
                <Link to={`${XUNJI_ROUTE}/${entry.date}`}>
                  <time dateTime={entry.date}>{entry.dateLabel}</time>
                  <strong>{entry.h1 || "寻迹"}</strong>
                  <span aria-hidden="true">读这一天 →</span>
                </Link>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </main>
  );
}
