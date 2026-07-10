export type CompanionMessageContext = "home" | "about" | "not-found" | "published" | "detail";

export const companionMessages: Record<CompanionMessageContext, string[]> = {
  home: [
    "今天适合出发。",
    "慢一点，也没关系。",
    "这里很安静。",
    "旅行不是赶路。",
    "今天也辛苦了。",
    "每一段路，都有意义。",
    "风会记得，你来过这里。",
    "愿今天，也有新的风景。",
    "再坐一会儿吧。",
    "带上相机，慢慢看。",
    "路上不用太着急。",
    "今天的光很温柔。",
    "生活也可以像旅行。",
    "云走得很慢，我们也可以。",
    "小小的路，也值得记录。",
    "先听听风，再出门。",
    "你已经在路上了。",
    "把今天轻轻收好。",
    "有些风景，会自己出现。",
    "不赶时间的日子最好。",
    "这一页，先从风开始。",
    "慢慢走，会遇见很多东西。",
    "这里适合发呆。",
    "记录不需要很大声。",
    "今天的路可以短一点。",
    "这样就很好。",
    "花开的时候，我们慢一点。",
    "小记会替你保存今天。",
  ],
  about: [
    "原来这里也有故事。",
    "这里很适合安静地读。",
    "记忆也需要一个小房间。",
    "慢慢写，就会留下来。",
    "关于自己，也可以轻轻说。",
    "这些小事，都很珍贵。",
    "路过的日子，也会发光。",
    "这里像一本慢慢翻的手帐。",
    "介绍自己也可以小小声。",
    "这些文字像抽屉里的明信片。",
    "我在页角坐好啦，继续读。",
    "有些故事会自己发芽。",
    "慢慢认识一个人，是很温柔的事情。",
  ],
  "not-found": [
    "我们是不是走错路了？",
    "别急，路会出现的。",
    "地图偶尔也会打盹。",
    "这条路暂时没有开通。",
    "先回到有光的地方吧。",
    "可能是风把路牌吹歪了。",
    "迷路也是旅行的一部分。",
    "换一条小路试试看。",
    "先别慌，我把地图摊开看看。",
    "这里空空的，但风景还在前面。",
  ],
  published: [
    "新的旅程开始了。",
    "这段记忆，已经收好了。",
    "发布完成，辛苦了。",
    "今天的小记有了位置。",
    "又多了一页风景。",
    "这张照片也住进来了。",
    "写完以后，可以休息一下。",
    "记录完成，风也安静了。",
    "发布成功，我举小旗啦。",
    "照片和文字都安顿好了。",
  ],
  detail: [
    "这一页，我也很喜欢。",
    "你拍的照片很好看。",
    "再坐一会儿吧。",
    "这段路很安静。",
    "光线停在这里了。",
    "读到这里，风也慢了。",
    "这张照片像一封信。",
    "每个地点都有自己的声音。",
    "这里适合慢慢看。",
    "有些瞬间不用解释。",
    "你把那天保存下来了。",
    "文字和照片都很温柔。",
    "这一页适合配一杯热茶。",
  ],
};

const companionFaces = ["(*´▽`*)", "( ´ ▽ ` )", "( •̀ ω •́ )", "( ˘ω˘ )", "(｡･∀･)ﾉﾞ"];

export function getCompanionMessage(context: CompanionMessageContext, index = 0) {
  const messages = companionMessages[context];
  return messages[index % messages.length];
}

export function getRandomCompanionMessage(context: CompanionMessageContext, avoid?: string) {
  const messages = companionMessages[context];
  const pool = messages.length > 1 && avoid ? messages.filter((message) => message !== avoid) : messages;
  const message = pool[Math.floor(Math.random() * pool.length)];
  if (Math.random() < 0.28) return `${message} ${companionFaces[Math.floor(Math.random() * companionFaces.length)]}`;
  return message;
}
