import { FormEvent, useEffect, useState } from "react";
import type { ContentItem, Profile, Settings } from "../lib/cmsTypes";

export type DrawerMode = "content" | "hero-settings" | "contact-settings" | "profile";

type FrontEditDrawerProps = {
  mode: DrawerMode | null;
  item: ContentItem | null;
  profile: Profile;
  settings: Settings;
  onClose: () => void;
  onSaveContent: (item: ContentItem) => void;
  onSaveProfile: (profile: Profile) => void;
  onSaveSettings: (settings: Settings) => void;
};

const typeName = {
  journey: "旅程",
  photo: "摄影",
  note: "古文",
  essay: "文章",
  "ai-wall": "留言",
};

export function FrontEditDrawer({
  mode,
  item,
  profile,
  settings,
  onClose,
  onSaveContent,
  onSaveProfile,
  onSaveSettings,
}: FrontEditDrawerProps) {
  const [draftItem, setDraftItem] = useState<ContentItem | null>(item);
  const [draftProfile, setDraftProfile] = useState(profile);
  const [draftSettings, setDraftSettings] = useState(settings);

  useEffect(() => {
    setDraftItem(item);
    setDraftProfile(profile);
    setDraftSettings(settings);
  }, [item, profile, settings, mode]);

  if (!mode) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (mode === "content" && draftItem) onSaveContent(draftItem);
    if (mode === "profile") onSaveProfile(draftProfile);
    if (mode === "hero-settings" || mode === "contact-settings") onSaveSettings(draftSettings);
  };

  return (
    <div className="front-drawer-layer">
      <button className="front-drawer-backdrop" type="button" aria-label="关闭编辑面板" onClick={onClose} />
      <aside className="front-edit-drawer">
        <div className="drawer-title-row">
          <div>
            <p className="eyebrow">前台编辑</p>
            <h2>
              {mode === "content" && draftItem ? `编辑${typeName[draftItem.type]}` : null}
              {mode === "hero-settings" ? "编辑首页信息" : null}
              {mode === "contact-settings" ? "编辑联系信息" : null}
              {mode === "profile" ? "编辑个人资料" : null}
            </h2>
          </div>
          <button className="front-pill" type="button" onClick={onClose}>
            关闭
          </button>
        </div>

        <form className="front-drawer-form" onSubmit={submit}>
          {mode === "content" && draftItem ? (
            <>
              <label>
                标题
                <input value={draftItem.title} onChange={(event) => setDraftItem({ ...draftItem, title: event.target.value })} />
              </label>
              <label>
                副标题
                <input value={draftItem.subtitle ?? ""} onChange={(event) => setDraftItem({ ...draftItem, subtitle: event.target.value })} />
              </label>
              <label>
                Slug
                <input value={draftItem.slug} onChange={(event) => setDraftItem({ ...draftItem, slug: event.target.value })} />
              </label>
              <label>
                日期
                <input value={draftItem.date} onChange={(event) => setDraftItem({ ...draftItem, date: event.target.value })} />
              </label>
              <label>
                地点
                <input value={draftItem.location ?? ""} onChange={(event) => setDraftItem({ ...draftItem, location: event.target.value })} />
              </label>
              <label>
                分类
                <input value={draftItem.category ?? ""} onChange={(event) => setDraftItem({ ...draftItem, category: event.target.value })} />
              </label>
              <label>
                标签
                <input value={draftItem.tags.join(", ")} onChange={(event) => setDraftItem({ ...draftItem, tags: event.target.value.split(",") })} />
              </label>
              <label>
                摘要
                <textarea value={draftItem.excerpt} onChange={(event) => setDraftItem({ ...draftItem, excerpt: event.target.value })} />
              </label>
              <label>
                正文
                <textarea rows={7} value={draftItem.body} onChange={(event) => setDraftItem({ ...draftItem, body: event.target.value })} />
              </label>
              <label>
                封面图地址
                <input value={draftItem.coverImageUrl ?? ""} onChange={(event) => setDraftItem({ ...draftItem, coverImageUrl: event.target.value })} />
              </label>
              <label>
                图集地址
                <textarea
                  value={(draftItem.galleryImages ?? []).join(", ")}
                  onChange={(event) => setDraftItem({ ...draftItem, galleryImages: event.target.value.split(",") })}
                />
              </label>
            </>
          ) : null}

          {mode === "hero-settings" ? (
            <>
              <label>
                小标题
                <input value={draftSettings.heroEyebrow} onChange={(event) => setDraftSettings({ ...draftSettings, heroEyebrow: event.target.value })} />
              </label>
              <label>
                主标题
                <input value={draftSettings.heroTitle} onChange={(event) => setDraftSettings({ ...draftSettings, heroTitle: event.target.value })} />
              </label>
              <label>
                副标题
                <textarea value={draftSettings.heroDescription} onChange={(event) => setDraftSettings({ ...draftSettings, heroDescription: event.target.value })} />
              </label>
              <label>
                按钮文字一
                <input value={draftSettings.primaryButtonText} onChange={(event) => setDraftSettings({ ...draftSettings, primaryButtonText: event.target.value })} />
              </label>
              <label>
                按钮文字二
                <input value={draftSettings.secondaryButtonText} onChange={(event) => setDraftSettings({ ...draftSettings, secondaryButtonText: event.target.value })} />
              </label>
            </>
          ) : null}

          {mode === "contact-settings" ? (
            <>
              <label>
                联系文案
                <textarea value={draftSettings.contactText} onChange={(event) => setDraftSettings({ ...draftSettings, contactText: event.target.value })} />
              </label>
              <label>
                Instagram
                <input value={draftSettings.instagramUrl} onChange={(event) => setDraftSettings({ ...draftSettings, instagramUrl: event.target.value })} />
              </label>
              <label>
                Email
                <input value={draftSettings.email} onChange={(event) => setDraftSettings({ ...draftSettings, email: event.target.value })} />
              </label>
              <label>
                GitHub
                <input value={draftSettings.githubUrl} onChange={(event) => setDraftSettings({ ...draftSettings, githubUrl: event.target.value })} />
              </label>
            </>
          ) : null}

          {mode === "profile" ? (
            <>
              <label>
                显示名称
                <input value={draftProfile.displayName} onChange={(event) => setDraftProfile({ ...draftProfile, displayName: event.target.value })} />
              </label>
              <label>
                简介
                <textarea rows={7} value={draftProfile.bio} onChange={(event) => setDraftProfile({ ...draftProfile, bio: event.target.value })} />
              </label>
              <label>
                所在地
                <input value={draftProfile.location} onChange={(event) => setDraftProfile({ ...draftProfile, location: event.target.value })} />
              </label>
              <label>
                出身地
                <input value={draftProfile.origin} onChange={(event) => setDraftProfile({ ...draftProfile, origin: event.target.value })} />
              </label>
              <label>
                职业
                <input value={draftProfile.occupation} onChange={(event) => setDraftProfile({ ...draftProfile, occupation: event.target.value })} />
              </label>
              <label>
                标签
                <input value={draftProfile.interests.join(", ")} onChange={(event) => setDraftProfile({ ...draftProfile, interests: event.target.value.split(",").map((value) => value.trim()) })} />
              </label>
              <label>
                头像 URL
                <input value={draftProfile.avatarUrl} onChange={(event) => setDraftProfile({ ...draftProfile, avatarUrl: event.target.value })} />
              </label>
            </>
          ) : null}

          <div className="drawer-actions">
            <button className="button primary" type="submit">
              保存
            </button>
            <button className="button secondary" type="button" onClick={onClose}>
              取消
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
