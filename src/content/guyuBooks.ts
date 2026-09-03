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
  author?: string;
  kind: string;
  chapter: string;
  access: "class-gated" | "public";
  description: string;
  accessibilityNote: string;
  pageCount: number;
  coverSrc: string;
  previewCoverSrc: string;
  previewAccent: string;
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

const xinshuoTwoPages = publicBookPages("xinshuo-02", 30);
const xinshuoTwoPreviewCoverSrc = "/images/guyu-xinshuo-02-cover.webp";

const xinshuoTwoPageDescriptions = [
  "安静的教室里，黄色书包忽然浮离地面。学生抱着课本，惊讶地看着浮起的黄色书包。",
  "书包带着星光飘向楼梯，学生追了上去。学生沿校园走廊追赶飘向楼梯的书包。",
  "课桌和椅子搭成通往夜空的阶梯。学生爬上歪斜的课桌阶梯，伸手追赶书包。",
  "教室屋顶变成星空，月亮近得像能摸到。教室屋顶敞向星空，学生站在课桌上伸手够书包。",
  "害怕变成勇气，书包载着学生飞过云层。学生骑着黄色书包飞向巨大月亮，纸飞机相随。",
  "清晨回到校门，掌心多了一颗浅蓝色石头。学生在校门前向橘猫展示浅蓝色月亮石。",
  "大云朵像水壶一样，把第一场雨倒下来。两名穿雨衣的学生仰望水壶形状的乌云。",
  "积水越过雨靴，担心随着纸船一起漂动。两名学生挤在翻折的雨伞下看着被水淹的街道。",
  "雨伞成了帆船，公交车成了红鲸鱼。两名学生在雨水想象成的河里驾驶雨伞船。",
  "小纸船接走困在叶子上的蚂蚁。两名学生用纸船帮助叶片上的蚂蚁渡过积水。",
  "红色公交鲸鱼推着温柔的浪向前游。雨伞船与长出鲸尾的红色公交车并肩航行。",
  "雨停以后，彩虹藏进了路边水洼。两名学生站在雨后街道上看着水洼里的彩虹。",
  "忙碌街道上，只有一个人发现高处的猫影。学生在车流旁指向正在攀爬高楼的橘猫。",
  "一串湿猫爪印沿着楼梯一直向上。学生跟随橘色猫爪印爬上狭长楼梯。",
  "楼顶的风很大，城市深得让人不敢迈步。学生站在高楼屋顶望向对面受困的橘猫。",
  "一条红围巾在两座楼之间变成小桥。学生拉紧红围巾，让橘猫从相邻屋顶走来。",
  "风停下来，小小的身体终于不再发抖。学生坐在安全的屋顶中央紧紧抱住获救橘猫。",
  "高楼不再孤单，窗户和花盆一起亮起来。学生与橘猫在夕阳屋顶分享食物和水。",
  "操场很热闹，教室里却只剩一个人。学生独坐在空教室，门外同学正在操场奔跑。",
  "柜子深处还有几截短短的彩色粉笔。学生在旧柜子里发现装着短粉笔的纸盒。",
  "一根犹豫的红线，让奔跑的人停下来看。学生跪在操场边画红线，两名同学好奇围观。",
  "安静的一根线，变成全操场的彩色道路。许多学生在操场共同绘制巨大的彩虹道路。",
  "短雨把粉笔画冲开，颜色开始自己流动。学生们在太阳雨中用叶片引导流动的彩色水痕。",
  "被冲淡的画，又被更多双手重新画亮。学生举起最后一截红粉笔，大家共同重画彩虹路。",
  "月亮石、纸船和红粉笔被放在书桌上。穿条纹睡衣的学生整理书包里的月亮石、纸船和粉笔。",
  "屋里很安静，月亮石却在床边轻轻发光。学生躺在床上望着床头发光的浅蓝色月亮石。",
  "枕头下面露出一小块太阳和白云。学生掋开枕头一角，看见温暖的太阳光。",
  "房间装不下的白天，流进了无边梦境。学生掋开枕头，白昼风景流入布满鲸鱼和云朵的梦境。",
  "月亮、纸船、小猫和彩虹在同一片天空相遇。学生和橘猫乘飞行书包经过鲸鱼、彩虹路与漂浮校园。",
  "清晨回到画纸，梦里的故事有了最后一笔。学生在晨光中为画册画橘猫，真猫用爪碰触页面。",
] as const;

