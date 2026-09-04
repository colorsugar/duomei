import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ZAOBAO_ARCHIVE_ROUTE, ZAOBAO_URL } from "../components/ZaobaoSection";

// Source archive URLs are /YYYY-MM-DD/; anything else falls back to the archive list.
export const ZAOBAO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isZaobaoDate(value: string | undefined): value is string {
  if (!value || !ZAOBAO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function zaobaoEditionUrl(date?: string) {
  return date ? `${ZAOBAO_URL}/${date}/` : ZAOBAO_URL;
}

type ZaobaoStory = {
  id: string;
  title: string;
  paragraphs: string[];
  image: string | null;
  imageAlt: string;
  imageSource: string | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
};

type ZaobaoGroup = {
  id: string;
  name: string;
  stories: ZaobaoStory[];
};

type ZaobaoEdition = {
  headline: string;
  date: string;
  lede: string;
  groups: ZaobaoGroup[];
};

function safeHttpsUrl(value: string | null, base: string) {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function parseEdition(html: string, base: string = ZAOBAO_URL): ZaobaoEdition | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headline = doc.querySelector(".page > h1, h1")?.textContent?.trim();
  if (!headline) return null;

  const groups = Array.from(doc.querySelectorAll<HTMLElement>(".page > section[id]"))
    .map((section, groupIndex): ZaobaoGroup | null => {
      const name = section.querySelector(".sec, .group-name, h2")?.textContent?.trim();
      if (!name) return null;
      const stories = Array.from(section.querySelectorAll<HTMLElement>("article"))
        .map((article, storyIndex): ZaobaoStory | null => {
          const title = article.querySelector("h2")?.textContent?.trim();
          if (!title) return null;
          const image = article.querySelector<HTMLImageElement>("figure img");
          const source = article.querySelector<HTMLAnchorElement>(".source a");
          const paragraphs = Array.from(article.children)
            .filter((child) => child.tagName === "P" && !child.classList.contains("source") && !child.classList.contains("fb"))
            .map((child) => child.textContent?.trim() ?? "")
            .filter(Boolean);
          return {
            id: article.dataset.id || `${groupIndex + 1}-${storyIndex + 1}`,
            title,
            paragraphs,
            image: safeHttpsUrl(image?.getAttribute("src") ?? null, base),
            imageAlt: image?.getAttribute("alt")?.trim() || title,
            imageSource: article.querySelector("figcaption")?.textContent?.trim() ?? null,
            sourceLabel: source?.textContent?.trim().replace(/^来源[：:]\s*/, "") ?? null,
            sourceUrl: safeHttpsUrl(source?.getAttribute("href") ?? null, base),
          };
        })
        .filter((story): story is ZaobaoStory => story !== null);
      return stories.length ? { id: `zaobao-group-${section.id || groupIndex + 1}`, name, stories } : null;
    })
    .filter((group): group is ZaobaoGroup => group !== null);

  if (!groups.length) return null;
  return {
    headline,
    date: doc.querySelector(".date")?.textContent?.trim() ?? "",
    lede: doc.querySelector(".lede")?.textContent?.trim() ?? "",
    groups,
  };
}

export function ZaobaoReaderBar({ originalUrl, children }: { originalUrl: string; children?: ReactNode }) {
  return (
    <header className="zaobao-reader-bar">
      <Link className="zaobao-page-back" to="/#zaobao" aria-label="返回首页">
        ← 返回首页
      </Link>
      <span className="zaobao-reader-mark" aria-hidden="true">DUOMEI · 早报</span>
      <nav className="zaobao-reader-actions" aria-label="早报导航">
        {children}
        <a className="zaobao-page-open" href={originalUrl} target="_blank" rel="noreferrer">
          打开原版 ↗
        </a>
      </nav>
    </header>
  );
}

export function DuomeiZaobaoPage() {
  const { date: dateParam } = useParams<{ date: string }>();
  const date = isZaobaoDate(dateParam) ? dateParam : undefined;
  const invalidDate = dateParam !== undefined && !date;
  const editionUrl = zaobaoEditionUrl(date);
  const editionLabel = date ? `${date} 早报` : "今日早报";
  const [edition, setEdition] = useState<ZaobaoEdition | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (invalidDate) return;
    const previousTitle = document.title;
    document.title = `${editionLabel} | DUOMEI`;
    setEdition(null);
    setFailed(false);
    const controller = new AbortController();
    fetch(editionUrl, { signal: controller.signal, mode: "cors" })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Zaobao returned ${response.status}`);
        const next = parseEdition(await response.text(), editionUrl);
        if (!next) throw new Error("Zaobao document did not match the expected structure");
        setEdition(next);
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) setFailed(true);
      });
    return () => {
      controller.abort();
      document.title = previousTitle;
    };
  }, [editionLabel, editionUrl, invalidDate]);

  if (invalidDate) {
    return <Navigate to={ZAOBAO_ARCHIVE_ROUTE} replace />;
  }

  return (
    <main className={`zaobao-page${failed ? " is-fallback" : ""}`}>
      <ZaobaoReaderBar originalUrl={editionUrl}>
        <Link className="zaobao-page-archive" to={ZAOBAO_ARCHIVE_ROUTE}>
          往期
        </Link>
      </ZaobaoReaderBar>

      {!edition && !failed ? (
        <section className="zaobao-reader-loading" aria-live="polite" aria-busy="true">
          <p>正在展开{editionLabel}…</p>
        </section>
      ) : null}

      {failed ? (
        <iframe className="zaobao-frame" src={editionUrl} title={editionLabel} referrerPolicy="no-referrer" />
      ) : null}

      {edition ? (
        <div className="zaobao-edition">
          <header className="zaobao-edition-hero">
            <div>
              <p className="zaobao-edition-kicker">{date ? "早报 · 往期" : "早报 · ZAOBÃO"}</p>
              <h1>{edition.headline}</h1>
            </div>
            <div className="zaobao-edition-summary">
              {edition.date ? <time>{edition.date}</time> : null}
              {edition.lede ? <p>{edition.lede}</p> : null}
            </div>
          </header>

          <nav className="zaobao-edition-index" aria-label="早报栏目">
            {edition.groups.map((group) => <a key={group.id} href={`#${group.id}`}>{group.name}</a>)}
          </nav>

          <div className="zaobao-edition-groups">
            {edition.groups.map((group, groupIndex) => (
              <section className="zaobao-edition-group" id={group.id} key={group.id}>
                <header>
                  <h2>{group.name}</h2>
                  <span>{String(group.stories.length).padStart(2, "0")}</span>
                </header>
                <div className="zaobao-story-grid">
                  {group.stories.map((story, storyIndex) => (
                    <article
                      className={`zaobao-story${groupIndex === 0 && storyIndex === 0 ? " is-featured" : ""}`}
                      key={`${group.id}-${story.id}`}
                    >
                      {story.image ? (
                        <figure>
                          <img
                            src={story.image}
                            alt={story.imageAlt}
                            loading={groupIndex === 0 && storyIndex === 0 ? "eager" : "lazy"}
                            decoding="async"
                            referrerPolicy="no-referrer"
                          />
                          {story.imageSource ? <figcaption>{story.imageSource}</figcaption> : null}
                        </figure>
                      ) : null}
                      <div className="zaobao-story-body">
                        <h3>{story.title}</h3>
                        {story.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                        {story.sourceUrl ? (
                          <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                            来源 · {story.sourceLabel || "原文"} ↗
                          </a>
                        ) : null}
                      </div>
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
