import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { FrontContentActions } from "./FrontContentActions";
import { useInlineEdit } from "./InlineEditProvider";
import { SectionHeading } from "./SectionHeading";

export function JourneyGrid() {
  const { refreshKey } = useInlineEdit();
  void refreshKey;
  const journeys = getHomeItems("journey");

  return (
    <section className="section" id="journey">
      <SectionHeading
        eyebrow="Journey"
        title="旅程"
        intro="把一个人抵达某个地方的心情，和途中听见的风、车站广播、海声一起保存。"
      />
      <div className="section-front-actions">
        <FrontContentActions type="journey" addLabel="新增旅程" />
      </div>
      <div className="journey-grid">
        {journeys.map((journey) => (
          <article className="journey-card" key={journey.id} data-reveal>
            <FrontContentActions type="journey" item={journey} compact />
            <Link to={`/journey/${journey.slug}`}>
              <div className="image-field ratio-4-3 tone-marine">
                <span>{journey.location}</span>
              </div>
              <div className="card-body">
                <div className="card-meta">
                  <span>{journey.location}</span>
                  <span>{journey.date}</span>
                </div>
                <h3>{journey.title}</h3>
                <p>{journey.excerpt}</p>
                <div className="tag-row">
                  {journey.tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
