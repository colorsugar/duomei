import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { FrontContentActions } from "./FrontContentActions";
import { useInlineEdit } from "./InlineEditProvider";
import { SectionHeading } from "./SectionHeading";

export function EssayList() {
  const { refreshKey } = useInlineEdit();
  void refreshKey;
  const essays = getHomeItems("essay");

  return (
    <section className="section" id="essays">
      <SectionHeading
        eyebrow="Essays"
        title="文章"
        intro="关于旅行、摄影、介护工作、日本生活，也关于一个人为什么需要自己的档案馆。"
      />
      <div className="section-front-actions">
        <FrontContentActions type="essay" addLabel="新增文章" />
      </div>
      <div className="essay-list" data-reveal>
        {essays.map((essay) => (
          <div className="essay-row" key={essay.id}>
            <FrontContentActions type="essay" item={essay} compact />
            <Link to={`/essay/${essay.slug}`}>
              <span>{essay.category}</span>
              <strong>{essay.title}</strong>
              <time>{essay.date}</time>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
