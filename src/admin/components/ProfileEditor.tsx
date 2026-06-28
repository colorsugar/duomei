import { FormEvent, useState } from "react";
import { getProfile, saveProfile } from "../../lib/cmsStore";

export function ProfileEditor() {
  const [profile, setProfile] = useState(getProfile());
  const [saved, setSaved] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    saveProfile(profile);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <div className="admin-panel">
      <p className="eyebrow">Profile</p>
      <h1>About TAMI</h1>
      <form className="editor-form" onSubmit={submit}>
        {(["name", "displayName", "location", "origin", "occupation", "avatarUrl"] as const).map((field) => (
          <label key={field}>
            {field}
            <input value={profile[field]} onChange={(event) => setProfile({ ...profile, [field]: event.target.value })} />
          </label>
        ))}
        <label className="wide">
          bio
          <textarea value={profile.bio} rows={7} onChange={(event) => setProfile({ ...profile, bio: event.target.value })} />
        </label>
        <label className="wide">
          interests
          <input
            value={profile.interests.join(", ")}
            onChange={(event) => setProfile({ ...profile, interests: event.target.value.split(",").map((v) => v.trim()) })}
          />
        </label>
        <div className="editor-actions">
          <button className="button primary" type="submit">Save</button>
          {saved ? <span className="saved-pill">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}
