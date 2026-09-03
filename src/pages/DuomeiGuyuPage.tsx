import { useEffect } from "react";
import { Link } from "react-router-dom";
import { GuyuAccessGate } from "../components/GuyuAccessGate";
import { guyuBooks } from "../content/guyuBooks";

export function DuomeiGuyuPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "故语 | 多美小记";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <GuyuAccessGate>
    <main className="guyu-library-page">
      <header className="guyu-library-intro">
        <h1>故语</h1>
        <p>把旧日收好，等后来的人翻阅。</p>
      </header>

      <section className="guyu-shelf-section" aria-labelledby="guyu-shelf-title">
        <h2 id="guyu-shelf-title" className="guyu-visually-hidden">藏书</h2>
        <div className="guyu-shelf" role="list">
          {guyuBooks.map((book) => (
            <article className="guyu-book-card" role="listitem" key={book.id}>
              <Link className="guyu-book-link" to={`/guyu/${book.id}`} aria-label={`翻开《${book.title}》`}>
                <span className="guyu-book-cover" aria-hidden="true">
                  <img
                    src={book.coverSrc}
                    width="1100"
                    height="1684"
                    alt=""
                    decoding="async"
                    fetchPriority="high"
                  />
                  <span className="guyu-book-spine" />
                </span>
                <span className="guyu-book-meta">
                  <span className="guyu-book-kind">{book.kind === "新说" ? "新说 · 新册" : `${book.kind} · 旧册`}</span>
                  <strong>{book.title}</strong>
                  <span>{book.description}</span>
                  <span className="guyu-book-open">翻阅</span>
                </span>
              </Link>
            </article>
          ))}
        </div>
        <p className="guyu-shelf-note">有些话，只适合留在纸页之间。</p>
      </section>
    </main>
    </GuyuAccessGate>
  );
}
