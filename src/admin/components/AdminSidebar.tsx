import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutAdmin } from "../../lib/cmsStore";

const links = [
  ["Dashboard", "/admin"],
  ["Journeys", "/admin/journeys"],
  ["Photography", "/admin/photos"],
  ["Classical Notes", "/admin/notes"],
  ["Essays", "/admin/essays"],
  ["AI Wall", "/admin/ai-wall"],
  ["Profile", "/admin/profile"],
  ["Settings", "/admin/settings"],
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
        {open ? "Close Admin" : "Admin Menu"}
      </button>
      <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
        <div>
          <strong>TAMI</strong>
          <span>Digital Archive CMS</span>
        </div>
        <nav>
          {links.map(([label, href]) => (
            <NavLink key={href} to={href} onClick={() => setOpen(false)} end={href === "/admin"}>
              {label}
            </NavLink>
          ))}
        </nav>
        <a className="admin-view-site" href="/">
          View Site
        </a>
        <button type="button" onClick={logout}>
          Logout
        </button>
      </aside>
    </>
  );
}
