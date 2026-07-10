export type TimePoetryImage = {
  id?: string;
  label: string;
  src: string;
  position: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  zIndex?: number;
  cropX?: number;
  cropY?: number;
  scale?: number;
  effect?: TimePoetryEffect;
};

export type TimePoetryEffect = "ink" | "fade" | "rise" | "slide" | "zoom" | "none";

export type TimePoetryTextBlock = {
  id: string;
  kind: "title" | "poem" | "caption";
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  direction: "vertical" | "horizontal";
  color?: string;
  zIndex: number;
  effect?: TimePoetryEffect;
};

export type TimePoetryLayout = "image-left" | "image-right" | "image-top" | "image-bottom";

export type TimePoetryWork = {
  id: string;
  eyebrow: string;
  title: string;
  fontFamily?: string;
  fontSize: number;
  layout: TimePoetryLayout;
  textX?: number;
  textY?: number;
  textFrameWidth?: number;
  textFrameHeight?: number;
  imageFrameX?: number;
  imageFrameY?: number;
  imageFrameWidth?: number;
  imageFrameHeight?: number;
  textDirection?: "vertical" | "horizontal";
  verticalColumns: string[];
  citation?: string;
  body: string[];
  meta: string[];
  images: TimePoetryImage[];
  textBlocks?: TimePoetryTextBlock[];
};

export const defaultPoetryFont =
  '"Duomei Handwriting", "LXGW WenKai", "霞鹜文楷", "Ma Shan Zheng", "Zhi Mang Xing", "STKaiti", "KaiTi", serif';

export const timePoetryWorks: TimePoetryWork[] = [
  {
    id: "paper-light",
    eyebrow: "POETRY WORKS",
    title: "纸上风景",
    fontFamily: defaultPoetryFont,
    fontSize: 56,
    layout: "image-left",
    verticalColumns: ["风把灯吹亮", "人在路途中", "云很自由"],
    citation: "选自《风轩雅集》",
    body: [
      "我把路上的光，折进一页纸里。",
      "那些没有赶路的下午，后来都成了诗。",
    ],
    meta: ["原创", "2026.07", "DUOMEI JOURNAL"],
    images: [
      { label: "傍晚的路", src: "/images/note-default-covers/duomei-default-cover-03.png", position: "50% 50%" },
    ],
  },
  {
    id: "late-wind",
    eyebrow: "TRAVEL POEM",
    title: "晚风小札",
    fontFamily: defaultPoetryFont,
    fontSize: 52,
    layout: "image-right",
    verticalColumns: ["山风在纸上", "河水慢慢行", "光落下无声"],
    citation: "选自《多美小记》",
    body: [
      "傍晚经过一条小路，云影落在窗上。",
      "所谓远方，也许就是愿意慢慢看的地方。",
    ],
    meta: ["原创", "2026.07", "DUOMEI JOURNAL"],
    images: [
      { label: "在路上的日子", src: "/images/note-default-covers/duomei-default-cover-01.png", position: "50% 44%" },
    ],
  },
  {
    id: "notebook-pressed-flowers",
    eyebrow: "诗词作品",
    title: "折花映柳",
    fontFamily: defaultPoetryFont,
    fontSize: 54,
    layout: "image-left",
    verticalColumns: ["折花映柳狂风后", "灿烂千阳又归来"],
    citation: "选自《没有遇见 何来艳遇》",
    body: ["折花映柳狂风后", "灿烂千阳又归来"],
    meta: ["手记", "第 3 页"],
    images: [
      { label: "压花手记", src: "/images/poetry-pages/notebook-03.webp", position: "50% 54%" },
    ],
  },
  {
    id: "notebook-wine-and-poetry",
    eyebrow: "诗词作品",
    title: "酒不解渴",
    fontFamily: defaultPoetryFont,
    fontSize: 54,
    layout: "image-right",
    verticalColumns: ["酒不解渴润平生", "诗不果腹养心肺"],
    citation: "选自《没有遇见 何来艳遇》",
    body: ["酒不解渴润平生。", "诗不果腹养心肺，"],
    meta: ["手记", "第 26 页"],
    images: [
      { label: "荷塘与飞鸟", src: "/images/poetry-pages/notebook-26.webp", position: "50% 50%" },
    ],
  },
  {
    id: "notebook-youth",
    eyebrow: "诗词作品",
    title: "青春",
    fontFamily: defaultPoetryFont,
    fontSize: 58,
    layout: "image-left",
    verticalColumns: ["所有的结局都已写好", "所有的泪水也都已启程", "青春是一本太仓促的书"],
    citation: "选自《没有遇见 何来艳遇》",
    body: ["在那个古老的不再回来的夏日", "青春是一本太仓促的书"],
    meta: ["手记", "第 35 页"],
    images: [
      { label: "青春手写页", src: "/images/poetry-pages/notebook-35.webp", position: "50% 47%" },
    ],
  },
  {
    id: "notebook-summer-solstice",
    eyebrow: "诗词作品",
    title: "夏至",
    fontFamily: defaultPoetryFont,
    fontSize: 58,
    layout: "image-right",
    verticalColumns: ["冬啸暑人叹日长", "夏至伏天万丈光", "不尽滴露盈似豆", "吞江饮水口如斗"],
    citation: "选自《没有遇见 何来艳遇》",
    body: ["冬啸暑人叹日长，夏至伏天万丈光。", "不尽滴露盈似豆，吞江饮水口如斗。"],
    meta: ["手记", "第 41 页"],
    images: [
      { label: "夏至手写页", src: "/images/poetry-pages/notebook-41.webp", position: "50% 72%" },
    ],
  },
];
