import { Link } from "react-router-dom";
import { SectionHeading } from "../components/SectionHeading";
import type { ContentType } from "../lib/cmsTypes";
import { getPublishedItems } from "../lib/cmsStore";

const labels: Record<ContentType, { eyebrow: string; title: string; path: string }> = {
  journey: { eyebrow: "Journey Archive", title: "旅程档案", path: "journey" },
  photo: { eyebrow: "Photography Archive", title: "摄影档案", path: "photo" },
  note: { eyebrow: "Classical Notes", title: "古文札记", path: "note" },
  essay: { eyebrow: "Essay Archive", title: "文章档案", path: "essay" },
  "ai-wall": { eyebrow: "AI Wall", title: "AI 留言", path: "ai-wall" },
};

export function ListingPage({ type }: { type: ContentType }) {
  const items = getPublishedItems(type);
  const label = labels[type];

  return (
    <main className="archive-page">
      <section className="section">
        <SectionHeading
          eyebrow={label.eyebrow}
          title={label.title}
          intro="按时间、地点和记忆顺序整理的个人数字档案。"
        />
        <div className="archive-grid">
          {items.map((item) => (
            <Link className="archive-card" to={`/${label.path}/${item.slug}`} key={item.id} data-reveal>
              <div className="image-field ratio-16-10 tone-mist">
                <span>{item.category || item.type}</span>
              </div>
              <div className="card-body">
                <div className="card-meta">
                  <span>{item.location || item.category || item.type}</span>
                  <span>{item.date}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.excerpt}</p>
                <div className="tag-row">
                  {item.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
