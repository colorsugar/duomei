export type AdminContentChannel = "supabase" | "git-edgeone" | "edgeone-blob" | "cloudflare-r2";

export type AdminSiteSection = {
  id: string;
  label: string;
  href: string;
  channel: AdminContentChannel;
  editableInAdmin: boolean;
  blurb: string;
};

/** Homepage sections that the live site actually ships today. */
export const ADMIN_SITE_SECTIONS: readonly AdminSiteSection[] = [
  {
    id: "zaobao",
    label: "早报",
    href: "/#zaobao",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "首页板块与 /zaobao，随仓库发到 EdgeOne",
  },
  {
    id: "notes",
    label: "小记",
    href: "/#notes",
    channel: "supabase",
    editableInAdmin: true,
    blurb: "正文走 Supabase；图片走 Cloudflare R2",
  },
  {
    id: "kuaihuo",
    label: "快活",
    href: "/#kuaihuo",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "首页快活入口，仓库内维护",
  },
  {
    id: "guyu",
    label: "故语",
    href: "/#guyu",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "公开新说随 Git；班级册走 EdgeOne Blob",
  },
  {
    id: "yunyou",
    label: "云游",
    href: "/#yunyou",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "同域 /yunyou 静态地图，不走 Vercel Preview",
  },
  {
    id: "color",
    label: "颜色",
    href: "/#color",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "微信表情预览与官方短链",
  },
  {
    id: "weiyan",
    label: "微言",
    href: "/#weiyan",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "首页微言叠卡，不是快活锚点",
  },
  {
    id: "skills",
    label: "技能",
    href: "/#skills",
    channel: "git-edgeone",
    editableInAdmin: false,
    blurb: "技能目录，链到公开 skills 仓库",
  },
] as const;

export const ADMIN_DEPLOYMENT = {
  productionHost: "https://duomei.site",
  platformLabel: "EdgeOne Makers",
  projectName: "duomei-guyu",
  notesBackend: "Supabase",
  mediaBackend: "Cloudflare Worker + R2",
  releasePath: "GitHub Actions → EdgeOne",
  actionsUrl: "https://github.com/colorsugar/duomei/actions",
  buildMarkerPath: "/.well-known/duomei-build.json",
} as const;

export type AdminBuildMarker = {
  commit?: string;
  run?: string;
};

export function summarizeGuyuShelf(books: readonly { access: string }[]) {
  const publicCount = books.filter((book) => book.access === "public").length;
  const gatedCount = books.filter((book) => book.access === "class-gated").length;
  return {
    total: books.length,
    publicCount,
    gatedCount,
  };
}

export function computeAdminHealthScore(input: {
  draftCount: number;
  imageCount: number;
  cloudReady: boolean;
}) {
  let score = 94 - input.draftCount * 2 + Math.min(4, input.imageCount);
  if (!input.cloudReady) score -= 8;
  return Math.max(60, Math.min(98, Math.round(score)));
}

export function shortCommit(commit: string | undefined | null) {
  if (!commit) return "";
  return commit.slice(0, 7);
}

export function channelLabel(channel: AdminContentChannel) {
  switch (channel) {
    case "supabase":
      return "Supabase 即时";
    case "git-edgeone":
      return "Git → EdgeOne";
    case "edgeone-blob":
      return "EdgeOne Blob";
    case "cloudflare-r2":
      return "Cloudflare R2";
    default:
      return channel;
  }
}
