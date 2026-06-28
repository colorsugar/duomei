type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  intro?: string;
};

export function SectionHeading({ eyebrow, title, intro }: SectionHeadingProps) {
  return (
    <div className="section-heading" data-reveal>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {intro ? <p className="section-intro">{intro}</p> : null}
    </div>
  );
}
