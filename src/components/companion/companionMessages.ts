export type CompanionMessageContext = "home" | "about" | "not-found" | "published" | "detail";

export const companionMessages: Record<CompanionMessageContext, string> = {
  home: "今天适合出发。",
  about: "原来这里也有故事。",
  "not-found": "我们是不是走错路了？",
  published: "新的旅程开始了。",
  detail: "这一页，我也很喜欢。",
};
