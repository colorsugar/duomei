import { Link } from "react-router-dom";
import { HomeSectionHold } from "./HomeSectionHold";
import "../dalu.css";
import { SectionTitle } from "./SectionTitle";

export function DaluSection() {
  return <HomeSectionHold id="dalu" className="dalu-home" ariaLabelledBy="dalu-title">
    <SectionTitle
      id="dalu-title"
      accent="dalu"
      index="06"
      kicker="The Continent · 山海 · 城邦 · 想象"
      title="大陆"
      lede="沿粮河走进王城，越过雪岭，去远海听一个尚未讲完的故事。"
      link={{ to: "/dalu", label: "进入大陆" }}
      className="dalu-heading"
    />
    <Link to="/dalu" className="dalu-home-card" aria-label="进入大陆专题">
      <img src="/atlas/v6/assets/architecture/aivernor-panorama.webp" alt="粮河、石桥与台地上的金穗王宫" width="1536" height="1024" loading="lazy" />
      <span className="dalu-home-caption"><span className="dalu-eyebrow">奇幻大陆</span><strong>让想象，落在山河之间</strong><span>交互地图、地理风物与宫堡庄园，收在同一片大陆。</span><span className="dalu-cta">进入专题 →</span></span>
    </Link>
  </HomeSectionHold>;
}
