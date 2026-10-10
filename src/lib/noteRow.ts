import { bodyToBlocks } from "./noteStore";
import type { DuomeiNote, NoteContentBlock, NoteStatus } from "./noteTypes";

export type NoteRow = {
  id: string;
  slug: string;
  title: string;
  date: string;
  location: string;
  category: string;
  tags: string[] | null;
  excerpt: string;
  body: string;
  cover_image_url: string | null;
  style_prompt: string | null;
  status: "published" | "draft" | "hidden";
  body_images: string[] | null;
  content_blocks: NoteContentBlock[] | null;
  created_at: string;
  updated_at: string;
};

export function toNote(row: NoteRow): DuomeiNote {
  const bodyImages = row.body_images ?? [];
  const contentBlocks = row.content_blocks?.length ? row.content_blocks : bodyToBlocks(row.body ?? "", bodyImages);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    date: row.date ?? "",
    location: row.location ?? "",
    category: row.category ?? "",
    tags: row.tags ?? [],
    excerpt: row.excerpt ?? "",
    body: row.body ?? "",
    coverImageUrl: row.cover_image_url ?? "",
    bodyImages,
    contentBlocks,
    stylePrompt: row.style_prompt ?? "",
    status: row.status === "hidden" ? "draft" : (row.status as NoteStatus),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
