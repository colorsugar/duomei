import { FormEvent, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ContentItem, ContentType } from "../../lib/cmsTypes";
import { getAllItems, upsertItem } from "../../lib/cmsStore";
import { slugify } from "../../lib/slugify";

const paths: Record<ContentType, string> = {
  journey: "journeys",
  photo: "photos",
  note: "notes",
  essay: "essays",
  "ai-wall": "ai-wall",
};

function blank(type: ContentType): ContentItem {
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
    status: "draft",
    showOnHome: false,
    featured: false,
    order: 99,
    createdAt,
    updatedAt: createdAt,
  };
}

export function ContentEditor({ type }: { type: ContentType }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const initial = useMemo(
    () => getAllItems().find((item) => item.id === id) ?? blank(type),
    [id, type],
  );
  const [item, setItem] = useState<ContentItem>(initial);
  const [saved, setSaved] = useState(false);

  const setField = (field: keyof ContentItem, value: ContentItem[keyof ContentItem]) => {
    setItem((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const slug = item.slug.trim() || slugify(item.title, item.type);
    const next = {
      ...item,
      slug,
      tags: item.tags.map((tag) => tag.trim()).filter(Boolean),
      galleryImages: item.galleryImages?.map((url) => url.trim()).filter(Boolean),
      updatedAt: new Date().toISOString(),
    };
    upsertItem(next);
    setItem(next);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
    if (!id) navigate(`/admin/${paths[type]}/${next.id}`, { replace: true });
  };

  return (
    <div className="admin-panel">
      <Link className="back-link" to={`/admin/${paths[type]}`}>
        Back
      </Link>
      <p className="eyebrow">{id ? "Edit Content" : "New Content"}</p>
      <h1>{id ? item.title || "Untitled" : `New ${type}`}</h1>
      <form className="editor-form" onSubmit={submit}>
        <label>
          title
          <input
            value={item.title}
            onChange={(event) => {
              const value = event.target.value;
              setItem((current) => ({
                ...current,
                title: value,
                slug: current.slug ? current.slug : slugify(value, current.type),
              }));
            }}
          />
        </label>
        <label>
          subtitle
          <input value={item.subtitle ?? ""} onChange={(event) => setField("subtitle", event.target.value)} />
        </label>
        <label>
          slug
          <input value={item.slug} onChange={(event) => setField("slug", slugify(event.target.value, item.type))} />
        </label>
        <label>
          date
          <input value={item.date} onChange={(event) => setField("date", event.target.value)} />
        </label>
        <label>
          location
          <input value={item.location ?? ""} onChange={(event) => setField("location", event.target.value)} />
        </label>
        <label>
          category
          <input value={item.category ?? ""} onChange={(event) => setField("category", event.target.value)} />
        </label>
        <label>
          tags
          <input
            value={item.tags.join(", ")}
            onChange={(event) => setField("tags", event.target.value.split(","))}
          />
        </label>
        <label>
          excerpt
          <textarea value={item.excerpt} onChange={(event) => setField("excerpt", event.target.value)} />
        </label>
        <label className="wide">
          body
          <textarea value={item.body} onChange={(event) => setField("body", event.target.value)} rows={8} />
        </label>
        <label>
          coverImageUrl
          <input value={item.coverImageUrl ?? ""} onChange={(event) => setField("coverImageUrl", event.target.value)} />
        </label>
        <label>
          galleryImages
          <textarea
            value={(item.galleryImages ?? []).join(", ")}
            onChange={(event) => setField("galleryImages", event.target.value.split(","))}
          />
        </label>
        <label>
          status
          <select value={item.status} onChange={(event) => setField("status", event.target.value as ContentItem["status"])}>
            <option value="published">published</option>
            <option value="draft">draft</option>
          </select>
        </label>
        <label>
          order
          <input type="number" value={item.order} onChange={(event) => setField("order", Number(event.target.value))} />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={item.showOnHome}
            onChange={(event) => setField("showOnHome", event.target.checked)}
          />
          showOnHome
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={item.featured}
            onChange={(event) => setField("featured", event.target.checked)}
          />
          featured
        </label>
        <div className="editor-actions">
          <button className="button primary" type="submit">
            Save
          </button>
          {saved ? <span className="saved-pill">Saved</span> : null}
        </div>
      </form>
    </div>
  );
}
