// /note-media/:folder/:file — note pictures relayed from the media worker at the edge
// (*.workers.dev is unreachable from mainland China).
import { handleNoteMediaRequest } from "../../server/noteProxy.mjs";

export function onRequest(context) {
  return handleNoteMediaRequest(context.request);
}
