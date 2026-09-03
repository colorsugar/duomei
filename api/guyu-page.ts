import {
  GUYU_MEDIA_URL_TTL_SECONDS,
  createGuyuMediaSignature,
  getGuyuMediaConfig,
  getGuyuServerConfig,
  requestHasGuyuSession,
} from "../server/guyuSession.js";

const BOOK_ID = "meiyou-yujian";
const PAGE_COUNT = 53;

function jsonError(error: string, status: number) {
  return Response.json(
    { error },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        "CDN-Cache-Control": "no-store",
        "Vary": "Cookie",
        "X-Content-Type-Options": "nosniff",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    },
  );
}

export default {
  async fetch(request: Request) {
    if (request.method !== "GET") {
      return jsonError("不支持这个请求。", 405);
    }

    let sessionSecret: string;
    try {
      sessionSecret = getGuyuServerConfig().sessionSecret;
    } catch {
      return jsonError("访问验证暂未配置。", 503);
    }

    if (!requestHasGuyuSession(request, sessionSecret)) {
      return jsonError("请先回答访问问题。", 401);
    }

    const url = new URL(request.url);
    const bookId = url.searchParams.get("book");
    const page = url.searchParams.get("page") ?? "";
    const pageNumber = Number.parseInt(page, 10);
    if (bookId !== BOOK_ID || !/^\d{3}$/u.test(page) || pageNumber < 1 || pageNumber > PAGE_COUNT) {
      return jsonError("没有这一页。", 404);
    }

    try {
      const { mediaOrigin, signingSecret } = getGuyuMediaConfig();
      const key = `guyu/${BOOK_ID}/pages/${page}.webp`;
      const expiresAt = Math.floor(Date.now() / 1000) + GUYU_MEDIA_URL_TTL_SECONDS;
      const signature = createGuyuMediaSignature(key, expiresAt, signingSecret);
      const mediaURL = new URL(`/private-media/${key}`, mediaOrigin);
      mediaURL.searchParams.set("expires", String(expiresAt));
      mediaURL.searchParams.set("signature", signature);
      return new Response(null, {
        status: 302,
        headers: {
          "Cache-Control": "private, max-age=55",
          "CDN-Cache-Control": "no-store",
          "Location": mediaURL.toString(),
          "Vary": "Cookie",
          "X-Content-Type-Options": "nosniff",
          "Vercel-CDN-Cache-Control": "no-store",
        },
      });
    } catch {
      return jsonError("这一页暂时无法读取。", 404);
    }
  },
};
