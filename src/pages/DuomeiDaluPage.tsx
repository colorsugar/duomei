import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import artbook from "../content/daluArtbook.json";
import masterPrompt from "../content/daluMasterPrompt.md?raw";
import "../dalu.css";

const masterPromptHref = `data:text/markdown;charset=utf-8,${encodeURIComponent(masterPrompt)}`;

export function DuomeiDaluPage() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyPrompt = () => {
    navigator.clipboard.writeText(masterPrompt).then(() => setCopyState("copied"), () => setCopyState("failed"));
    window.setTimeout(() => setCopyState("idle"), 2400);
  };
  const copyLabel = { idle: "复制全文", copied: "已复制全文 ✓", failed: "复制失败，请下载" }[copyState];
  useEffect(() => {
    const previous = document.title;
    document.title = "大陆 · 奇幻大陆 | 多美小记";
    return () => { document.title = previous; };
  }, []);
  return <main className="dalu-page">
    <Link className="dalu-back" to="/#dalu">← 返回多美 · 大陆</Link>
    <header className="dalu-heading"><span className="dalu-eyebrow">DUOMEI / 奇幻大陆</span><h1>大陆</h1><p>山河决定路的方向，城市留下人的故事。<br />从七国走向烬月，把远行、宫堡与庄园放回各自的风土。</p></header>
    <section className="dalu-map-section" aria-labelledby="dalu-map-title">
      <div className="dalu-section-heading"><h2 id="dalu-map-title">地图</h2><span>七国与烬月 · 宫堡庄园已收录</span></div>
      <Link to="/dalu/map" className="dalu-map-card">
        <img src="/atlas/v6/assets/gallery/connection-gates.webp" alt="双港海门的山海、河道与港城" width="1536" height="1024" />
        <span className="dalu-map-caption"><strong>从一张地图，走进每个地方</strong><span>点选国家、城池与栖地，在地点说明旁看对应图版。</span><span className="dalu-cta">打开交互地图 →</span></span>
      </Link>
      <p className="dalu-note">在地图中选择“宫堡庄园”，可查看金穗王宫、镜湖堡、晴汀庄园等 13 处建筑与聚落的落点、营造和往来路线。</p>
    </section>
    <section className="dalu-book-section" aria-labelledby="dalu-book-title">
      <img src="/atlas/v6/assets/architecture/lake-manor.webp" alt="湖岸田野与晴汀庄园" width="1536" height="1024" loading="lazy" />
      <div><span className="dalu-eyebrow">艺术图集 / 扩充版</span><h2 id="dalu-book-title">把这片大陆，带在身边</h2><p>{artbook.pageCount} 页，{artbook.plateCount} 幅图版，{artbook.chapterCount} 个章节。原有地理风物与新增宫堡庄园合为一册，图片和地点说明同页相伴。</p><p>PDF 目录可直接跳转图版，每页可返回目录，也可点击链接在地图中定位。</p><div className="dalu-actions"><a className="dalu-button" href={artbook.pdf} download="奇幻大陆-艺术图集.pdf">下载完整 PDF ↓</a><a href={artbook.pdf} target="_blank" rel="noopener noreferrer">在线打开 PDF ↗</a><Link to="/guyu/hanhai-realms-artbook">翻阅地理风物原册 →</Link></div><span className="dalu-note">PDF · {(artbook.bytes / 1024 / 1024).toFixed(1)} MB · 含 14 幅新增建筑图版</span></div>
    </section>
    <section className="dalu-chapters" aria-labelledby="dalu-chapters-title"><div className="dalu-section-heading"><h2 id="dalu-chapters-title">循章而行</h2><span>点击章节，打开 PDF 对应位置</span></div><div className="dalu-chapter-grid">{artbook.chapters.map((chapter, index) => <a key={chapter.title} href={`${artbook.pdf}#page=${chapter.page}`} target="_blank" rel="noopener noreferrer"><span>{String(index + 1).padStart(2, "0")}</span><strong>{chapter.title}</strong><span>{chapter.page} 页 ↗</span></a>)}</div></section>
    <section className="dalu-prompt-section" aria-labelledby="dalu-prompt-title">
      <div className="dalu-section-heading"><h2 id="dalu-prompt-title">生成总提示词</h2><span>整合版 · 世界地理逻辑 × 七国格局 × 魔法生态 × 战争地理 × 建筑与交互</span></div>
      <p className="dalu-prompt-lead">这片大陆的卫星地图不是随手摆放的：先板块、山脉与洋流，再气候、河流与生态，最后才有城市、国家与战争。二十八节总提示词把这条因果链完整写下，可直接复制去生成或续写。</p>
      <div className="dalu-actions"><button type="button" className="dalu-button" onClick={copyPrompt}>{copyLabel}</button><a href={masterPromptHref} download="奇幻大陆-卫星地图总提示词.md">下载 Markdown ↓</a></div>
      <details className="dalu-prompt"><summary>展开阅读全文</summary><pre>{masterPrompt}</pre></details>
    </section>
  </main>;
}
