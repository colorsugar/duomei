import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutAdmin } from "../../lib/cmsStore";

const links = [
  ["仪表盘", "/admin"],
  ["旅程", "/admin/journeys"],
  ["摄影", "/admin/photos"],
  ["古文札记", "/admin/notes"],
  ["文章", "/admin/essays"],
  ["AI留言墙", "/admin/ai-wall"],
  ["个人资料", "/admin/profile"],
  ["网站设置", "/admin/settings"],
];

export function AdminSidebar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = () => {
    logoutAdmin();
    navigate("/admin/login");
  };

  return (
    <>
      <button className="admin-drawer-toggle" type="button" onClick={() => setOpen((value) => !value)}>
        {open ? "关闭菜单" : "后台菜单"}
      </button>
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div>
          <strong>TAMI</strong>
          <span>数字档案馆管理后台</span>
        </div>
        <nav>
          {links.map(([label, href]) => (
            <NavLink key={href} to={href} onClick={() => setOpen(false)} end={href === "/admin"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <a className="admin-view-site" href="/">
          查看网站
        </a>
        <button type="button" onClick={logout}>
          退出登录
        </button>
      </aside>
    </>
  );
}
