import { FormEvent, useState } from "react";
import { getSettings, saveSettings } from "../../lib/cmsStore";

export function SettingsEditor() {
  const [settings, setSettings] = useState(getSettings());
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveSettings(settings);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="admin-panel">
      <p className="eyebrow">Settings</p>
      <h1>Site Settings</h1>
      <form className="editor-form" onSubmit={submit}>
        {(["siteTitle", "siteSubtitle", "introYear", "instagramUrl", "email", "githubUrl"] as const).map((field) => (
          <label key={field} className={field === "siteSubtitle" ? "wide" : ""}>
            {field}
            <input value={settings[field]} onChange={(event) => setSettings({ ...settings, [field]: event.target.value })} />
          </label>
        ))}
        <div className="editor-actions">
          <button className="button primary" type="submit">Save</button>
          {saved ? <span className="saved-pill">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}
