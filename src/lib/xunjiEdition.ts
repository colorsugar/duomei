export type XunjiStory = {
  id: string;
  title: string;
  paragraphs: string[];
  sourceUrl: string | null;
  sourceLabel: string | null;
};

export type XunjiTextPart = {
  text: string;
  href?: string;
};

export type XunjiGroup = {
  id: string;
  name: string;
  stories: XunjiStory[];
};

export type XunjiEdition = {
  headline: string;
  date: string;
  lede: string;
  groups: XunjiGroup[];
};

const KNOWN_SECTION_NAMES: Record<string, string> = {
  "x-anecdotes": "X琐事",
  "f-anecdotes": "影视日常",
  "film-daily": "影视日常",
  "tv-daily": "影视日常",
  "s-anecdotes": "学院校园",
  "school-campus": "学院校园",
  "academy-campus": "学院校园",
};

const SOURCE_LINE = /^来源[：:]/i;
const BARE_HTTP_URL = /^https?:\/\/\S+$/i;
const INLINE_HTTP = /https?:\/\/\S+/gi;

export function xunjiBareHttpUrl(text: string): string | null {
  const trimmed = text.trim();
  return BARE_HTTP_URL.test(trimmed) ? xunjiSafeHttpUrl(trimmed) : null;
}

export function xunjiStoryBody(paragraphs: string[]): string[] {
  return paragraphs.filter((text) => text && !SOURCE_LINE.test(text));
}

export function xunjiSourceLabel(paragraphs: string[], sourceUrl?: string | null): string | null {
  for (const text of paragraphs) {
    const match = text.match(/^来源[：:]\s*(.+)$/);
    if (match?.[1]?.trim()) return match[1].trim();
  }
  if (!sourceUrl) return null;
  try {
    const url = new URL(sourceUrl);
    if (!/(^|\.)(x|twitter)\.com$/i.test(url.hostname)) return null;
    const handle = url.pathname.split("/").filter(Boolean)[0];
    return handle && !/^(i|intent|search)$/i.test(handle) ? `@${handle}` : null;
  } catch {
    return null;
  }
}

export function xunjiParagraphClass(text: string): string {
  if (SOURCE_LINE.test(text)) return "xunji-p is-source";
  if (xunjiBareHttpUrl(text)) return "xunji-p is-url";
  if (/^西幻骨架[：:]?/.test(text)) return "xunji-p is-skeleton";
  if (/^[·•]\s*/.test(text)) return "xunji-p is-item";
  if (/^(背景|原帖要点)[：:]/.test(text)) return "xunji-p is-label";
  return "xunji-p";
}

export function xunjiTextParts(text: string): XunjiTextPart[] {
  const parts: XunjiTextPart[] = [];
  const re = new RegExp(INLINE_HTTP.source, INLINE_HTTP.flags);
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const href = xunjiSafeHttpUrl(match[0]);
    parts.push(href ? { text: match[0], href } : { text: match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts.length ? parts : [{ text }];
}

export function xunjiSafeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function stripNoise(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

function decodeEntities(text: string) {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function textOf(html: string) {
  return decodeEntities(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!match) return null;
  return match[2] ?? match[3] ?? match[4] ?? null;
}

function classNames(attrs: string) {
  return (attr(attrs, "class") ?? "").trim().split(/\s+/).filter(Boolean);
}

function blocks(html: string, tag: string): { attrs: string; inner: string }[] {
  const out: { attrs: string; inner: string }[] = [];
  const re = new RegExp(`<${tag}\\b([^>]*)>([\\s\\S]*?)</${tag}>`, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    out.push({ attrs: match[1] ?? "", inner: match[2] ?? "" });
  }
  return out;
}

function firstHeading(html: string, tags: string[]) {
  for (const tag of tags) {
    for (const node of blocks(html, tag)) {
      const text = textOf(node.inner);
      if (text) return text;
    }
  }
  return "";
}

function collectParagraphs(html: string) {
  const fromP = blocks(html, "p")
    .map((node) => textOf(node.inner))
    .filter((text) => text && !/往期/.test(text));
  const seen = new Set(fromP);
  const fromLi = blocks(html, "li")
    .map((node) => textOf(node.inner))
    .filter((text) => text && !seen.has(text) && !/往期/.test(text));
  return fromP.concat(fromLi);
}

function firstHttpHref(html: string) {
  const re = /<a\b([^>]*)>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const href = attr(match[1] ?? "", "href");
    // `a[href^=http]` already includes https.
    if (href && /^https?:/i.test(href.trim())) {
      const url = xunjiSafeHttpUrl(href);
      if (url) return url;
    }
  }
  return null;
}

function namedClassText(html: string, className: string) {
  const re = /<([a-z][a-z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (!classNames(match[2] ?? "").includes(className)) continue;
    const text = textOf(match[3] ?? "");
    if (text) return text;
  }
  return "";
}

function sectionName(section: { attrs: string; inner: string }, fallback: string) {
  return namedClassText(section.inner, "sec")
    || namedClassText(section.inner, "group-name")
    || firstHeading(section.inner, ["h2"])
    || attr(section.attrs, "aria-label")?.trim()
    || KNOWN_SECTION_NAMES[attr(section.attrs, "id") ?? ""]
    || fallback;
}

function parseArticles(html: string, groupIndex: number): XunjiStory[] {
  return blocks(html, "article").flatMap((article, storyIndex) => {
    const title = firstHeading(article.inner, ["h2", "h3"]);
    if (!title) return [];
    const paragraphs = collectParagraphs(article.inner);
    const sourceUrl = firstHttpHref(article.inner);
    return [{
      id: attr(article.attrs, "data-id") || `${groupIndex + 1}-${storyIndex + 1}`,
      title,
      paragraphs,
      sourceUrl,
      sourceLabel: xunjiSourceLabel(paragraphs, sourceUrl),
    }];
  });
}

function collectSections(html: string) {
  const sections = blocks(html, "section");
  if (sections.length) return sections;
  const re = /<([a-z][a-z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/gi;
  const groups: { attrs: string; inner: string }[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    if (classNames(match[2] ?? "").includes("group")) {
      groups.push({ attrs: match[2] ?? "", inner: match[3] ?? "" });
    }
  }
  return groups;
}

function prefaceOf(html: string) {
  return html.split(/<(?:article|section)\b/i)[0] ?? "";
}

export function parseXunjiEdition(html: string): XunjiEdition | null {
  const clean = stripNoise(html);
  const headline = firstHeading(clean, ["h1"]);
  if (!headline) return null;

  const main = blocks(clean, "main")[0]?.inner
    ?? blocks(clean, "div").find((node) => classNames(node.attrs).includes("page"))?.inner
    ?? clean;
  const preface = prefaceOf(main);
  const date = firstHeading(preface, ["h2"])
    || namedClassText(preface, "date")
    || namedClassText(clean, "date")
    || "";
  const lede = collectParagraphs(preface).find((text) => text !== headline) ?? "";

  const groups = collectSections(main).flatMap((section, groupIndex): XunjiGroup[] => {
    const stories = parseArticles(section.inner, groupIndex);
    if (!stories.length) return [];
    const sectionId = attr(section.attrs, "id") || String(groupIndex + 1);
    return [{
      id: `xunji-group-${sectionId}`,
      name: sectionName(section, date || "寻迹"),
      stories,
    }];
  });

  if (!groups.length) {
    const loose = parseArticles(main, 0);
    if (loose.length) {
      groups.push({ id: "xunji-group-today", name: date || "寻迹", stories: loose });
    }
  }

  return groups.length ? { headline, date, lede, groups } : null;
}
