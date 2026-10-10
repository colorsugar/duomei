// /chaoji — serves the SPA shell with route-specific share metadata (server/shareMeta.mjs).
import { handleShellRequest } from "../../server/shareMeta.mjs";

export function onRequest(context) {
  return handleShellRequest(context.request);
}
