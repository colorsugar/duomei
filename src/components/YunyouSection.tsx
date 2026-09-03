import { HomeSectionHold } from "./HomeSectionHold";

const YUNYOU_HREF = "/yunyou/";

export function YunyouSection() {
  return (
    <HomeSectionHold id="yunyou" className="yunyou-section" ariaLabelledBy="yunyou-title">
      <header className="yunyou-heading">
        <h2 id="yunyou-title">云游</h2>
        <p>桂林两江四湖，按真实地图比例搭的 3D 小城。旋转、放大，顺着光标往景点飞近。</p>
      </header>

      <a className="yunyou-card" href={YUNYOU_HREF} aria-label="打开云游 · 桂林两江四湖 3D 景点地图">
        <span className="yunyou-card-cover" aria-hidden="true">
          <img src="/images/yunyou-guilin-cover.webp" alt="" width="1600" height="900" loading="lazy" />
        </span>
        <span className="yunyou-card-kicker" aria-hidden="true">Guilin · 1:1</span>
        <strong className="yunyou-card-title">两江四湖 · 3D 景点地图</strong>
        <span className="yunyou-card-copy">象鼻山、日月双塔、逍遥楼、靖江王城……点进去慢慢转。夜景整城窗灯也会亮。</span>
        <span className="yunyou-card-cta">进入地图 →</span>
      </a>
    </HomeSectionHold>
  );
}
