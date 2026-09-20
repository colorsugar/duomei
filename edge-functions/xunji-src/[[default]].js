// /xunji-src/:date, /xunji-src/archive/ and /xunji-src/archive/manifest.json
// relayed from the 寻迹 source at the edge.
import { handleXunjiProxyRequest } from "../../server/xunjiProxy.mjs";

export function onRequest(context) {
  return handleXunjiProxyRequest(context.request);
}
