export type CompanionMessageContext = "home" | "about" | "not-found" | "published" | "detail";

export const companionMessages: Record<CompanionMessageContext, string[]> = {
  home: ["今天适合出发。", "慢一点，也没关系。", "旅行不是赶路。", "风会记得，你来过这里。"],
  about: ["原来这里也有故事。", "这里很安静。", "每一段路，都有意义。"],
  "not-found": ["我们是不是走错路了？", "别急，路会出现的。"],
  published: ["新的旅程开始了。", "这段记忆，已经收好了。"],
  detail: ["这一页，我也很喜欢。", "你拍的照片很好看。", "再坐一会儿吧。"],
};

export function getCompanionMessage(context: CompanionMessageContext, index = 0) {
  const messages = companionMessages[context];
  return messages[index % messages.length];
}
