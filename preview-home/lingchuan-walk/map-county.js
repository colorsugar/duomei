// ============================================================================
// 桂林县区风物立绘（gl-*）：阳朔、荔浦、恭城、永福、龙胜、资源、兴安、全州、灌阳
// 坐标：OpenStreetMap / Nominatim 地名点（WGS84）；approx 为区域代表点
// 立绘：Grok 照实拍所画（~/grokbox/guilin-art/out2）
// 事实只写 factcheck-counties/result.md 核过、或 OSM 地名可查的内容；
// 不写店名、价格、营业时间；查不到的字段写「—」，不编造
// 漓江竹筏位置不好定，未上图
// ============================================================================

const P = (o) => ({ tier: 2, heightScale: 0.92, ...o, img: `gl-${o.slug}` });
const NONE = '—';

export const COUNTY_POIS = [
  // -------------------- 阳朔县 --------------------
  P({
    id: 'gl-xijie', slug: 'xijie', townId: 'yangshuo',
    title: '阳朔西街', subtitle: '阳朔县 · 县城', category: '古村',
    lon: 110.4905, lat: 24.7782,
    tagline: '青石板路两旁是老屋，街尾抬头见山。',
    town: '阳朔县城', season: NONE,
    stat: '在阳朔县城',
    story: '西街在阳朔县城，是一条铺着石板的老街，两侧是旧式楼屋，街尾有山。',
    tips: NONE,
    sources: ['阳朔县公开资料', 'OpenStreetMap 地名点'],
  }),
  P({
    id: 'gl-xingping', slug: 'xingping', townId: 'yangshuo',
    title: '兴坪漓江', subtitle: '阳朔县 · 兴坪镇', category: '山水',
    lon: 110.5278, lat: 24.9198, approx: true,
    tagline: '漓江在兴坪一带，峰影落进水里。',
    town: '阳朔县 · 兴坪镇', season: NONE,
    stat: '兴坪在阳朔县城上游',
    story: '漓江自北向南流经兴安、灵川、桂林市区、阳朔。兴坪在阳朔县城上游，沿江徒步可从杨堤顺流走到兴坪。',
    tips: NONE,
    sources: ['阳朔县公开资料', 'OpenStreetMap 地名点（兴坪镇）'],
  }),
  P({
    id: 'gl-yulonghe', slug: 'yulonghe', townId: 'yangshuo',
    title: '遇龙河', subtitle: '阳朔县 · 漓江支流', category: '山水',
    lon: 110.4226, lat: 24.7837, approx: true,
    tagline: '竹筏顺水，两岸峰林与田野缓缓退去。',
    town: '阳朔县', season: NONE,
    stat: '漓江在阳朔境内最长的支流 · 全长 43.5 公里',
    story: '遇龙河是漓江在阳朔境内最长的支流，全长 43.5 公里，素有「小漓江」之称。',
    tips: NONE,
    sources: ['百度百科「遇龙河」', 'OpenStreetMap 地名点'],
  }),
  P({
    id: 'gl-yueliangshan', slug: 'yueliangshan', townId: 'yangshuo',
    title: '月亮山', subtitle: '阳朔县', category: '山水',
    lon: 110.4677, lat: 24.7281,
    tagline: '山顶一个半月形的穿洞，天光从里面漏出来。',
    town: '阳朔县', season: NONE,
    stat: NONE,
    story: '月亮山在阳朔县，山顶有一个半月形的穿洞，远看如月挂山间。',
    tips: NONE,
    sources: ['OpenStreetMap 地名点'],
  }),
  // -------------------- 荔浦市 --------------------
  P({
    id: 'gl-lipuyu', slug: 'lipuyu', townId: 'lipu',
    title: '荔浦芋', subtitle: '荔浦市 · 特产', category: '美食特产',
    lon: 110.395, lat: 24.488, approx: true,
    tagline: '切开的芋头，粉白的心。',
    town: '荔浦市', season: '10 月中下旬至 11 月集中上市',
    stat: '国家地理标志产品 · 清代曾列为广西首选贡品',
    story: '荔浦芋是国家地理标志产品，清代曾列为广西首选贡品。属中晚熟品种，10 月中下旬至 11 月集中采收上市。',
    tips: NONE,
    sources: ['荔浦芋公开资料（农业类媒体）'],
  }),
  P({
    id: 'gl-yinziyan', slug: 'yinziyan', townId: 'lipu',
    title: '银子岩', subtitle: '荔浦市 · 溶洞', category: '山水',
    lon: 110.4341, lat: 24.6446,
    tagline: '洞里石钟乳垂挂，灯下一片斑斓。',
    town: '荔浦市', season: NONE,
    stat: '国家 4A 级溶洞景观',
    story: '银子岩在荔浦市，是国家 4A 级溶洞景观，洞内布满钟乳石。',
    tips: NONE,
    sources: ['百度百科「荔浦景区」', 'OpenStreetMap 地名点'],
  }),
  // -------------------- 恭城瑶族自治县 --------------------
  P({
    id: 'gl-gongchengwenmiao', slug: 'gongchengwenmiao', townId: 'gongcheng',
    title: '恭城文庙', subtitle: '恭城 · 县城', category: '古村',
    lon: 110.8226, lat: 24.8347,
    tagline: '依山而建的古建筑群，台阶一层层往上。',
    town: '恭城瑶族自治县 · 拱辰西路', season: NONE,
    stat: NONE,
    story: '恭城文庙在恭城县城拱辰西路，殿宇沿山势层层而上。',
    tips: NONE,
    sources: ['OpenStreetMap 地名点'],
  }),
  // -------------------- 永福县 --------------------
  P({
    id: 'gl-luohanguo', slug: 'luohanguo', townId: 'yongfu',
    title: '罗汉果', subtitle: '永福县 · 特产', category: '美食特产',
    lon: 109.8269, lat: 25.2478, approx: true,
    tagline: '藤上挂满青青的罗汉果。',
    town: '永福县 · 龙江乡一带', season: '9 月底开采，可至 12 月；9 至 10 月为丰收上市季',
    stat: '「中国罗汉果之乡」 · 永福罗汉果为国家地理标志保护产品',
    story: '永福是全国最大的罗汉果生产、加工和出口基地，罗汉果发源于永福县龙江乡。1995 年永福被农业部命名为「中国罗汉果之乡」，2004 年永福罗汉果获国家地理标志保护产品。',
    tips: NONE,
    sources: ['永福县公开资料', '百度百科「罗汉果」「永福罗汉果」', 'OpenStreetMap 地名点（龙江乡）'],
  }),
  // -------------------- 龙胜各族自治县 --------------------
  P({
    id: 'gl-longji', slug: 'longji', townId: 'longsheng',
    title: '龙脊梯田', subtitle: '龙胜 · 龙脊镇', category: '山水',
    lon: 110.0675, lat: 25.7274, approx: true,
    tagline: '梯田层层绕山，一圈一圈往上。',
    town: '龙胜各族自治县 · 龙脊镇', season: NONE,
    stat: '全球重要农业文化遗产 · 国家 4A 级景区',
    story: '龙脊梯田在龙胜各族自治县龙脊镇，至少有 2300 多年历史，2018 年随「中国南方山地稻作梯田系统」列入全球重要农业文化遗产。',
    tips: NONE,
    sources: ['百度百科「龙脊梯田」', '广西自然资源厅公开信息', 'OpenStreetMap 地名点（景区售票处）'],
  }),
  // -------------------- 资源县 --------------------
  P({
    id: 'gl-bajiaozhai', slug: 'bajiaozhai', townId: 'ziyuan',
    title: '八角寨', subtitle: '资源县 · 丹霞', category: '山水',
    lon: 110.7281, lat: 26.2772,
    tagline: '红色山峰一簇一簇，立在云雾里。',
    town: '资源县', season: NONE,
    stat: '簇群式丹霞 · 主峰海拔 818 米 · 世界自然遗产地',
    story: '八角寨是簇群式丹霞地貌，主峰海拔 818 米，是世界自然遗产地、国家地质公园、国家 4A 级景区，跨广西资源与湖南新宁。',
    tips: NONE,
    sources: ['百度百科「八角寨」', '人民网广西频道', 'OpenStreetMap 地名点'],
  }),
  // -------------------- 兴安县 --------------------
  P({
    id: 'gl-lingqu', slug: 'lingqu', townId: 'xing-an',
    title: '灵渠', subtitle: '兴安县', category: '山水',
    lon: 110.6489, lat: 25.6133,
    tagline: '秦时灵渠，湘漓在此分流。',
    town: '兴安县', season: NONE,
    stat: '公元前 214 年凿成通航 · 全长 36.4 公里 · 世界灌溉工程遗产',
    story: '灵渠由秦始皇命监御史禄开凿，公元前 214 年凿成通航，连通东面的海洋河（湘江源）与西面的大溶江（漓江源），「湘漓分派」，三分入漓，七分归湘。1988 年列为全国重点文物保护单位，2018 年入选世界灌溉工程遗产。',
    tips: NONE,
    sources: ['百度百科「灵渠」', '中国政府网 2018-08-15', 'OpenStreetMap 地名点'],
  }),
  // -------------------- 全州县 --------------------
  P({
    id: 'gl-xiangshansi', slug: 'xiangshansi', townId: 'quanzhou',
    title: '湘山寺', subtitle: '全州县', category: '古村',
    lon: 111.0560, lat: 25.9378,
    tagline: '林间立着一座红柱的塔。',
    town: '全州县', season: NONE,
    stat: '素有「楚南第一名刹」之誉',
    story: '湘山寺在全州县，素有「楚南第一名刹」之誉。',
    tips: NONE,
    sources: ['百度百科「湘山寺」', 'OpenStreetMap 地名点'],
  }),
  // -------------------- 灌阳县 --------------------
  P({
    id: 'gl-yueling', slug: 'yueling', townId: 'guanyang',
    title: '月岭古村', subtitle: '灌阳县', category: '古村',
    lon: 111.2045, lat: 25.6624, approx: true,
    tagline: '稻田边一座石牌坊，后面是旧屋。',
    town: '灌阳县', season: NONE,
    stat: NONE,
    story: '月岭在灌阳县，村中有石牌坊与古民居。',
    tips: NONE,
    sources: ['OpenStreetMap 地名点（月岭）'],
  }),
];
