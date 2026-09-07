// /zaobao-src — today's edition HTML relayed from the zaobao source at the edge.
import { handleZaobaoProxyRequest } from "../server/zaobaoProxy.mjs";

export function onRequest(context) {
  return handleZaobaoProxyRequest(context.request);
}
