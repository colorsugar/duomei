import {
  buildExpiredGuyuCookie,
  buildGuyuSessionCookie,
  createGuyuSessionToken,
  getGuyuServerConfig,
  guyuAnswerMatches,
  requestHasGuyuSession,
} from "../server/guyuSession.js";
import {
  clearGuyuFailures,
  getGuyuRateLimitKey,
  inspectGuyuRateLimit,
  registerGuyuFailure,
} from "../server/guyuRateLimit.js";

const responseHeaders = {
  "Cache-Control": "no-store",
  "CDN-Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Vary": "Cookie",
  "Vercel-CDN-Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(body: unknown, status = 200, extraHeaders?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...responseHeaders, ...extraHeaders },
  });
}

function isSecureRequest(request: Request) {
  return new URL(request.url).protocol === "https:";
}

export default {
  async fetch(request: Request) {
    let config: ReturnType<typeof getGuyuServerConfig>;
    try {
      config = getGuyuServerConfig();
    } catch {
      return json({ authorized: false, error: "访问验证暂未配置。" }, 503);
    }

    if (request.method === "GET") {
      return json({ authorized: requestHasGuyuSession(request, config.sessionSecret) });
    }

    if (request.method === "DELETE") {
      return json(
        { authorized: false },
        200,
        { "Set-Cookie": buildExpiredGuyuCookie(isSecureRequest(request)) },
      );
    }

    if (request.method !== "POST") {
      return json({ authorized: false, error: "不支持这个请求。" }, 405, { "Allow": "GET, POST, DELETE" });
    }

    const rateLimitKey = getGuyuRateLimitKey(request);
    const currentLimit = inspectGuyuRateLimit(rateLimitKey);
    if (!currentLimit.allowed) {
      return json(
        { authorized: false, error: "尝试次数较多，请稍后再试。" },
        429,
        { "Retry-After": String(currentLimit.retryAfterSeconds) },
      );
    }

    let answer: unknown;
    try {
      const body = await request.json() as { answer?: unknown };
      answer = body.answer;
    } catch {
      return json({ authorized: false, error: "请输入答案。" }, 400);
    }

    if (!guyuAnswerMatches(answer, config.expectedAnswer)) {
      const nextLimit = registerGuyuFailure(rateLimitKey);
      if (!nextLimit.allowed) {
        return json(
          { authorized: false, error: "尝试次数较多，请稍后再试。" },
          429,
          { "Retry-After": String(nextLimit.retryAfterSeconds) },
        );
      }
      return json({ authorized: false, error: "答案不对，请再想想高中班级。" }, 401);
    }

    clearGuyuFailures(rateLimitKey);
    const token = createGuyuSessionToken(config.sessionSecret);
    return json(
      { authorized: true },
      200,
      { "Set-Cookie": buildGuyuSessionCookie(token, isSecureRequest(request)) },
    );
  },
};
