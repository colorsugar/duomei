import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ZAOBAO_ARCHIVE_ROUTE, ZAOBAO_PROXY_ROUTE, ZAOBAO_URL } from "../components/ZaobaoSection";

// Source archive URLs are /YYYY-MM-DD/; anything else falls back to the archive list.
export const ZAOBAO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isZaobaoDate(value: string | undefined): value is string {
  if (!value || !ZAOBAO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

// The original on vercel.app: used for "打开原版" and as the base for relative URLs in the parsed HTML.
export function zaobaoEditionUrl(date?: string) {
  return date ? `${ZAOBAO_URL}/${date}/` : ZAOBAO_URL;
}

// The same-origin copy the reader actually downloads.
export function zaobaoProxyUrl(date?: string) {
  return date ? `${ZAOBAO_PROXY_ROUTE}/${date}/` : ZAOBAO_PROXY_ROUTE;
}

// "2026年9月8日 星期二" → "2026-09-08", so today's stories get a link that still works tomorrow.
export function isoDateFromLabel(label: string) {
  const match = label.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  return match ? `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}` : undefined;
}

// Same-origin path for one story; the edge rewrites its share metadata from the same id.
export function zaobaoStoryPath(storyId: string, date?: string) {
  return `${date ? `/zaobao/${date}` : "/zaobao"}/i/${encodeURIComponent(storyId)}`;
}

function zaobaoStoryDomId(storyId: string) {
  return `zaobao-story-${storyId}`;
}

function ZaobaoStoryShare({ title, text, path }: { title: string; text: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const share = async () => {
    const url = new URL(path, window.location.origin).href;
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("复制这条的链接", url);
    }
  };
  return (
    <button type="button" className="zaobao-story-share" onClick={share} aria-label={`分享「${title}」`}>
      {copied ? "已复制链接" : "分享这条"}
    </button>
  );
}

const SKIP_STORY_P = /\b(source|fb|kicker|date|orig-link|lede|brand|hist-bar)\b/;

type ZaobaoStory = {
  id: string;
  title: string;
  paragraphs: string[];
  body: string[];
  groupName: string;
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

function collectParagraphs(root: ParentNode) {
  return Array.from(root.querySelectorAll("p"))
    .filter((node) => !SKIP_STORY_P.test(node.className))
    .map((node) => node.textContent?.trim() ?? "")
    .filter(Boolean);
}

function parseSheetBodies(doc: Document) {
  const bodies = new Map<string, string[]>();
  doc.querySelectorAll("template[id^='tpl-']").forEach((tpl) => {
    const id = tpl.id.slice(4);
    if (!id) return;
    const paragraphs = collectParagraphs(tpl.content);
    if (paragraphs.length) bodies.set(id, paragraphs);
  });
  return bodies;
}

function parseEdition(html: string, base: string = ZAOBAO_URL): ZaobaoEdition | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const headline = doc.querySelector(".page > h1, h1")?.textContent?.trim();
  if (!headline) return null;
  const sheetBodies = parseSheetBodies(doc);

  // Editions before 2026-09-02 wrap each column in `<div class="group" id>` instead of `<section id>`.
  const groups = Array.from(doc.querySelectorAll<HTMLElement>(".page > section[id], .page > .group[id]"))
    .map((section, groupIndex): ZaobaoGroup | null => {
      const name = section.querySelector(".sec, .group-name, h2")?.textContent?.trim();
      if (!name) return null;
      const stories = Array.from(section.querySelectorAll<HTMLElement>("article"))
        .map((article, storyIndex): ZaobaoStory | null => {
          const title = article.querySelector("h2")?.textContent?.trim();
          if (!title) return null;
          const image = article.querySelector<HTMLImageElement>("figure img");
          const source = article.querySelector<HTMLAnchorElement>(".source a, .orig-link a");
          const paragraphs = collectParagraphs(article);
          const id = article.dataset.id || `${groupIndex + 1}-${storyIndex + 1}`;
          return {
            id,
            title,
            paragraphs,
            body: sheetBodies.get(id) ?? paragraphs,
            groupName: name,
            image: safeHttpsUrl(image?.getAttribute("src") ?? null, base),
            imageAlt: image?.getAttribute("alt")?.trim() || title,
            imageSource: article.querySelector("figcaption")?.textContent?.trim() ?? null,
            sourceLabel: source?.textContent?.trim().replace(/^来源[：:]\s*/, "").replace(/^查看原文.*/, "") || null,
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
  const { date: dateParam, storyId } = useParams<{ date: string; storyId: string }>();
  const navigate = useNavigate();
  const date = isZaobaoDate(dateParam) ? dateParam : undefined;
  const invalidDate = dateParam !== undefined && !date;
  const editionUrl = zaobaoEditionUrl(date);
  const editionLabel = date ? `${date} 早报` : "今日早报";
  const editionPath = date ? `/zaobao/${date}` : "/zaobao";
  const [edition, setEdition] = useState<ZaobaoEdition | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // Some archived days point at images the source no longer serves; drop those figures instead of showing broken icons.
  const [brokenImages, setBrokenImages] = useState<ReadonlySet<string>>(() => new Set());
  const pageRef = useRef<HTMLElement>(null);
  const tabsRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastOpenRef = useRef<HTMLButtonElement | null>(null);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);

  // `main.zaobao-page` is the scroll container, so the observer must root there rather than on the viewport.
  useEffect(() => {
    const page = pageRef.current;
    if (!edition || !page) return;
    setActiveGroupId(edition.groups[0]?.id ?? null);
    const observer = new IntersectionObserver(
      (entries) => {
        const hit = entries.find((entry) => entry.isIntersecting);
        if (hit) setActiveGroupId(hit.target.id);
      },
      { root: page, rootMargin: "-35% 0px -60% 0px" },
    );
    page.querySelectorAll<HTMLElement>(".zaobao-edition-group").forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [edition]);

  useEffect(() => {
    const tabs = tabsRef.current;
    const chip = activeGroupId ? tabs?.querySelector<HTMLElement>(`a[href="#${activeGroupId}"]`) : null;
    if (!tabs || !chip) return;
    tabs.scrollTo({ left: chip.offsetLeft - (tabs.clientWidth - chip.offsetWidth) / 2, behavior: "smooth" });
  }, [activeGroupId]);

  // A story link opens the same bottom sheet as /zaobao-src (`#a=` there; here `/i/:id`).
  const openStory = storyId ? edition?.groups.flatMap((group) => group.stories).find((story) => story.id === storyId) : undefined;
  const openStoryPath = (story: ZaobaoStory) => {
    const path = zaobaoStoryPath(story.id, date);
    if (window.location.pathname !== path) navigate(path);
  };
  const closeSheet = () => {
    if (window.location.pathname !== editionPath) navigate(editionPath);
  };

  useEffect(() => {
    if (!openStory) {
      document.title = `${editionLabel} | DUOMEI`;
      return;
    }
    document.title = `${openStory.title} | DUOMEI`;
    const frame = requestAnimationFrame(() => closeRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [editionLabel, openStory]);

  useEffect(() => {
    if (!openStory) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openStory, editionPath]);

  useEffect(() => {
    if (openStory) return;
    lastOpenRef.current?.focus();
    lastOpenRef.current = null;
  }, [openStory]);

  useEffect(() => {
    if (invalidDate) return;
    const previousTitle = document.title;
    document.title = `${editionLabel} | DUOMEI`;
    setEdition(null);
    setFailed(false);
    setBrokenImages(new Set());
    const controller = new AbortController();
    fetch(zaobaoProxyUrl(date), { signal: controller.signal })
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
  }, [attempt, date, editionLabel, editionUrl, invalidDate]);

  if (invalidDate) {
    return <Navigate to={ZAOBAO_ARCHIVE_ROUTE} replace />;
  }

  return (
    <main className={`zaobao-page${openStory ? " is-sheet-open" : ""}`} ref={pageRef}>
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
              <section className={`zaobao-edition-group${groupIndex === 0 ? " is-headline" : ""}`} id={group.id} key={group.id}>
                <header>
                  <h2>{group.name}</h2>
                  <span>{String(group.stories.length).padStart(2, "0")}</span>
                </header>
                <div className="zaobao-story-grid">
                  {group.stories.map((story, storyIndex) => {
                    const featured = groupIndex === 0 && storyIndex === 0;
                    const teaser = story.paragraphs.length ? story.paragraphs : story.body.slice(0, 2);
                    return (
                    <article
                      className={`zaobao-story${featured ? " is-featured" : ""}${story.id === storyId ? " is-shared" : ""}`}
                      id={zaobaoStoryDomId(story.id)}
                      key={`${group.id}-${story.id}`}
                    >
                      <button
                        type="button"
                        className="zaobao-story-open"
                        aria-haspopup="dialog"
                        aria-expanded={story.id === storyId}
                        onClick={(event) => {
                          lastOpenRef.current = event.currentTarget;
                          openStoryPath(story);
                        }}
                      >
                        {story.image && !brokenImages.has(story.image) ? (
                          <figure>
                            <img
                              src={story.image}
                              alt={story.imageAlt}
                              loading={featured ? "eager" : "lazy"}
                              decoding="async"
                              referrerPolicy="no-referrer"
                              onError={() => setBrokenImages((current) => new Set(current).add(story.image as string))}
                            />
                            {story.imageSource ? <figcaption>{story.imageSource}</figcaption> : null}
                          </figure>
                        ) : null}
                        <div className="zaobao-story-body">
                          <h3>{story.title}</h3>
                          {teaser.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                          <span className="zaobao-story-more">阅读全文</span>
                        </div>
                      </button>
                      <div className="zaobao-story-actions">
                        {story.sourceUrl ? (
                          <a href={story.sourceUrl} target="_blank" rel="noreferrer">
                            来源 · {story.sourceLabel || "原文"} ↗
                          </a>
                        ) : null}
                        <ZaobaoStoryShare
                          title={story.title}
                          text={story.paragraphs[0] ?? story.body[0] ?? edition.headline}
                          path={zaobaoStoryPath(story.id, date ?? isoDateFromLabel(edition.date))}
                        />
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      ) : null}

      {edition ? (
        <nav className="zaobao-edition-tabs" aria-label="早报栏目" ref={tabsRef} hidden={Boolean(openStory)}>
          <div className="zaobao-edition-tabs-row">
            {edition.groups.map((group) => (
              <a
                key={group.id}
                href={`#${group.id}`}
                aria-current={group.id === activeGroupId ? "location" : undefined}
              >
                {group.name}
              </a>
            ))}
          </div>
        </nav>
      ) : null}

      {openStory ? createPortal((
        <div className="zaobao-sheet">
          <button type="button" className="zaobao-sheet-backdrop" aria-label="关闭长文" onClick={closeSheet} />
          <div className="zaobao-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="zaobao-sheet-title">
            <div className="zaobao-sheet-scroll">
              <article className="zaobao-sheet-article">
                {openStory.groupName ? <p className="zaobao-sheet-kicker">{openStory.groupName}</p> : null}
                {openStory.image && !brokenImages.has(openStory.image) ? (
                  <figure>
                    <img
                      src={openStory.image}
                      alt={openStory.imageAlt}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((current) => new Set(current).add(openStory.image as string))}
                    />
                    {openStory.imageSource ? <figcaption>{openStory.imageSource}</figcaption> : null}
                  </figure>
                ) : null}
                <h2 id="zaobao-sheet-title">{openStory.title}</h2>
                {edition.date ? <p className="zaobao-sheet-date">{edition.date}</p> : null}
                {openStory.body.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                <div className="zaobao-story-actions">
                  {openStory.sourceUrl ? (
                    <a href={openStory.sourceUrl} target="_blank" rel="noreferrer">
                      查看原文（完整来源页）
                    </a>
                  ) : null}
                  <ZaobaoStoryShare
                    title={openStory.title}
                    text={openStory.body[0] ?? openStory.paragraphs[0] ?? edition.headline}
                    path={zaobaoStoryPath(openStory.id, date ?? isoDateFromLabel(edition.date))}
                  />
                </div>
              </article>
            </div>
            <div className="zaobao-sheet-footer">
              <button type="button" className="zaobao-sheet-close" ref={closeRef} onClick={closeSheet} aria-label="关闭">关闭</button>
            </div>
          </div>
        </div>
      ), document.body) : null}
    </main>
  );
}
