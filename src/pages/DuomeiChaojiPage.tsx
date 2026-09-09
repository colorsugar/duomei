import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import masterPrompt from "../content/chaojiMasterPrompt.md?raw";
import "../dalu.css";

const masterPromptHref = `data:text/markdown;charset=utf-8,${encodeURIComponent(masterPrompt)}`;

export function DuomeiChaojiPage() {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const copyPrompt = () => {
    navigator.clipboard.writeText(masterPrompt).then(() => setCopyState("copied"), () => setCopyState("failed"));
    window.setTimeout(() => setCopyState("idle"), 2400);
  };
  const copyLabel = { idle: "复制全文", copied: "已复制全文 ✓", failed: "复制失败，请下载" }[copyState];
  useEffect(() => {
    const previous = document.title;
    document.title = "超级大陆 | 多美小记";
    return () => { document.title = previous; };
  }, []);
  return <main className="dalu-page">
    <Link className="dalu-back" to="/">← 返回多美</Link>
    <header className="dalu-heading">
      <span className="dalu-eyebrow">DUOMEI / 超级大陆</span>
      <h1>超级大陆</h1>
      <p>与奇幻大陆不是同一套世界。这里按先自然后文明的因果链立户，不覆盖现网 V6。</p>
    </header>
    <section className="dalu-map-section" aria-labelledby="chaoji-map-title">
      <div className="dalu-section-heading"><h2 id="chaoji-map-title">骨架地图</h2><span>独立体系 · 不覆盖奇幻大陆</span></div>
      <Link to="/chaoji/map" className="dalu-map-card">
        <span className="dalu-map-caption"><strong>打开超级大陆交互地图</strong><span>国家、山脉、河流、海沟与战争走廊可开关。点击地标查看地理原因。</span><span className="dalu-cta">进入地图 →</span></span>
      </Link>
    </section>
    <section className="dalu-prompt-section" aria-labelledby="chaoji-prompt-title">
      <div className="dalu-section-heading"><h2 id="chaoji-prompt-title">生成总提示词</h2><span>超级大陆 · 二十八节</span></div>
      <p className="dalu-prompt-lead">这份提示词只属于超级大陆，不再挂在奇幻大陆专题页。</p>
      <div className="dalu-actions"><button type="button" className="dalu-button" onClick={copyPrompt}>{copyLabel}</button><a href={masterPromptHref} download="超级大陆-卫星地图总提示词.md">下载 Markdown ↓</a></div>
      <details className="dalu-prompt"><summary>展开阅读全文</summary><pre>{masterPrompt}</pre></details>
    </section>
  </main>;
}
