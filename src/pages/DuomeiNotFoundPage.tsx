import { useEffect } from "react";
import { Link } from "react-router-dom";
import { DuomeiCompanion } from "../components/companion";
import { sectionAccents } from "../lib/sectionAccents";

// 404: three outlined "404"s in section hues drift against each other, the lost-page line underneath,
// and the ten section dots as a way back in. Everything is CSS; the drift is a cheap transform loop.
const DOTS = sectionAccents.filter((accent) => accent.id !== "home");
const hrefFor = (id: string) => (id === "xunji" ? "/xunji" : id === "skills" ? "/skills" : `/#${id}`);

export function DuomeiNotFoundPage() {
  useEffect(() => {
    const previous = document.title;
    document.title = "这一页走丢了 | DUOMEI";
    return () => {
      document.title = previous;
    };
  }, []);

  return (
    <main className="duomei-lost" aria-labelledby="duomei-lost-title">
      <div className="duomei-lost-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <p className="duomei-lost-kicker">
        <span>Not Found</span> · 旅行中
      </p>
      <div className="duomei-lost-four" aria-hidden="true">
        <b>404</b>
        <b>404</b>
        <b>404</b>
      </div>
      <h1 id="duomei-lost-title" className="duomei-lost-title">
        这一页走丢了
      </h1>
      <p className="duomei-lost-lede">地址可能打错了，或者这页已经搬去了别处。挑一个颜色，从那里重新出发。</p>
      <nav className="duomei-lost-dots" aria-label="回到各板块">
        {DOTS.map((accent, index) => (
          <a key={accent.id} href={hrefFor(accent.id)} style={{ "--dot": `var(--accent-${accent.id})`, "--i": index } as React.CSSProperties}>
            <i />
            <span>{accent.label}</span>
          </a>
        ))}
      </nav>
      <Link className="duomei-lost-home" to="/">
        回首页
      </Link>
      <DuomeiCompanion placement="not-found" />
    </main>
  );
}
