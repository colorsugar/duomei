import { useEffect } from "react";

// 紅樓夢影（大观园）：courtyard-3d 项目 daguanyuan.html 的构建产物原样放在 public/hongloumeng-ying/（相对路径构建，整目录可搬）。
// 游戏自带配乐、整屏界面和左上角「冊」，不套 /xiaoyuan 那样的 iframe 外壳（返回链接会压住「冊」、站内播放器会和游戏配乐叠在一起），
// 这里直接整页跳到静态入口；浏览器返回键回多美。
export function DuomeiHongloumengPage() {
  useEffect(() => {
    document.title = "紅樓夢影 | DUOMEI";
    window.location.replace(`/hongloumeng-ying/index.html${window.location.search}${window.location.hash}`);
  }, []);
  return <main aria-label="紅樓夢影" style={{ position: "fixed", inset: 0, background: "#f5e7d2" }} />;
}
