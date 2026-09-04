import { handleMusicStreamRequest } from "../../server/neteaseMusic.mjs";

export function onRequest(context) {
  return handleMusicStreamRequest(context.request);
}
