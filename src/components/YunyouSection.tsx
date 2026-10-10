import { HomeSectionHold } from "./HomeSectionHold";
import { Link } from "react-router-dom";
import { SectionTitle } from "./SectionTitle";

const YUNYOU_HREF = "/yunyou-map";

type Place = { href: string; cover: string; kicker: string; title: string; copy: string; cta: string; label: string; tone?: string };

// 云游: four places to walk into, laid out as a set of travel-journal plates (one image
// treatment, one baseline), not as cards.
const PLACES: Place[] = [
  { href: YUNYOU_HREF, cover: "/images/yunyou-guilin-cover.webp", kicker: "桂林 · 两江四湖", title: "沿水看桂林", copy: "山水连着旧城，灯火渐次亮起。", cta: "游桂林", label: "打开云游 · 桂林两江四湖" },
  { href: "/xiaoyuan", cover: "/images/xiaoyuan-cover.webp", kicker: "云上 · 夏日小院", title: "多美的夏日小院", copy: "葡萄架下有猫，院外是晚霞。", cta: "进小院", label: "打开 3D 场景 · 多美的夏日小院", tone: "is-sunset" },
  { href: "/jiangnan", cover: "/images/jiangnan-cover.webp", kicker: "江南 · 园林一隅", title: "诗语江南", copy: "绕池走一圈，听雨落在荷叶上。", cta: "入园", label: "打开 3D 场景 · 诗语江南" },
  { href: "/hongloumeng-ying", cover: "/images/hongloumeng-cover.webp", kicker: "大观园 · 3D 游园", title: "紅樓夢影", copy: "依《红楼梦》原文复原的大观园。", cta: "游大观园", label: "打开 3D 游戏 · 紅樓夢影" },
];

export function YunyouSection() {
  return (
    <HomeSectionHold id="yunyou" className="yunyou-section" ariaLabelledBy="yunyou-title">
      <SectionTitle
        id="yunyou-title"
        accent="yunyou"
        index="07"
        kicker="Wander · 四处可以停留的风景"
        title="云游"
        lede="循着山水与灯火：桂林的两江四湖、云上的夏日小院、荷叶上落雨的江南园子、书页里走出来的大观园。"
        link={{ to: YUNYOU_HREF, label: "开始云游" }}
        className="yunyou-heading"
      />

      <div className="yunyou-plates">
        {PLACES.map((p) => (
          <Link key={p.href} className={`yunyou-card yunyou-plate ${p.tone ?? ""}`} to={p.href} aria-label={p.label}>
            <span className="yunyou-plate-image" aria-hidden="true">
              <img src={p.cover} alt="" width="1200" height="750" loading="lazy" />
            </span>
            <span className="yunyou-plate-text">
              <span className="yunyou-plate-kicker">{p.kicker}</span>
              <strong className="yunyou-plate-title">{p.title}</strong>
              <span className="yunyou-plate-copy">{p.copy}</span>
              <span className="yunyou-plate-cta">{p.cta} <span aria-hidden="true">→</span></span>
            </span>
          </Link>
        ))}
      </div>
    </HomeSectionHold>
  );
}
