export type Photo = {
  title: string;
  category: "Street" | "Travel" | "Festival" | "Nature" | "Care Life" | "China Memory";
  caption: string;
  tone: string;
};

export const photoCategories = [
  "All",
  "Street",
  "Travel",
  "Festival",
  "Nature",
  "Care Life",
  "China Memory",
] as const;

export const photos: Photo[] = [
  { title: "Station After Rain", category: "Street", caption: "大阪雨后的站台", tone: "rain" },
  { title: "Maizuru Harbor", category: "Travel", caption: "海边的舰影", tone: "marine" },
  { title: "Festival Lantern", category: "Festival", caption: "祭典灯火", tone: "lantern" },
  { title: "Lotus Morning", category: "Nature", caption: "白鹭公园的荷", tone: "lotus" },
  { title: "Night Shift Dawn", category: "Care Life", caption: "夜勤后的清晨", tone: "dawn" },
  { title: "Guilin Hillline", category: "China Memory", caption: "桂林山影", tone: "guilin" },
  { title: "Sakai Corner", category: "Street", caption: "街角与自行车", tone: "sakai" },
  { title: "Yonago Window", category: "Travel", caption: "旅馆窗边", tone: "window" },
  { title: "Paper Crane", category: "Care Life", caption: "介护现场的小纸鹤", tone: "paper" },
  { title: "Summer Shrine", category: "Festival", caption: "夏日神社", tone: "shrine" },
  { title: "River Memory", category: "China Memory", caption: "记忆里的水边", tone: "river" },
  { title: "Cloud Gap", category: "Nature", caption: "云缝里的光", tone: "cloud" },
];
