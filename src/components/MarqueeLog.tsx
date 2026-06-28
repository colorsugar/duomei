const logs = [
  "2026.06 Osaka Life Log",
  "2026.05 Maizuru Fleet Festa",
  "2026.05 Tottori / Yonago Trip",
  "2026.04 Classical Chinese Notes",
  "2026.03 Care Work Vocabulary",
];

export function MarqueeLog() {
  const row = [...logs, ...logs, ...logs];

  return (
    <section className="log-strip" aria-label="Recent logs" data-reveal>
      <div className="marquee">
        <div className="marquee-track">
          {row.map((item, index) => (
            <span key={`${item}-${index}`}>{item}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
