export type GuyuPagePlacement =
  | "full"
  | "spread-left"
  | "spread-right"
  | "stacked-top"
  | "stacked-bottom"
  | "blank";

export type GuyuLogicalPage = {
  id: string;
  sourcePage: number | null;
  src: string | null;
  placement: GuyuPagePlacement;
  description: string;
};

export type GuyuBook = {
  id: string;
  title: string;
  kind: string;
  chapter: string;
  access: "class-gated" | "public";
  description: string;
  accessibilityNote: string;
  pageCount: number;
  coverSrc: string;
  previewCoverSrc: string;
  pages: readonly string[];
  pageDescriptions: readonly string[];
  logicalPages: readonly GuyuLogicalPage[];
};

export function formatGuyuPageNumber(pageIndex: number, logicalPageCount: number) {
  const lastIndex = Math.max(0, logicalPageCount - 1);
  const interiorPageCount = Math.max(0, lastIndex - 1);
  if (pageIndex <= 0) return "封面";
  if (pageIndex >= lastIndex) return "封底";
  const first = Math.min(pageIndex, interiorPageCount);
  const second = Math.min(pageIndex + 1, interiorPageCount);
  return first === second ? `${first} / ${interiorPageCount}` : `${first}–${second} / ${interiorPageCount}`;
}

const meiyouYujianPages = Array.from({ length: 53 }, (_, index) =>
  `/api/guyu-page?book=meiyou-yujian&page=${String(index + 1).padStart(3, "0")}`,
);

const pageDescriptionOverrides: Record<number, string> = {
  0: "黑色手账封面，绘有四个彩色玻璃罐",
  1: "铅笔绘画与手写书名页",
  2: "压制树叶、植物标本与手写注释",
  9: "摊开的手账与两页手写留言",
  10: "大字手写题词页",
  20: "摊开的手账、留言与卡通人物画",
  22: "摊开的手账与两幅人物铅笔画",
  23: "红色手写留言与蓝色表情涂鸦",
  24: "人物与花朵绘画、手写留言",
  25: "摊开的手账、楼阁与荷花绘画",
  26: "摊开的手账、花鸟与花瓶绘画",
  27: "贴有紫色便签的手账页",
  29: "摊开的手账与两页手写留言",
  30: "贴有折叠纸条的手账页",
  31: "带绿色标签袋的空白手账页",
  32: "花朵铅笔速写",
  33: "摊开的手账与密集手写留言",
  34: "手写诗句与玫瑰绘画",
  35: "分栏书写的手写诗句",
  38: "摊开的手账、手写留言与人物画",
  39: "摊开的手账与两页手写留言",
  40: "分栏书写的手写诗句",
  41: "摊开的手账与两页手写留言",
  42: "摊开的手账、手写留言与人物画",
  43: "摊开的手账与手写诗句",
  44: "摊开的手账与两页手写留言",
  45: "摊开的手账与两页手写留言",
  46: "摊开的手账与手写诗句",
  47: "摊开的手账与两页手写留言",
  48: "摊开的手账与两页手写留言",
  49: "摊开的手账与两页手写诗句",
  50: "摊开的手账与两页手写留言",
  51: "古装人物铅笔画与题字",
  52: "黑色手账封底与商品标签",
};

const meiyouYujianPageDescriptions = meiyouYujianPages.map(
  (_, index) => pageDescriptionOverrides[index] ?? "手写同学留言页",
);

// These PDF scans visibly contain two physical pages. They must occupy one
// aligned book spread instead of being squeezed into a single page slot.
const pairedScanNumbers = new Set([
  10, 16, 21, 23, 24, 25, 26, 27, 30, 34, 39, 40,
  42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
]);

