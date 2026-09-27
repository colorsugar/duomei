import { HomeSectionHold } from "./HomeSectionHold";
import { Link } from "react-router-dom";

const YUNYOU_HREF = "/yunyou-map";
const XIAOYUAN_HREF = "/xiaoyuan";

export function YunyouSection() {
  return (
    <HomeSectionHold id="yunyou" className="yunyou-section" ariaLabelledBy="yunyou-title">
      <header className="yunyou-heading">
        <h2 id="yunyou-title">云游</h2>
        <p>把桂林的山水、旧城和灯火，收进一张可以自由转动的地图。</p>
      </header>

      <div className="yunyou-cards">
        <Link className="yunyou-card" to={YUNYOU_HREF} aria-label="打开云游 · 桂林两江四湖">
          <span className="yunyou-card-cover" aria-hidden="true">
            <img src="/images/yunyou-guilin-cover.webp" alt="" width="1600" height="900" loading="lazy" />
          </span>
          <span className="yunyou-card-kicker" aria-hidden="true">桂林 · 两江四湖</span>
          <strong className="yunyou-card-title">沿着水岸，慢慢看桂林</strong>
          <span className="yunyou-card-copy">从象鼻山到日月双塔，把熟悉的山水与旧城放进一张可以转动的地图。天色暗下来，城里的灯也会一盏盏亮起。</span>
          <span className="yunyou-card-cta">开始云游 →</span>
        </Link>

        <Link className="yunyou-card" to={XIAOYUAN_HREF} aria-label="打开 3D 场景 · 多美的夏日小院">
          <span className="yunyou-card-cover" aria-hidden="true">
            <img src="/images/xiaoyuan-cover.webp" alt="" width="1200" height="675" loading="lazy" />
          </span>
          <span className="yunyou-card-kicker" aria-hidden="true">3D 场景 · 云上小院</span>
          <strong className="yunyou-card-title">多美的夏日小院</strong>
          <span className="yunyou-card-copy">悬浮在云海上的小院：葡萄架、荷花缸、冰镇西瓜和打盹的猫。拖动时间，从午后一直看到灯笼亮起。</span>
          <span className="yunyou-card-cta">走进小院 →</span>
        </Link>
      </div>
    </HomeSectionHold>
  );
}
