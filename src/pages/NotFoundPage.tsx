import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="detail-page">
      <section className="detail-paper not-found-paper" data-reveal>
        <p className="eyebrow">Not Found</p>
        <h1>没有找到这份档案</h1>
        <p className="detail-excerpt">它可能还在整理中，或者已经从数字档案馆移走。</p>
        <Link className="button primary" to="/">
          回到首页
        </Link>
      </section>
    </main>
  );
}
