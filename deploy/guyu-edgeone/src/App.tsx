import { useState } from "react";
import { GuyuAccessGate } from "./components/GuyuAccessGate";
import { GuyuFlipbook } from "./components/GuyuFlipbook";
import { guyuBooks } from "./content/guyuBooks";

const book = guyuBooks[0];

export function App() {
  const [isBookOpen, setIsBookOpen] = useState(false);

  const lockBook = async () => {
    try {
      await fetch("/api/guyu-auth", { method: "DELETE", credentials: "same-origin" });
    } finally {
      window.location.reload();
    }
  };

  return (
    <GuyuAccessGate>
      <main className={`guyu-reader-page${isBookOpen ? " is-book-open" : ""}`}>
        <header className="guyu-standalone-header">
          <div>
            <p>故语 · 同学录</p>
            <h1>{book.title}</h1>
          </div>
          <button type="button" onClick={() => void lockBook()}>锁上旧册</button>
        </header>
        <GuyuFlipbook book={book} onOpenChange={setIsBookOpen} />
      </main>
    </GuyuAccessGate>
  );
}
