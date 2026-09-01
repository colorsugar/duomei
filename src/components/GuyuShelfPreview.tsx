import { Link } from "react-router-dom";
import { guyuBooks } from "../content/guyuBooks";

export function GuyuShelfPreview() {
  const book = guyuBooks[0];

  return (
    <section className="guyu-home-shelf" aria-labelledby="guyu-home-shelf-title">
      <header className="guyu-home-shelf-heading">
        <h2 id="guyu-home-shelf-title">故语</h2>
        <p>把旧日收好，等后来的人翻阅。</p>
      </header>

      <Link className="guyu-home-work" to="/guyu" aria-label={`前往故语，翻阅《${book.title}》`}>
        <span className="guyu-home-book" aria-hidden="true">
          <img
            src={book.previewCoverSrc}
            width="1100"
            height="1684"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </span>

        <span className="guyu-home-work-copy">
          <span className="guyu-home-work-kind">同学录 · 旧册</span>
          <strong>{book.title}</strong>
          <span>{book.description}</span>
          <span className="guyu-home-work-open">翻开这一本</span>
        </span>
      </Link>

      <p className="guyu-home-shelf-note">有些话，只适合留在纸页之间。</p>
    </section>
  );
}
