import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ZAOBAO_URL } from "../components/ZaobaoSection";

export function DuomeiZaobaoPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "今日早报 | DUOMEI";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="zaobao-page">
      <header className="zaobao-page-bar">
        <Link className="zaobao-page-back" to="/#zaobao" aria-label="返回首页">
          ← 返回首页
        </Link>
        <h1>早报</h1>
        <a className="zaobao-page-open" href={ZAOBAO_URL}>
          直接打开
        </a>
      </header>
      <iframe className="zaobao-frame" src={ZAOBAO_URL} title="今日早报" referrerPolicy="no-referrer" />
    </main>
  );
}
