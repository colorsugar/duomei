import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";

export function AdminLayout() {
  return (
    <main className="admin-shell">
      <AdminSidebar />
      <section className="admin-main">
        <Outlet />
      </section>
    </main>
  );
}