const xinshuoTwoLogicalPages: GuyuLogicalPage[] = [
  {
    id: "xinshuo-02-cover",
    sourcePage: null,
    src: xinshuoTwoPreviewCoverSrc,
    placement: "full",
    description: "水彩封面：月亮、黄色书包、学校、树与橘猫，题字多美故语·新说",
  },
  ...fullLogicalPages("xinshuo-02", xinshuoTwoPages, xinshuoTwoPageDescriptions),
  {
    id: "xinshuo-02-back-cover",
    sourcePage: null,
    src: null,
    placement: "blank",
    description: "封底衬页",
  },
];

const guiXiangHuanXiangPages = publicBookPages("gui-xiang-huan-xiang", 30);

const guiXiangHuanXiangPageDescriptions = [
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

const guiXiangHuanXiangLogicalPages = fullLogicalPages(
  "gui-xiang-huan-xiang",
  guiXiangHuanXiangPages,
  guiXiangHuanXiangPageDescriptions,
);

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
    previewAccent: "var(--color-guyu-cover-old)",
    pages: meiyouYujianPages,
    pageDescriptions: meiyouYujianPageDescriptions,
    logicalPages: meiyouYujianLogicalPages,
  },
  {
    id: "zhi-shang-feiyan",
    title: "纸上飞檐",
    kind: "画册",
    chapter: "新说",
    access: "public",
    description: "用彩铅在暖纸上，跟一处无名旧园走完从晨到夜、从雨到月的一日。",
    accessibilityNote: "本册为无人物彩铅建筑画本；每一页都有画面说明。",
    pageCount: 30,
    coverSrc: zhiShangFeiyanPages[0],
    previewCoverSrc: "/images/guyu-zhi-shang-feiyan-cover.webp",
    previewAccent: "var(--color-guyu-cover-feiyan)",
    pages: zhiShangFeiyanPages,
    pageDescriptions: zhiShangFeiyanPageDescriptions,
    logicalPages: zhiShangFeiyanLogicalPages,
  },
  {
    id: "xinshuo-01",
    title: "想象画本",
    kind: "画册",
    chapter: "新说",
    access: "public",
    description: "自由绘画、观察记录、幻想片段、手作、色彩实验与纸上小发现。",
    accessibilityNote: "本册为无身份文字的想象与创作画本；每一页都有画面说明。",
    pageCount: 30,
    coverSrc: xinshuoOnePages[0],
    previewCoverSrc: "/images/guyu-xinshuo-01-cover.webp",
    previewAccent: "var(--color-guyu-cover-imagination)",
    pages: xinshuoOnePages,
    pageDescriptions: xinshuoOnePageDescriptions,
    logicalPages: xinshuoOneLogicalPages,
  },
  {
    id: "xinshuo-02",
    title: "月亮下的童梦",
    author: "多美",
    kind: "画册",
    chapter: "新说",
    access: "public",
    description: "五段小学水彩想象，从飞向月亮的书包，到被枕头收好的白天。",
    accessibilityNote: "本册为小学生水彩画风格的连续想象画册；每一页都有画面说明。",
    pageCount: 30,
    coverSrc: xinshuoTwoPreviewCoverSrc,
    previewCoverSrc: xinshuoTwoPreviewCoverSrc,
    previewAccent: "var(--color-guyu-cover-watercolor)",
    pages: xinshuoTwoPages,
    pageDescriptions: xinshuoTwoPageDescriptions,
    logicalPages: xinshuoTwoLogicalPages,
  },
  {
    id: "gui-xiang-huan-xiang",
    title: "桂巷还香",
    kind: "画册",
    chapter: "新说",
    access: "public",
    description: "桂林册页集。浅绛、岩彩、水印木刻、针管水彩、粉彩、油画棒混搭。每页一个地标，有题跋落款。人只以背影出现。",
    accessibilityNote: "本册为桂林地标册页；每页有地标落款，人只以背影出现，每一页都有画面说明。",
    pageCount: 30,
    coverSrc: guiXiangHuanXiangPages[0],
    previewCoverSrc: "/images/guyu-gui-xiang-huan-xiang-cover.webp",
    previewAccent: "var(--color-guyu-cover-guilin)",
    pages: guiXiangHuanXiangPages,
    pageDescriptions: guiXiangHuanXiangPageDescriptions,
    logicalPages: guiXiangHuanXiangLogicalPages,
  },
];

export function getGuyuBook(bookId: string | undefined) {
  return guyuBooks.find((book) => book.id === bookId);
}
