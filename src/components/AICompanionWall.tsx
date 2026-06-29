import { FormEvent, useState } from "react";
import { getHomeItems } from "../lib/cmsStore";
import { FrontContentActions } from "./FrontContentActions";
import { useInlineEdit } from "./InlineEditProvider";
import { SectionHeading } from "./SectionHeading";

export function AICompanionWall() {
  const { refreshKey } = useInlineEdit();
  void refreshKey;
  const [messages, setMessages] = useState(() => getHomeItems("ai-wall").map((item) => item.body));
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);

  const addMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || thinking) return;

    setThinking(true);
    setDraft("");
    window.setTimeout(() => {
      setMessages((current) => [`读到「${text}」的时候，我想把它留成一张温柔的旅行便签。`, ...current]);
      setThinking(false);
    }, 600);
  };

  return (
    <section className="section ai-section" id="ai-wall">
      <SectionHeading
        eyebrow="AI Companion Wall"
        title="AI 旅伴留言墙"
        intro="这里的 AI 不是客服，而是像一路陪着我旅行的旅伴。"
      />
      <div className="section-front-actions">
        <FrontContentActions type="ai-wall" addLabel="新增留言" />
      </div>

      <div className="ai-layout">
        <div className="ai-copy" data-reveal>
          <p>
            它会根据我的照片、地点、游记和过去的记忆，留下温柔的评论、摄影点评、旅行札记和问题。
          </p>
          <form className="ai-form" onSubmit={addMessage}>
            <input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="把今天的照片或心情写下来……"
            />
            <button className="button primary" type="submit">
              {thinking ? "AI is thinking..." : "生成一条 AI 留言"}
            </button>
          </form>
        </div>

        <div className="message-wall" data-reveal>
          {thinking ? (
            <article className="message-card thinking-card">
              <span>AI Companion</span>
              <p>AI is thinking...</p>
            </article>
          ) : null}
          {getHomeItems("ai-wall").map((item, index) => (
            <article className="message-card" key={item.id}>
              <FrontContentActions type="ai-wall" item={item} compact />
              <span>AI Note {String(index + 1).padStart(2, "0")}</span>
              <p>「{item.body}」</p>
            </article>
          ))}
          {messages
            .filter((message) => !getHomeItems("ai-wall").some((item) => item.body === message))
            .map((message, index) => (
              <article className="message-card" key={`${message}-${index}`}>
                <span>AI Draft</span>
                <p>「{message}」</p>
              </article>
            ))}
        </div>
      </div>
    </section>
  );
}
