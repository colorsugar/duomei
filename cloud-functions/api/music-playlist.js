import { handleMusicPlaylistRequest } from "../../server/neteaseMusic.mjs";

export function onRequest(context) {
  return handleMusicPlaylistRequest(context.request);
}