function buildLogicalPages(): GuyuLogicalPage[] {
  const logicalPages: GuyuLogicalPage[] = [];

  meiyouYujianPages.forEach((src, sourceIndex) => {
    const sourcePage = sourceIndex + 1;
    const description = meiyouYujianPageDescriptions[sourceIndex];

    if (sourcePage === meiyouYujianPages.length && logicalPages.length % 2 === 0) {
      logicalPages.push({
        id: "blank-before-back-cover",
        sourcePage: null,
        src: null,
        placement: "blank",
        description: "封底内衬页",
      });
    }

    if (pairedScanNumbers.has(sourcePage)) {
      // With showCover enabled, open spreads are [1,2], [3,4], ... . Add a
      // paper leaf when needed so both halves of one scan always face together.
      if (logicalPages.length % 2 === 0) {
        logicalPages.push({
          id: `blank-before-${sourcePage}`,
          sourcePage: null,
          src: null,
          placement: "blank",
          description: "空白衬页",
        });
      }

      logicalPages.push(
        {
          id: `scan-${sourcePage}-left`,
          sourcePage,
          src,
          placement: sourcePage === 25 ? "stacked-top" : "spread-left",
          description: `${description}${sourcePage === 25 ? "（上页）" : "（左页）"}`,
        },
        {
          id: `scan-${sourcePage}-right`,
          sourcePage,
          src,
          placement: sourcePage === 25 ? "stacked-bottom" : "spread-right",
          description: `${description}${sourcePage === 25 ? "（下页）" : "（右页）"}`,
        },
      );
      return;
    }

    logicalPages.push({
      id: `scan-${sourcePage}`,
      sourcePage,
      src,
      placement: "full",
      description,
    });
  });

  return logicalPages;
}

const meiyouYujianLogicalPages = buildLogicalPages();

function publicBookPages(bookId: string, count: number) {
  return Array.from({ length: count }, (_, index) =>
    `/images/guyu/${bookId}/pages/${String(index + 1).padStart(3, "0")}.webp`,
  );
}

function fullLogicalPages(bookId: string, pages: readonly string[], descriptions: readonly string[]) {
  return pages.map((src, index): GuyuLogicalPage => ({
    id: `${bookId}-${String(index + 1).padStart(3, "0")}`,
    sourcePage: index + 1,
    src,
    placement: "full",
    description: descriptions[index],
  }));
}

const zhiShangFeiyanPages = publicBookPages("zhi-shang-feiyan", 30);

const zhiShangFeiyanPageDescriptions = [
  "单角飞檐、朱红流苏、一朵山茶，下半纸留白给书名",
  "关闭的朱红院门与石门槛，门楣上露出一角飞檐",
  "空荡庭院，远处月洞门，白墙被晨光斜切",
  "近看瓦垄与墙缝里长出的山茶",
  "墙外看花窗，枯枝影子落在粉墙上",
  "穿过花窗格子看见昏暗木厅，只有家具轮廓",
  "天色转青，瓦开始发暗，第一场雨的气息",
  "庭石积水，倒映出飞檐一角",
  "近看滴水的飞檐与铜雨链",
  "湿润的月洞门，山茶更红",
  "月门里漫出薄雾，园景略微失真",
  "仰视层层斗拱与梁架木几何",
  "长复廊，柱列重复，透视被拉长",
  "一口静水缸，倒映倒置的飞檐",
  "黄昏庭院，檐下第一盏纸灯亮起来",
  "站在月门圆洞里，一半暖一半冷",
  "黄昏全庭，灯、瓦、山茶同时最丰",
  "厅内彩梁与花窗漏进的格子光",
  "略俯视的重重屋脊与飞檐交错",
  "夜廊一串纸灯，暖点连成线",
  "青瓦上落着赭红枯叶，近于霜意",
  "极近的飞檐尖对着一轮纸色月",
  "次日清晨，同一庭院，只剩一盏未收的灯",
  "同一飞檐的三个轻叠角度，仍是单页素描而非拼图",
  "月门现在只框住空天空",
  "花窗格子轻轻叠在淡了的庭院上",
  "一朵山茶落在青石上，午后瓦影很浅",
  "无人复廊，最后一抹光停在柱身上",
  "夜里只剩一条瓦垄和一轮淡月",
  "极简飞檐剪影与一小朵山茶，无长文",
] as const;

