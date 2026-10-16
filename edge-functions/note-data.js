// /note-data — published notes relayed from Supabase at the edge (unreachable from mainland China).
import { handleNoteDataRequest } from "../server/noteProxy.mjs";

export function onRequest(context) {
  return handleNoteDataRequest(context.request);
}
