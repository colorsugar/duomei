import { HomeSectionHold } from "./HomeSectionHold";
import { Link } from "react-router-dom";

const YUNYOU_HREF = "/yunyou-map";

export function YunyouSection() {
  return (
    <HomeSectionHold id="yunyou" className="yunyou-section" ariaLabelledBy="yunyou-title">
      <header className="yunyou-heading">
        <h2 id="yunyou-title">云游</h2>
        <p>把桂林的山水、旧城和灯火，收进一张可以自由转动的地图。</p>
      </header>

      <Link className="yunyou-card" to={YUNYOU_HREF} aria-label="打开云游 · 桂林两江四湖">
        <span className="yunyou-card-cover" aria-hidden="true">
          <img src="/images/yunyou-guilin-cover.webp" alt="" width="1600" height="900" loading="lazy" />
        </span>
        <span className="yunyou-card-kicker" aria-hidden="true">桂林 · 两江四湖</span>
        <strong className="yunyou-card-title">沿着水岸，慢慢看桂林</strong>
        <span className="yunyou-card-copy">从象鼻山到日月双塔，把熟悉的山水与旧城放进一张可以转动的地图。天色暗下来，城里的灯也会一盏盏亮起。</span>
        <span className="yunyou-card-cta">开始云游 →</span>
      </Link>
    </HomeSectionHold>
  );
}
