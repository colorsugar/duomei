import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { GuyuFlipbook } from "../components/GuyuFlipbook";
import { GuyuAccessGate } from "../components/GuyuAccessGate";
import { getGuyuBook } from "../content/guyuBooks";

export function DuomeiGuyuReaderPage() {
  const { bookId } = useParams();
  const book = getGuyuBook(bookId);
  const [isBookOpen, setIsBookOpen] = useState(false);

  useEffect(() => {
    if (!book) return;
    const previousTitle = document.title;
    document.title = `${book.title} | 故语`;
    return () => {
      document.title = previousTitle;
    };
  }, [book]);

  useEffect(() => {
    const reloadAfterHistoryExit = () => window.location.reload();
    window.addEventListener("popstate", reloadAfterHistoryExit);
    return () => window.removeEventListener("popstate", reloadAfterHistoryExit);
  }, []);

  if (!book) return <Navigate to="/guyu" replace />;

  const reader = (
    <main className={`guyu-reader-page${isBookOpen ? " is-book-open" : ""}`}>
      <header className="guyu-reader-heading">
        <Link
          className="guyu-reader-back"
          to="/guyu"
          reloadDocument
          aria-label="返回故语"
          aria-hidden={isBookOpen}
          tabIndex={isBookOpen ? -1 : 0}
          title="返回故语"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5 8 12l7 7" />
          </svg>
          <span>返回故语</span>
        </Link>
        <div className="guyu-visually-hidden">
          <h1>{book.title}</h1>
          <p>{book.kind}{book.author ? ` · ${book.author}` : ""}</p>
        </div>
      </header>
      <GuyuFlipbook book={book} onOpenChange={setIsBookOpen} />
    </main>
  );

  return book.access === "class-gated" ? <GuyuAccessGate>{reader}</GuyuAccessGate> : reader;
}
