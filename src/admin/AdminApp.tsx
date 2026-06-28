import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { AdminLogin } from "./components/AdminLogin";
import { ContentEditor } from "./components/ContentEditor";
import { ContentTable } from "./components/ContentTable";
import { Dashboard } from "./components/Dashboard";
import { ProfileEditor } from "./components/ProfileEditor";
import { SettingsEditor } from "./components/SettingsEditor";
import { isAdminLoggedIn } from "../lib/cmsStore";

function Protected({ children }: { children: React.ReactNode }) {
  return isAdminLoggedIn() ? children : <Navigate to="/admin/login" replace />;
}

export function AdminApp() {
  return (
    <Routes>
      <Route path="login" element={<AdminLogin />} />
      <Route
        path="/*"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="journeys" element={<ContentTable type="journey" />} />
        <Route path="journeys/new" element={<ContentEditor type="journey" />} />
        <Route path="journeys/:id" element={<ContentEditor type="journey" />} />
        <Route path="photos" element={<ContentTable type="photo" />} />
        <Route path="photos/new" element={<ContentEditor type="photo" />} />
        <Route path="photos/:id" element={<ContentEditor type="photo" />} />
        <Route path="notes" element={<ContentTable type="note" />} />
        <Route path="notes/new" element={<ContentEditor type="note" />} />
        <Route path="notes/:id" element={<ContentEditor type="note" />} />
        <Route path="essays" element={<ContentTable type="essay" />} />
        <Route path="essays/new" element={<ContentEditor type="essay" />} />
        <Route path="essays/:id" element={<ContentEditor type="essay" />} />
        <Route path="ai-wall" element={<ContentTable type="ai-wall" />} />
        <Route path="ai-wall/new" element={<ContentEditor type="ai-wall" />} />
        <Route path="ai-wall/:id" element={<ContentEditor type="ai-wall" />} />
        <Route path="profile" element={<ProfileEditor />} />
        <Route path="settings" element={<SettingsEditor />} />
      </Route>
    </Routes>
  );
}
