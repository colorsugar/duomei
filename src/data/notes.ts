export type Note = {
  title: string;
  quote: string;
  thought: string;
  tags: string[];
};

export const notes: Note[] = [
  {
    title: "《滕王阁序》摘记",
    quote: "落霞与孤鹜齐飞，秋水共长天一色。",
    thought: "好的景色不是热闹，而是天地忽然对齐，让人意识到自己也在其中。",
    tags: ["山水", "秋日"],
  },
  {
    title: "《赤壁赋》摘记",
    quote: "寄蜉蝣于天地，渺沧海之一粟。",
    thought: "人在旅途中会变小，但也因为变小，才看见更大的水面和月光。",
    tags: ["江月", "旅行感"],
  },
  {
    title: "《兰亭集序》摘记",
    quote: "仰观宇宙之大，俯察品类之盛。",
    thought: "从抬头到低头，是一种观看世界的方法，也像摄影里的远景和细节。",
    tags: ["观看", "书写"],
  },
  {
    title: "古文里的旅行感",
    quote: "风烟俱净，天山共色。",
    thought: "古人的路常常很慢，所以一句风景里会藏着路程、天气和心情。",
    tags: ["行旅", "风景"],
  },
  {
    title: "山水、离别与归乡",
    quote: "仍怜故乡水，万里送行舟。",
    thought: "所谓故乡，也许就是离开后仍然替你送行的那一部分。",
    tags: ["故乡", "离别"],
  },
];
