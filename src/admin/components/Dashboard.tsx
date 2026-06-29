import { getAllItems } from "../../lib/cmsStore";

export function Dashboard() {
  const items = getAllItems();
  const count = (type: string) => items.filter((item) => item.type === type && item.status === "published").length;
  const cards = [
    ["已发布旅程", count("journey")],
    ["已发布摄影", count("photo")],
    ["已发布古文", count("note")],
    ["已发布文章", count("essay")],
    ["草稿", items.filter((item) => item.status === "draft").length],
    ["全部内容", items.length],
  ];

  return (
    <div className="admin-panel">
      <p className="eyebrow">仪表盘</p>
      <h1>档案馆概览</h1>
      <div className="stat-grid">
        {cards.map(([label, value]) => (
          <article className="stat-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
    </div>
  );
}
