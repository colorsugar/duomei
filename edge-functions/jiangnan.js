// /jiangnan — 诗语江南. Serves the SPA shell with its own share card (title, description, garden cover).
import { handleShellRequest } from "../server/shareMeta.mjs";

export function onRequest(context) {
  return handleShellRequest(context.request);
}
