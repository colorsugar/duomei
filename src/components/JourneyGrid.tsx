import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { SectionHeading } from "./SectionHeading";

export function JourneyGrid() {
  const journeys = getHomeItems("journey");

  return (
    <section className="section" id="journey">
      <SectionHeading
        eyebrow="Journey"
        title="旅程"
        intro="把一个人抵达某个地方的心情，和途中听见的风、车站广播、海声一起保存。"
      />
      <div className="journey-grid">
        {journeys.map((journey) => (
          <Link className="journey-card" to={`/journey/${journey.slug}`} key={journey.id} data-reveal>
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
        ))}
      </div>
    </section>
  );
}
