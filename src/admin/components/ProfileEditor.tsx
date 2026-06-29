import { FormEvent, useState } from "react";
import { getProfile, saveProfile } from "../../lib/cmsStore";

export function ProfileEditor() {
  const [profile, setProfile] = useState(getProfile());
  const [saved, setSaved] = useState(false);
  const fieldLabels = {
    name: "名称",
    displayName: "显示名称",
    location: "所在地",
    origin: "出身地",
    occupation: "职业",
    avatarUrl: "头像 URL",
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveProfile(profile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="admin-panel">
      <p className="eyebrow">个人资料</p>
      <h1>关于多美</h1>
      <form className="editor-form" onSubmit={submit}>
        {(["name", "displayName", "location", "origin", "occupation", "avatarUrl"] as const).map((field) => (
          <label key={field}>
            {fieldLabels[field]}
            <input value={profile[field]} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} />
          </label>
        ))}
        <label className="wide">
          简介
          <textarea value={profile.bio} rows={7} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        </label>
        <label className="wide">
          标签
          <input
            value={profile.interests.join(", ")}
            onChange={(event) => setProfile({ ...profile, interests: event.target.value.split(",").map((v) => v.trim()) })}
          />
        </label>
        <div className="editor-actions">
          <button className="button primary" type="submit">保存</button>
          {saved ? <span className="saved-pill">已保存</span> : null}
        </div>
      </form>
    </div>
  );
}
