import { toNote, type NoteRow } from "./noteRow";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig";

// Published notes are public data behind RLS, so the home page and the reader fetch them with a
// plain request instead of booting the supabase-js client (which stays in the admin chunk).
// Readers are in mainland China, where supabase.co and workers.dev are blocked: the site's own
// /note-data relay (server/noteProxy.mjs) is asked first and hands back same-origin picture links.
async function queryRelay(slug?: string) {
  const url = new URL("/note-data", window.location.origin);
  if (slug !== undefined) url.searchParams.set("slug", slug);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const type = response.headers.get("content-type") ?? "";
  if (!response.ok || !type.includes("json")) throw new Error(`note relay failed (${response.status})`);
  return (await response.json()) as NoteRow[];
}

async function queryNotes(params: Record<string, string>) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/notes`);
  url.searchParams.set("select", "*");
  url.searchParams.set("status", "eq.published");
  url.searchParams.set("deleted_at", "is.null");
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`notes request failed (${response.status})`);
  return (await response.json()) as NoteRow[];
}

export async function fetchPublishedNotes() {
  const rows = await queryRelay().catch(() => queryNotes({ order: "date.desc,updated_at.desc" }));
  return rows.map(toNote);
}

export async function fetchPublishedNoteBySlug(slug = "") {
  if (!slug) return undefined;
  const rows = await queryRelay(slug).catch(() => queryNotes({ slug: `eq.${slug}`, limit: "1" }));
  return rows[0] ? toNote(rows[0]) : undefined;
}
