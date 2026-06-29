import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ContentItem, ContentType, Profile, Settings } from "../lib/cmsTypes";
import {
  CMS_UPDATED_EVENT,
  deleteItem,
  getAllItems,
  getProfile,
  getSettings,
  isAdminLoggedIn,
  logoutAdmin,
  saveProfile,
  saveSettings,
  upsertItem,
} from "../lib/cmsStore";
import { slugify } from "../lib/slugify";
import { FrontEditDrawer, type DrawerMode } from "./FrontEditDrawer";

type InlineEditContextValue = {
  isLoggedIn: boolean;
  editMode: boolean;
  drawerOpen: boolean;
  refreshKey: number;
  toggleEditMode: () => void;
  openContentEditor: (type: ContentType, item?: ContentItem) => void;
  openSettingsEditor: (mode: "hero" | "contact") => void;
  openProfileEditor: () => void;
  removeContent: (id: string) => void;
  logout: () => void;
  refresh: () => void;
};

const InlineEditContext = createContext<InlineEditContextValue | null>(null);

function createBlankItem(type: ContentType): ContentItem {
  const createdAt = new Date().toISOString();
  return {
    id: `${type}-${Date.now()}`,
    slug: "",
    type,
    title: "",
    subtitle: "",
    date: "2026",
    location: "",
    category: "",
    tags: [],
    excerpt: "",
    body: "",
    coverImageUrl: "",
    galleryImages: [],
    status: "published",
    showOnHome: true,
    featured: false,
    order: getAllItems().filter((item) => item.type === type).length + 1,
    createdAt,
    updatedAt: createdAt,
  };
}

export function InlineEditProvider({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [drawerMode, setDrawerMode] = useState<DrawerMode | null>(null);
  const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(() => isAdminLoggedIn());

  const refresh = () => {
    setIsLoggedIn(isAdminLoggedIn());
    setRefreshKey((value) => value + 1);
  };

  useEffect(() => {
    window.addEventListener(CMS_UPDATED_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CMS_UPDATED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("front-editing", editMode);
    document.body.classList.toggle("drawer-open", !!drawerMode);
    return () => {
      document.body.classList.remove("front-editing");
      document.body.classList.remove("drawer-open");
    };
  }, [editMode, drawerMode]);

  const value = useMemo<InlineEditContextValue>(
    () => ({
      isLoggedIn,
      editMode,
      drawerOpen: !!drawerMode,
      refreshKey,
      toggleEditMode: () => setEditMode((current) => !current),
      openContentEditor: (type, item) => {
        setEditingItem(item ?? createBlankItem(type));
        setDrawerMode("content");
      },
      openSettingsEditor: (mode) => {
        setEditingItem(null);
        setDrawerMode(mode === "hero" ? "hero-settings" : "contact-settings");
      },
      openProfileEditor: () => {
        setEditingItem(null);
        setDrawerMode("profile");
      },
      removeContent: (id) => {
        setPendingDeleteId(id);
      },
      logout: () => {
        logoutAdmin();
        setEditMode(false);
      },
      refresh,
    }),
    [drawerMode, editMode, isLoggedIn, refreshKey],
  );

  const saveContent = (item: ContentItem) => {
    const slug = item.slug.trim() || slugify(item.title, item.type);
    upsertItem({
      ...item,
      slug,
      tags: item.tags.map((tag) => tag.trim()).filter(Boolean),
      galleryImages: item.galleryImages?.map((url) => url.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    });
    setDrawerMode(null);
    refresh();
  };

  const saveFrontProfile = (profile: Profile) => {
    saveProfile(profile);
    setDrawerMode(null);
    refresh();
  };

  const saveFrontSettings = (settings: Settings) => {
    saveSettings(settings);
    setDrawerMode(null);
    refresh();
  };

  return (
    <InlineEditContext.Provider value={value}>
      {editMode ? <div className="edit-mode-banner">编辑模式已开启：你可以直接修改网页内容</div> : null}
      {children}
      {pendingDeleteId ? (
        <div className="front-delete-confirm">
          <span>确定删除这条内容吗？</span>
          <button type="button" onClick={() => { deleteItem(pendingDeleteId); setPendingDeleteId(null); refresh(); }}>
            确认删除
          </button>
          <button type="button" onClick={() => setPendingDeleteId(null)}>
            取消
          </button>
        </div>
      ) : null}
      <FrontEditDrawer
        mode={drawerMode}
        item={editingItem}
        profile={getProfile()}
        settings={getSettings()}
        onClose={() => setDrawerMode(null)}
        onSaveContent={saveContent}
        onSaveProfile={saveFrontProfile}
        onSaveSettings={saveFrontSettings}
      />
    </InlineEditContext.Provider>
  );
}

export function useInlineEdit() {
  const context = useContext(InlineEditContext);
  if (!context) {
    throw new Error("useInlineEdit must be used inside InlineEditProvider");
  }
  return context;
}
