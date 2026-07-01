import { supabase } from "./supabaseClient";
import { bodyToBlocks } from "./noteStore";
import type { DuomeiNote, NoteContentBlock, NoteStatus } from "./noteTypes";

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

export async function uploadNoteImage(file: File, folder = "notes") {
  const ext = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `${folder}/${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from("note-images").upload(path, file, {
    cacheControl: "31536000",
    contentType: file.type || "image/webp",
    upsert: false,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("note-images").getPublicUrl(path);
  return data.publicUrl;
}
