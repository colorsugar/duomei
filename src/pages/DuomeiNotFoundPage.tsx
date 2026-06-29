import { Link } from "react-router-dom";

export function DuomeiNotFoundPage() {
  return (
    <main className="duomei-about">
      <p>NOT FOUND</p>
      <h1>旅行中……页面不存在</h1>
      <Link to="/">返回首页</Link>
    </main>
  );
}
