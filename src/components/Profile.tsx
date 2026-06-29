import { SectionHeading } from "./SectionHeading";
import { getProfile } from "../lib/cmsStore";
import { useInlineEdit } from "./InlineEditProvider";

export function Profile() {
  const profile = getProfile();
  const { isLoggedIn, editMode, openProfileEditor } = useInlineEdit();
  const tags = [
    profile.location,
    `From ${profile.origin}`,
    profile.occupation,
    ...profile.interests,
  ];

  return (
    <section className="section profile-section" id="about">
      <SectionHeading eyebrow="About TAMI" title="关于多美" />
      <div className={`profile-card ${isLoggedIn && editMode ? "editable-block" : ""}`} data-reveal>
        {isLoggedIn && editMode ? (
          <div className="editable-actions">
            <button className="front-edit-button" type="button" onClick={openProfileEditor}>
              编辑个人资料
            </button>
          </div>
        ) : null}
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
