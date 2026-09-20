export type XunjiStory = {
  id: string;
  title: string;
  paragraphs: string[];
  sourceUrl: string | null;
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
  "x-anecdotes": "寻迹",
};

const TEASER_SKIP = /^(https?:\/\/|来源[：:])/i;

export function xunjiStoryTeaser(paragraphs: string[], limit = 2): string[] {
  return paragraphs.filter((text) => text && !TEASER_SKIP.test(text)).slice(0, limit);
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
  return blocks(html, "p")
    .map((node) => textOf(node.inner))
    .filter((text) => text && !/往期/.test(text));
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
    return [{
      id: attr(article.attrs, "data-id") || `${groupIndex + 1}-${storyIndex + 1}`,
      title,
      paragraphs: collectParagraphs(article.inner),
      sourceUrl: firstHttpHref(article.inner),
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

  if (groups.length) return { headline, date, lede, groups };
  if (!lede && !date) return null;
  return {
    headline,
    date,
    lede,
    groups: [{
      id: "xunji-group-today",
      name: date || "今日",
      stories: [{ id: "today", title: headline, paragraphs: lede ? [lede] : [], sourceUrl: null }],
    }],
  };
}
