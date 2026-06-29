import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeItems } from "../lib/cmsStore";
import { FrontContentActions } from "./FrontContentActions";
import { useInlineEdit } from "./InlineEditProvider";
import { SectionHeading } from "./SectionHeading";

const photoCategories = ["All", "Street", "Travel", "Festival", "Nature", "Care Life", "China Memory"] as const;
type Category = (typeof photoCategories)[number];

export function PhotoGallery() {
  const [active, setActive] = useState<Category>("All");
  const { refreshKey } = useInlineEdit();
  void refreshKey;
  const photos = getHomeItems("photo");
  const filtered = useMemo(
    () => (active === "All" ? photos : photos.filter((photo) => photo.category === active)),
    [active],
  );

  return (
    <section className="section" id="photo">
      <SectionHeading
        eyebrow="Photography"
        title="摄影"
        intro="不是为了证明去过哪里，而是保存那些只有当时才会出现的光。"
      />
      <div className="section-front-actions">
        <FrontContentActions type="photo" addLabel="新增摄影" />
      </div>

      <div className="filter-row" data-reveal>
        {photoCategories.map((category) => (
          <button
            className={active === category ? "is-active" : ""}
            type="button"
            key={category}
            onClick={() => setActive(category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="photo-grid" aria-live="polite">
        {filtered.map((photo) => (
          <article className="photo-card" key={photo.id} data-reveal>
            <FrontContentActions type="photo" item={photo} compact />
            <Link to={`/photo/${photo.slug}`}>
              <div className="image-field ratio-3-2 tone-rain">
                <span>{photo.category}</span>
              </div>
              <div>
                <h3>{photo.title}</h3>
                <p>{photo.excerpt}</p>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
