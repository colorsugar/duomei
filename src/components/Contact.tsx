import { getSettings } from "../lib/cmsStore";
import { useInlineEdit } from "./InlineEditProvider";

export function Contact() {
  const settings = getSettings();
  const { isLoggedIn, editMode, openSettingsEditor } = useInlineEdit();

  return (
    <section className={`section contact-section ${isLoggedIn && editMode ? "editable-block" : ""}`} id="contact" data-reveal>
      {isLoggedIn && editMode ? (
        <div className="editable-actions">
          <button className="front-edit-button" type="button" onClick={() => openSettingsEditor("contact")}>
            编辑联系信息
          </button>
        </div>
      ) : null}
      <p className="eyebrow">Contact</p>
      <h2>联系</h2>
      <p>{settings.contactText}</p>
      <div className="contact-actions">
        <a className="button primary" href={settings.instagramUrl} target="_blank" rel="noreferrer">
          Instagram
        </a>
        <a className="button secondary" href={`mailto:${settings.email}`}>
          Email
        </a>
        <a className="button secondary" href={settings.githubUrl} target="_blank" rel="noreferrer">
          GitHub / Blog
        </a>
      </div>
    </section>
  );
}
