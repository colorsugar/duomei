// Public Supabase project settings (the publishable key is safe to ship; RLS guards the data).
// Kept apart from supabaseClient.ts so public pages can query the REST API without loading
// the whole supabase-js runtime (~210 KB) that only the admin / editing flows need.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || "https://bokvqndvwqgugkcrizwj.supabase.co";

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_WONhLBnVl1ea_sroDggFAw_FuTZlZFX";

export const isSupabaseReady = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
