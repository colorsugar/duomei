import { toNote, type NoteRow } from "./noteRow";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./supabaseConfig";

// Published notes are public data behind RLS, so the home page and the reader fetch them with a
// plain request instead of booting the supabase-js client (which stays in the admin chunk).
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
  const rows = await queryNotes({ order: "date.desc,updated_at.desc" });
  return rows.map(toNote);
}

export async function fetchPublishedNoteBySlug(slug = "") {
  if (!slug) return undefined;
  const rows = await queryNotes({ slug: `eq.${slug}`, limit: "1" });
  return rows[0] ? toNote(rows[0]) : undefined;
}
