export type Journey = {
  title: string;
  location: string;
  date: string;
  description: string;
  tags: string[];
  tone: string;
};

export const journeys: Journey[] = [
  {
    title: "舞鶴 Fleet Festa",
    location: "Kyoto / Maizuru",
    date: "2026.05",
    description: "海风、舰影和人群之间，一天慢慢展开成蓝色的记忆。",
    tags: ["Travel", "Festival", "Sea"],
    tone: "marine",
  },
  {
    title: "美保基地航空祭",
    location: "Tottori / Miho",
    date: "2026.05",
    description: "抬头看飞机划过云层，也记录一个人站在跑道旁的安静。",
    tags: ["Airshow", "Photo", "Tottori"],
    tone: "sky",
  },
  {
    title: "堺の祭り",
    location: "Osaka / Sakai",
    date: "2026.04",
    description: "熟悉的街道突然热闹起来，像生活给自己换了一件外衣。",
    tags: ["Sakai", "Street", "Festival"],
    tone: "cacao",
  },
  {
    title: "白鷺公園の蓮",
    location: "Osaka / Shirasagi",
    date: "2026.07",
    description: "荷叶、微风、远处的日语闲谈，夏天在水面上停了一会。",
    tags: ["Nature", "Lotus", "Walk"],
    tone: "lotus",
  },
  {
    title: "大阪ひとり散歩",
    location: "Osaka",
    date: "2026.03",
    description: "没有计划的散步，把便利店灯光和傍晚车站都放进相机。",
    tags: ["Solo Travel", "Street", "Osaka"],
    tone: "moss",
  },
  {
    title: "桂林の記憶",
    location: "China / Guilin",
    date: "Memory",
    description: "山水不是背景，是从很远的地方一直跟着我的起点。",
    tags: ["Guilin", "Memory", "Home"],
    tone: "mist",
  },
];
