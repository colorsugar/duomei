import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { SectionHeading } from "./SectionHeading";

export function EssayList() {
  const essays = getHomeItems("essay");

  return (
    <section className="section" id="essays">
      <SectionHeading
        eyebrow="Essays"
        title="文章"
        intro="关于旅行、摄影、介护工作、日本生活，也关于一个人为什么需要自己的档案馆。"
      />
      <div className="essay-list" data-reveal>
        {essays.map((essay) => (
          <Link className="essay-row" to={`/essay/${essay.slug}`} key={essay.id}>
            <span>{essay.category}</span>
            <strong>{essay.title}</strong>
            <time>{essay.date}</time>
          </Link>
        ))}
      </div>
    </section>
  );
}