const zhiShangFeiyanLogicalPages = fullLogicalPages(
  "zhi-shang-feiyan",
  zhiShangFeiyanPages,
  zhiShangFeiyanPageDescriptions,
);

const xinshuoOnePages = publicBookPages("xinshuo-01", 30);

const xinshuoOnePageDescriptions = [
  "纸上初醒",
  "蓝灰纸袋里的微风",
  "夜里收集到的蓝",
  "云朵观察页",
  "叶脉的秘密地图",
  "雨后石子微光",
  "追踪枝影",
  "窗边的第三种绿",
  "拾得的午后旧票",
  "会折叠的小径",
  "无形之声的形状",
  "给河石造一间小屋",
  "叶脉写成的无字书信",
  "桌上漂走的小岛",
  "借来天空的鱼",
  "小门后的辽阔风景",
  "云朵修补铺",
  "寻得一小片月亮",
  "会呼吸的山",
  "六种红的触感对话",
  "纸上暖黄日光",
  "绿意从边缘归来",
  "暖橙落在静页上",
  "轻轻展开，碎片重连",
  "一线缝起午后",
  "旧纸里的第二场天气",
  "小发现铺成一条路",
  "正在发生的留白",
  "一粒种子的远行",
  "未完的蓝圈与新芽",
] as const;

const xinshuoOneLogicalPages = fullLogicalPages("xinshuo-01", xinshuoOnePages, xinshuoOnePageDescriptions);

export const guyuBooks: readonly GuyuBook[] = [
  {
    id: "meiyou-yujian",
    title: "没有遇见 何来艳遇",
    kind: "同学录",
    chapter: "旧册",
    access: "class-gated",
    description: "一些名字、笔迹与当时的天气，仍停在纸上。",
    accessibilityNote: "本册主要由手写原稿组成；每一页都有画面说明，暂未收录完整文字。",
    pageCount: meiyouYujianPages.length,
    coverSrc: meiyouYujianPages[0],
    previewCoverSrc: "/images/guyu-meiyou-yujian-cover.webp",
    pages: meiyouYujianPages,
    pageDescriptions: meiyouYujianPageDescriptions,
    logicalPages: meiyouYujianLogicalPages,
  },
  {
    id: "zhi-shang-feiyan",
    title: "纸上飞檐",
    kind: "画本",
    chapter: "新说",
    access: "public",
    description: "用彩铅在暖纸上，跟一处无名旧园走完从晨到夜、从雨到月的一日。",
    accessibilityNote: "本册为无人物彩铅建筑画本；每一页都有画面说明。",
    pageCount: 30,
    coverSrc: zhiShangFeiyanPages[0],
    previewCoverSrc: "/images/guyu-zhi-shang-feiyan-cover.webp",
    pages: zhiShangFeiyanPages,
    pageDescriptions: zhiShangFeiyanPageDescriptions,
    logicalPages: zhiShangFeiyanLogicalPages,
  },
  {
    id: "xinshuo-01",
    title: "想象画本",
    kind: "画本",
    chapter: "新说",
    access: "public",
    description: "自由绘画、观察记录、幻想片段、手作、色彩实验与纸上小发现。",
    accessibilityNote: "本册为无身份文字的想象与创作画本；每一页都有画面说明。",
    pageCount: 30,
    coverSrc: xinshuoOnePages[0],
    previewCoverSrc: "/images/guyu-xinshuo-01-cover.webp",
    pages: xinshuoOnePages,
    pageDescriptions: xinshuoOnePageDescriptions,
    logicalPages: xinshuoOneLogicalPages,
  },
];

export function getGuyuBook(bookId: string | undefined) {
  return guyuBooks.find((book) => book.id === bookId);
}
