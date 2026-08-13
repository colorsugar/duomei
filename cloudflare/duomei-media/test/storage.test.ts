import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("DUOMEI public image gateway", () => {
  const key = "article/test-image.png";

  beforeEach(async () => {
    await env.DUOMEI_MEDIA.delete(key);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves a stored image publicly with immutable caching", async () => {
    await env.DUOMEI_MEDIA.put(key, new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: "image/png" },
    });
    const response = await exports.default.fetch(`https://duomei-media.test/media/${key}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rejects uploads without an administrator session", async () => {
    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/test-image.png", {
      method: "PUT",
      headers: {
        origin: "https://color-duomei.vercel.app",
        "content-type": "image/png",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(401);
    await response.text();
  });

  it("accepts an authenticated administrator upload", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const target = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(target);
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer valid-session");
      if (url.pathname === "/auth/v1/user") {
        return Response.json({ email: "admin@example.com" });
      }
      if (url.pathname === "/rest/v1/duomei_admins") {
        expect(url.searchParams.get("email")).toBe("eq.admin@example.com");
        return Response.json([{ email: "admin@example.com" }]);
      }
      return new Response(null, { status: 404 });
    });

    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/test-image.png", {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-session",
        origin: "https://color-duomei.vercel.app",
        "content-type": "image/png",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(await env.DUOMEI_MEDIA.get(key)).not.toBeNull();
    await response.text();
  });

  it("rejects an unapproved origin before authentication", async () => {
    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/test-image.png", {
      method: "PUT",
      headers: {
        origin: "https://attacker.example",
        "content-type": "image/png",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(403);
    await response.text();
  });
});
