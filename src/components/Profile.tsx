import { SectionHeading } from "./SectionHeading";
import { getProfile } from "../lib/cmsStore";

export function Profile() {
  const profile = getProfile();
  const tags = [
    profile.location,
    `From ${profile.origin}`,
    profile.occupation,
    ...profile.interests,
  ];

  return (
    <section className="section profile-section" id="about">
      <SectionHeading eyebrow="About TAMI" title="关于多美" />
      <div className="profile-card" data-reveal>
        <div className="profile-mark">{profile.displayName}</div>
        <div>
          <p>{profile.bio}</p>
          <div className="tag-row profile-tags">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
