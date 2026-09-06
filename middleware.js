// EdgeOne Makers middleware: hands crawlers route-specific share metadata.
// Every listed path still resolves to the SPA shell through the /* fallback;
// we only rewrite <head> copy on the way out, and any failure passes the
// original response through untouched.
import { rewriteShellResponse } from "./server/shareMeta.mjs";

export async function middleware(context) {
  const { request, next } = context;
  if (request.method !== "GET") return next();
  let response;
  try {
    response = await next();
    return await rewriteShellResponse(request, response);
  } catch {
    return response ?? next();
  }
}

export const config = {
  matcher: ["/zaobao", "/zaobao/:path*", "/guyu", "/skills"],
};
