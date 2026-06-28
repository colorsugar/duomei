import { Link, useParams } from "react-router-dom";
import type { ContentType } from "../lib/cmsTypes";
import { getItemBySlug } from "../lib/cmsStore";
import { NotFoundPage } from "./NotFoundPage";

const pathMap: Record<ContentType, string> = {
  journey: "journey",
  photo: "photo",
  note: "notes",
  essay: "essays",
  "ai-wall": "ai-wall",
};

export function DetailPage({ type }: { type: ContentType }) {
  const { slug } = useParams();
  const item = getItemBySlug(type, slug);

  if (!item) return <NotFoundPage />;

  return (
    <main className="detail-page">
      <article className="detail-paper" data-reveal>
        <Link className="back-link" to={`/${pathMap[type]}`}>
          Back to archive
        </Link>
        <p className="eyebrow">{item.category || item.type}</p>
        <h1>{item.title}</h1>
        <div className="detail-meta">
          <span>{item.date}</span>
          {item.location ? <span>{item.location}</span> : null}
          {item.featured ? <span>Featured</span> : null}
        </div>
        <div className="image-field detail-cover tone-mist">
          <span>{item.subtitle || item.title}</span>
        </div>
        <p className="detail-excerpt">{item.excerpt}</p>
        <div className="detail-body">
          {item.body.split("\n").map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="tag-row">
          {item.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </article>
    </main>
  );
}
