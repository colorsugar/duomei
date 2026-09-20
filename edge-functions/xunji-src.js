// /xunji-src — today's 寻迹 HTML relayed from xihuan.vercel.app at the edge.
import { handleXunjiProxyRequest } from "../server/xunjiProxy.mjs";

export function onRequest(context) {
  return handleXunjiProxyRequest(context.request);
}
