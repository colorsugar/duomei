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

const typeLabels: Record<ContentType, string> = {
  journey: "旅程",
  photo: "摄影",
  note: "古文",
  essay: "文章",
  "ai-wall": "留言",
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
        返回
      </Link>
      <p className="eyebrow">{id ? "编辑内容" : "新增内容"}</p>
      <h1>{id ? item.title || "未命名" : `新增${typeLabels[type]}`}</h1>
      <form className="editor-form" onSubmit={submit}>
        <label>
          标题
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
          副标题
          <input value={item.subtitle ?? ""} onChange={(event) => setField("subtitle", event.target.value)} />
        </label>
        <label>
          slug
          <input value={item.slug} onChange={(event) => setField("slug", slugify(event.target.value, item.type))} />
        </label>
        <label>
          日期
          <input value={item.date} onChange={(event) => setField("date", event.target.value)} />
        </label>
        <label>
          地点
          <input value={item.location ?? ""} onChange={(event) => setField("location", event.target.value)} />
        </label>
        <label>
          分类
          <input value={item.category ?? ""} onChange={(event) => setField("category", event.target.value)} />
        </label>
        <label>
          标签
          <input
            value={item.tags.join(", ")}
            onChange={(event) => setField("tags", event.target.value.split(","))}
          />
        </label>
        <label>
          摘要
          <textarea value={item.excerpt} onChange={(event) => setField("excerpt", event.target.value)} />
        </label>
        <label className="wide">
          正文
          <textarea value={item.body} onChange={(event) => setField("body", event.target.value)} rows={8} />
        </label>
        <label>
          封面图地址
          <input value={item.coverImageUrl ?? ""} onChange={(event) => setField("coverImageUrl", event.target.value)} />
        </label>
        <label>
          图集地址
          <textarea
            value={(item.galleryImages ?? []).join(", ")}
            onChange={(event) => setField("galleryImages", event.target.value.split(","))}
          />
        </label>
        <label>
          状态
          <select value={item.status} onChange={(event) => setField("status", event.target.value as ContentItem["status"])}>
            <option value="published">已发布</option>
            <option value="draft">草稿</option>
          </select>
        </label>
        <label>
          排序
          <input type="number" value={item.order} onChange={(event) => setField("order", Number(event.target.value))} />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={item.showOnHome}
            onChange={(event) => setField("showOnHome", event.target.checked)}
          />
          首页显示
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={item.featured}
            onChange={(event) => setField("featured", event.target.checked)}
          />
          重点展示
        </label>
        <div className="editor-actions">
          <button className="button primary" type="submit">
            保存
          </button>
          {saved ? <span className="saved-pill">已保存</span> : null}
        </div>
      </form>
    </div>
  );
}
