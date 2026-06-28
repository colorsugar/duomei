import { getSettings } from "../lib/cmsStore";

export function Contact() {
  const settings = getSettings();

  return (
    <section className="section contact-section" id="contact" data-reveal>
      <p className="eyebrow">Contact</p>
      <h2>联系</h2>
      <p>
        如果你想交流旅行、摄影、网站、文章，或者只是想看我继续记录生活，可以从这里联系我。
      </p>
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
