import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { XUNJI_ARCHIVE_ROUTE, XUNJI_PROXY_ROUTE, XUNJI_URL } from "../components/XunjiSection";
import {
  parseXunjiEdition,
  xunjiParagraphClass,
  xunjiStoryBody,
  xunjiTextParts,
  type XunjiEdition,
} from "../lib/xunjiEdition";
import "../components/ZaobaoSection.css";
import "../components/XunjiSection.css";

// Source edition URLs are /YYYY-MM-DD/; anything else falls back to the archive list.
export const XUNJI_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isXunjiDate(value: string | undefined): value is string {
  if (!value || !XUNJI_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function xunjiEditionUrl(date?: string) {
  return date ? `${XUNJI_URL}/${date}/` : XUNJI_URL;
}

export function xunjiProxyUrl(date?: string) {
  return date ? `${XUNJI_PROXY_ROUTE}/${date}/` : XUNJI_PROXY_ROUTE;
}

export function isoDateFromXunjiLabel(label: string) {
  const iso = label.match(/(\d{4}-\d{2}-\d{2})/);
  if (iso && isXunjiDate(iso[1])) return iso[1];
  const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : undefined;
}

function XunjiLinkedText({ text }: { text: string }) {
  const parts = xunjiTextParts(text);
  if (parts.length === 1 && !parts[0].href) return parts[0].text;
  return parts.map((part, index) => (
    part.href ? (
      <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">
        {part.text}
      </a>
    ) : part.text
  ));
}

export function XunjiReaderBar({ originalUrl, children }: { originalUrl: string; children?: ReactNode }) {
  return (
    <header className="zaobao-reader-bar">
      <Link className="zaobao-page-back" to="/#xunji" aria-label="返回首页">
        ← 返回首页
      </Link>
      <span className="zaobao-reader-mark" aria-hidden="true">DUOMEI · 寻迹</span>
      <nav className="zaobao-reader-actions" aria-label="寻迹导航">
        {children}
        <a className="zaobao-page-open" href={originalUrl} target="_blank" rel="noreferrer">
          打开原版 ↗
        </a>
      </nav>
    </header>
  );
}

export function DuomeiXunjiPage() {
  const { date: dateParam } = useParams<{ date: string }>();
  const date = isXunjiDate(dateParam) ? dateParam : undefined;
  const invalidDate = dateParam !== undefined && !date;
  const editionUrl = xunjiEditionUrl(date);
  const editionLabel = date ? `${date} 寻迹` : "今日寻迹";
  const [edition, setEdition] = useState<XunjiEdition | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (invalidDate) return;
    const previousTitle = document.title;
    document.title = `${editionLabel} | DUOMEI`;
    setEdition(null);
    setFailed(false);
    const controller = new AbortController();
    fetch(xunjiProxyUrl(date), { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Xunji returned ${response.status}`);
        const next = parseXunjiEdition(await response.text());
        if (!next) throw new Error("Xunji document did not match the expected structure");
        setEdition(next);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => {
      controller.abort();
      document.title = previousTitle;
    };
  }, [attempt, date, editionLabel, invalidDate]);

  if (invalidDate) {
    return <Navigate to={XUNJI_ARCHIVE_ROUTE} replace />;
  }

  return (
    <main className="zaobao-page xunji-page">
      <XunjiReaderBar originalUrl={editionUrl}>
        <Link className="zaobao-page-archive" to={XUNJI_ARCHIVE_ROUTE}>
          往期
        </Link>
      </XunjiReaderBar>

      {!edition && !failed ? (
        <section className="zaobao-reader-loading" aria-live="polite" aria-busy="true">
          <p>正在展开{editionLabel}…</p>
        </section>
      ) : null}

      {failed ? (
        <section className="zaobao-reader-loading zaobao-reader-failed" aria-live="polite">
          <p>{editionLabel}暂时没拿到，可能是网络不太顺。</p>
          <div className="zaobao-reader-failed-actions">
            <button type="button" className="zaobao-page-open" onClick={() => setAttempt((current) => current + 1)}>
              再试一次
            </button>
            <a className="zaobao-page-open" href={editionUrl} target="_blank" rel="noreferrer">
              打开原版 ↗
            </a>
          </div>
        </section>
      ) : null}

      {edition ? (
        <div className="zaobao-edition">
          <header className="zaobao-edition-hero xunji-edition-hero">
            <div>
              <p className="zaobao-edition-kicker">{date ? "寻迹 · 往期" : "寻迹 · XUNJI"}</p>
              <h1>{edition.headline}</h1>
            </div>
            <div className="zaobao-edition-summary">
              {edition.date ? <time>{edition.date}</time> : null}
              {edition.lede ? <p>{edition.lede}</p> : null}
            </div>
          </header>

          <div className="zaobao-edition-groups">
            {edition.groups.map((group) => (
              <section className="zaobao-edition-group" id={group.id} key={group.id}>
                <header>
                  <h2>{group.name}</h2>
                  <span>{String(group.stories.length).padStart(2, "0")}</span>
                </header>
                <div className="zaobao-story-grid">
                  {group.stories.map((story) => (
                    <article className="zaobao-story xunji-story" key={`${group.id}-${story.id}`}>
                      <div className="zaobao-story-body">
                        <h3>
                          {story.sourceUrl ? (
                            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                              {story.title}
                            </a>
                          ) : (
                            story.title
                          )}
                        </h3>
                        {story.sourceUrl ? (
                          <p className="xunji-story-source">
                            <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                              来源 · {story.sourceLabel || "原帖"}
                            </a>
                          </p>
                        ) : story.sourceLabel ? (
                          <p className="xunji-story-source">来源 · {story.sourceLabel}</p>
                        ) : null}
                        {xunjiStoryBody(story.paragraphs).map((paragraph, index) => (
                          <p className={xunjiParagraphClass(paragraph)} key={index}>
                            <XunjiLinkedText text={paragraph} />
                          </p>
                        ))}
                      </div>
                      {story.sourceUrl ? (
                        <div className="zaobao-story-actions">
                          <a href={story.sourceUrl} target="_blank" rel="noopener noreferrer">
                            打开原帖
                          </a>
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
