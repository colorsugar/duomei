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

// 《桂巷还香》: 30 generated portrait plates, one landmark per page, so every
// source page is one full logical page with no spread splitting.
const guiXiangPageDescriptions = [
  "象鼻山远影与一角花桥，下半纸留白给书名",
  "东西巷石板与青砖二层，晨光",
  "靖江王城朱红墙与黛瓦城垛",
  "王城内独秀峰独立，淡墨远树",
  "正阳门朱红门扇与石狮剪影",
  "承运殿黄琉璃脊与朱红廊柱",
  "花桥石拱、古榕气根、榕湖水",
  "榕湖静水，远一座淡峰",
  "古南门城楼贴着湖水",
  "巨型古榕气根垂到岸石",
  "杉湖黄昏，灯影刚起",
  "日月双塔立在湖上，倒影拉长",
  "逍遥楼飞檐层叠，远山淡青",
  "象鼻山伸入漓江，水月洞透空",
  "从水月洞内看江光和一角天",
  "伏波山临江石壁与听涛阁一角",
  "还珠洞内钟乳与一束外光",
  "叠彩山层叠石纹与风洞口",
  "木龙塔傍江，石岸如龙",
  "木龙古渡石阶入水，一艘空竹筏",
  "桂湖夜色，堤灯一串",
  "漓江竹筏，篙在画面外，远峰淡",
  "江上几点渔火，山只剩剪影",
  "芦笛岩洞内石幔，矿物色",
  "七星岩洞口外光与钟乳",
  "訾洲绿洲横在江心，远象鼻",
  "南溪山双峰如戟，溪在脚下",
  "一碗桂林米粉热气，摊只露出桌沿",
  "漓江夜，山影与一条亮水",
  "一角青砖与一小簇桂花，大片纸空",
] as const;

const guiXiangPages = guiXiangPageDescriptions.map(
  (_, index) => `/api/guyu-page?book=gui-xiang-huan-xiang&page=${String(index + 1).padStart(3, "0")}`,
);

const guiXiangLogicalPages: GuyuLogicalPage[] = guiXiangPages.map((src, index) => ({
  id: `plate-${index + 1}`,
  sourcePage: index + 1,
  src,
  placement: "full",
  description: guiXiangPageDescriptions[index],
}));

export const guyuBooks: readonly GuyuBook[] = [
  {
    id: "meiyou-yujian",
    title: "没有遇见 何来艳遇",
    kind: "同学录",
    description: "一些名字、笔迹与当时的天气，仍停在纸上。",
    accessibilityNote: "本册主要由手写原稿组成；每一页都有画面说明，暂未收录完整文字。",
    pageCount: meiyouYujianPages.length,
    coverSrc: meiyouYujianPages[0],
    previewCoverSrc: "https://duomei-media-storage.colorsugar.workers.dev/media/covers/guyu-meiyou-yujian.webp",
    pages: meiyouYujianPages,
    pageDescriptions: meiyouYujianPageDescriptions,
    logicalPages: meiyouYujianLogicalPages,
  },
  {
    id: "gui-xiang-huan-xiang",
    title: "桂巷还香",
    kind: "新说",
    description: "桂林册页集。浅绛、岩彩、水印木刻、针管水彩、粉彩、油画棒混搭。每页一个地标，有题跋落款。人只以背影出现。",
    accessibilityNote: "本册为桂林地标册页；每页有地标落款，人只以背影出现，每一页都有画面说明。",
    pageCount: guiXiangPages.length,
    coverSrc: guiXiangPages[0],
    previewCoverSrc: "https://duomei-media-storage.colorsugar.workers.dev/media/covers/guyu-gui-xiang-huan-xiang.webp",
    pages: guiXiangPages,
    pageDescriptions: guiXiangPageDescriptions,
    logicalPages: guiXiangLogicalPages,
  },
];

export function getGuyuBook(bookId: string | undefined) {
  return guyuBooks.find((book) => book.id === bookId);
}
