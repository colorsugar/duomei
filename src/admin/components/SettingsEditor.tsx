import { FormEvent, useState } from "react";
import { getSettings, saveSettings } from "../../lib/cmsStore";

export function SettingsEditor() {
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);
  const fieldLabels = {
    siteTitle: "网站标题",
    siteSubtitle: "网站副标题",
    introYear: "开场年份",
    heroEyebrow: "首页小标题",
    heroTitle: "首页主标题",
    heroDescription: "首页副标题",
    primaryButtonText: "主按钮文字",
    secondaryButtonText: "次按钮文字",
    contactText: "联系文案",
    instagramUrl: "Instagram",
    email: "邮箱",
    githubUrl: "GitHub",
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="admin-panel">
      <p className="eyebrow">网站设置</p>
      <h1>站点信息</h1>
      <form className="editor-form" onSubmit={submit}>
        {(["siteTitle", "siteSubtitle", "introYear", "heroEyebrow", "heroTitle", "heroDescription", "primaryButtonText", "secondaryButtonText", "contactText", "instagramUrl", "email", "githubUrl"] as const).map((field) => (
          <label key={field} className={field === "siteSubtitle" || field === "heroDescription" || field === "contactText" ? "wide" : ""}>
            {fieldLabels[field]}
            <input value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} />
          </label>
        ))}
        <div className="editor-actions">
          <button className="button primary" type="submit">保存</button>
          {saved ? <span className="saved-pill">已保存</span> : null}
        </div>
      </form>
    </div>
  );
}
