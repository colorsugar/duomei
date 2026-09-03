import { supabase } from "./supabaseClient";
import { bodyToBlocks } from "./noteStore";
import type { DuomeiNote, NoteContentBlock, NoteStatus } from "./noteTypes";

const NOTE_MEDIA_ORIGIN = (import.meta.env.VITE_DUOMEI_MEDIA_ORIGIN
  || "https://duomei-media-storage.colorsugar.workers.dev").replace(/\/+$/u, "");
const NOTE_MEDIA_TYPES = new Map([
  ["image/gif", "gif"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const NOTE_MEDIA_FOLDERS = new Set(["article", "covers", "notes", "poetry"]);

type NoteRow = {
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

function toNote(row: NoteRow): DuomeiNote {
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

function toRow(note: DuomeiNote) {
  return {
    id: note.id,
    slug: note.slug,
    title: note.title,
    date: note.date,
    location: note.location,
    category: note.category,
    tags: note.tags,
    excerpt: note.excerpt,
    body: note.body,
    cover_image_url: note.coverImageUrl,
    style_prompt: note.stylePrompt,
    status: note.status,
    body_images: note.bodyImages ?? [],
    content_blocks: note.contentBlocks ?? [],
  };
}

export async function getCloudSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function loginCloudAdmin(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function logoutCloudAdmin() {
  await supabase.auth.signOut();
}

export async function fetchPublishedNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as NoteRow[]).map(toNote);
}

export async function fetchAllCloudNotes() {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .is("deleted_at", null)
    .order("date", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data as NoteRow[]).map(toNote);
}

export async function fetchCloudNoteBySlug(slug = "", includeDrafts = false) {
  const query = includeDrafts
    ? supabase.from("notes").select("*").eq("slug", slug).is("deleted_at", null).maybeSingle()
    : supabase.from("notes").select("*").eq("slug", slug).eq("status", "published").is("deleted_at", null).maybeSingle();
  const { data, error } = await query;
  if (error) throw error;
  return data ? toNote(data as NoteRow) : undefined;
}

export async function saveCloudNote(note: DuomeiNote) {
  const { data, error } = await supabase.from("notes").upsert(toRow(note), { onConflict: "id" }).select("*").single();
  if (error) throw error;
  return toNote(data as NoteRow);
}

export async function deleteCloudNote(id: string) {
  const { error } = await supabase
    .from("notes")
    .update({ status: "hidden", deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw error;
}

function normalizeNoteMediaType(value: string) {
  const normalized = value.toLowerCase() === "image/jpg" ? "image/jpeg" : value.toLowerCase();
  if (!NOTE_MEDIA_TYPES.has(normalized)) throw new Error("仅支持 JPG、PNG、WebP 或 GIF 图片。");
  return normalized;
}

function createNoteMediaId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(16).padStart(8, "0")).join("");
}

async function uploadNoteMedia(blob: Blob, folder: string, requestedType: string) {
  if (!NOTE_MEDIA_FOLDERS.has(folder)) throw new Error("图片目录不受支持。");
  const contentType = normalizeNoteMediaType(requestedType);
  const extension = NOTE_MEDIA_TYPES.get(contentType)!;
  const session = await getCloudSession();
  if (!session?.access_token) throw new Error("请先登录管理员账号。");

  const key = `${folder}/${Date.now()}-${createNoteMediaId()}.${extension}`;
  const uploadURL = new URL("/v1/upload", NOTE_MEDIA_ORIGIN);
  uploadURL.searchParams.set("key", key);
  const response = await fetch(uploadURL, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${session.access_token}`,
      "content-type": contentType,
    },
    body: blob,
  });
  const result = await response.json().catch(() => ({})) as { error?: string; url?: string };
  if (!response.ok || !result.url) throw new Error(result.error || "图片上传失败，请稍后重试。");
  return result.url;
}

export async function uploadNoteImage(file: File, folder = "notes") {
  return uploadNoteMedia(file, folder, file.type || "image/webp");
}

export async function uploadNoteDataUrl(dataUrl: string, folder = "article") {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return dataUrl;
  const mime = match[1];
  const base64 = match[2];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return uploadNoteMedia(new Blob([bytes], { type: mime }), folder, mime);
}
