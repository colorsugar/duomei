// /guyu and /guyu/:bookId — public shelf and reader. Serves the SPA shell with route-specific share metadata.
import { handleShellRequest } from "../../server/shareMeta.mjs";

export function onRequest(context) {
  return handleShellRequest(context.request);
}
