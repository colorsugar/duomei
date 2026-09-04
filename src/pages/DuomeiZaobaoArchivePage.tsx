import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ZAOBAO_ARCHIVE_URL, ZAOBAO_ROUTE, ZAOBAO_URL } from "../components/ZaobaoSection";
import { ZaobaoReaderBar, isZaobaoDate } from "./DuomeiZaobaoPage";

const ZAOBAO_MANIFEST_URL = `${ZAOBAO_URL}/archive/manifest.json`;

type ZaobaoArchiveEntry = {
  date: string;
  dateLabel: string;
  h1: string;
};

// manifest.json is `[{ date, dateLabel, h1, bytes }]`; keep only rows whose date is a
// real YYYY-MM-DD because it becomes part of our own route.
function parseManifest(payload: unknown): ZaobaoArchiveEntry[] {
  if (!Array.isArray(payload)) return [];
  return payload
    .flatMap((row): ZaobaoArchiveEntry[] => {
      if (!row || typeof row !== "object") return [];
      const { date, dateLabel, h1 } = row as Record<string, unknown>;
      const dateValue = typeof date === "string" ? date : undefined;
      if (!isZaobaoDate(dateValue)) return [];
      return [{
        date: dateValue,
        dateLabel: typeof dateLabel === "string" && dateLabel.trim() ? dateLabel.trim() : dateValue,
        h1: typeof h1 === "string" ? h1.trim() : "",
      }];
    })
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function DuomeiZaobaoArchivePage() {
  const [entries, setEntries] = useState<ZaobaoArchiveEntry[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "往期早报 | DUOMEI";
    const controller = new AbortController();
    fetch(ZAOBAO_MANIFEST_URL, { signal: controller.signal, mode: "cors" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Zaobao manifest returned ${response.status}`);
        setEntries(parseManifest(await response.json()));
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => {
      controller.abort();
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="zaobao-page">
      <ZaobaoReaderBar originalUrl={ZAOBAO_ARCHIVE_URL}>
        <Link className="zaobao-page-archive" to={ZAOBAO_ROUTE}>
          今日
        </Link>
      </ZaobaoReaderBar>

      <div className="zaobao-archive">
        <header className="zaobao-archive-hero">
          <p className="zaobao-edition-kicker">早报 · 往期</p>
          <h1>往期早报</h1>
          <p>每天一纸，按日子往回翻。点任意一天，在多美站内读那天的版面。</p>
        </header>

        {!entries && !failed ? (
          <section className="zaobao-archive-empty" aria-live="polite" aria-busy="true">
            <p>正在翻找往期…</p>
          </section>
        ) : null}

        {failed || (entries && entries.length === 0) ? (
          <section className="zaobao-archive-empty">
            <p>往期清单暂时拿不到。可以先去原站翻一翻。</p>
            <a className="zaobao-page-open" href={ZAOBAO_ARCHIVE_URL} target="_blank" rel="noreferrer">
              去原站看往期 ↗
            </a>
          </section>
        ) : null}

        {entries && entries.length > 0 ? (
          <ol className="zaobao-archive-list">
            {entries.map((entry) => (
              <li key={entry.date}>
                <Link to={`${ZAOBAO_ROUTE}/${entry.date}`}>
                  <time dateTime={entry.date}>{entry.dateLabel}</time>
                  <strong>{entry.h1 || "早报"}</strong>
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
