import { getAllItems } from "../../lib/cmsStore";

export function Dashboard() {
  const items = getAllItems();
  const count = (type: string) => items.filter((item) => item.type === type && item.status === "published").length;
  const cards = [
    ["Published Journeys", count("journey")],
    ["Published Photos", count("photo")],
    ["Published Notes", count("note")],
    ["Published Essays", count("essay")],
    ["Draft", items.filter((item) => item.status === "draft").length],
    ["Total Items", items.length],
  ];

  return (
    <div className="admin-panel">
      <p className="eyebrow">Dashboard</p>
      <h1>Archive Overview</h1>
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
