import { useEffect } from "react";
import { Link } from "react-router-dom";
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
    <main className="guyu-library-page">
      <header className="guyu-library-intro">
        <h1>故语</h1>
        <p>把旧日收好，等后来的人翻阅。</p>
      </header>

      <section className="guyu-shelf-section" aria-labelledby="guyu-shelf-title">
        <h2 id="guyu-shelf-title" className="guyu-visually-hidden">藏书</h2>
        {["旧册", "新说"].map((chapter) => {
          const books = guyuBooks.filter((book) => book.chapter === chapter);
          if (!books.length) return null;
          return (
            <section className="guyu-shelf-chapter" key={chapter} aria-labelledby={`guyu-chapter-${chapter}`}>
              <h3 id={`guyu-chapter-${chapter}`}>{chapter}</h3>
              <div className="guyu-shelf" role="list">
                {books.map((book) => (
                  <article className="guyu-book-card" role="listitem" key={book.id}>
                    <Link className="guyu-book-link" to={`/guyu/${book.id}`} aria-label={`翻开《${book.title}》`}>
                      <span className="guyu-book-cover" aria-hidden="true">
                        <img src={book.previewCoverSrc} width="1100" height="1684" alt="" decoding="async" fetchPriority="high" />
                        <span className="guyu-book-spine" />
                      </span>
                      <span className="guyu-book-meta">
                        <span className="guyu-book-kind">{book.kind}{book.author ? ` · ${book.author}` : ""}</span>
                        <strong className="guyu-title-phrases" aria-label={book.title}>
                          {book.title.split(/\s+/u).map((part) => <span key={part}>{part}</span>)}
                        </strong>
                        <span>{book.description}</span>
                        <span className="guyu-book-open">翻阅</span>
                      </span>
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          );
        })}
        <p className="guyu-shelf-note">有些话，只适合留在纸页之间。</p>
      </section>
    </main>
  );
}
