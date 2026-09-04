import { handleMusicLyricRequest } from "../../server/neteaseMusic.mjs";

export function onRequest(context) {
  return handleMusicLyricRequest(context.request);
}
