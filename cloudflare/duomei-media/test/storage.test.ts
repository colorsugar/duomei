import { env, exports } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPrivateSignature } from "../src/index";

describe("DUOMEI media gateway", () => {
  const publicKey = "article/test-image.png";
  const noLengthKey = "notes/no-content-length.png";
  const privateKey = "guyu/meiyou-yujian/pages/001.webp";

  beforeEach(async () => {
    await Promise.all([
      env.DUOMEI_MEDIA.delete(publicKey),
      env.DUOMEI_MEDIA.delete(noLengthKey),
      env.DUOMEI_PRIVATE.delete(privateKey),
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves a public image with immutable caching", async () => {
    await env.DUOMEI_MEDIA.put(publicKey, new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: "image/png" },
    });
    const response = await exports.default.fetch(`https://duomei-media.test/media/${publicKey}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("never exposes a private object through the public route", async () => {
    await env.DUOMEI_PRIVATE.put(privateKey, new Uint8Array([4, 5, 6]), {
      httpMetadata: { contentType: "image/webp" },
    });
    const response = await exports.default.fetch(`https://duomei-media.test/media/${privateKey}`);
    expect(response.status).toBe(404);
    await response.text();
  });

  it("requires a valid short-lived signature for private images", async () => {
    await env.DUOMEI_PRIVATE.put(privateKey, new Uint8Array([4, 5, 6]), {
      httpMetadata: { contentType: "image/webp" },
    });

    const unsigned = await exports.default.fetch(`https://duomei-media.test/private-media/${privateKey}`);
    expect(unsigned.status).toBe(403);
    await unsigned.text();

    const expiresAt = Math.floor(Date.now() / 1000) + 60;
    const signature = await createPrivateSignature(privateKey, expiresAt, env.GUYU_MEDIA_SIGNING_SECRET);
    const signedURL = `https://duomei-media.test/private-media/${privateKey}?expires=${expiresAt}&signature=${signature}`;
    const signed = await exports.default.fetch(signedURL);
    expect(signed.status).toBe(200);
    expect(signed.headers.get("content-type")).toBe("image/webp");
    expect(signed.headers.get("access-control-allow-origin")).toBeNull();
    expect(new Uint8Array(await signed.arrayBuffer())).toEqual(new Uint8Array([4, 5, 6]));

    const tampered = await exports.default.fetch(`${signedURL}x`);
    expect(tampered.status).toBe(403);
    await tampered.text();

    const expiredAt = Math.floor(Date.now() / 1000) - 1;
    const expiredSignature = await createPrivateSignature(privateKey, expiredAt, env.GUYU_MEDIA_SIGNING_SECRET);
    const expired = await exports.default.fetch(
      `https://duomei-media.test/private-media/${privateKey}?expires=${expiredAt}&signature=${expiredSignature}`,
    );
    expect(expired.status).toBe(403);
    await expired.text();
  });

  it("matches the Vercel media-signature test vector", async () => {
    expect(await createPrivateSignature(
      privateKey,
      1800000000,
      "test-only-secret-that-is-longer-than-thirty-two-characters",
    )).toBe("7HSqvwouUf0hIj0B6qt9Xw2CmtLg-kVjHrKZpnFI9Ko");
  });

  it("rejects uploads without an administrator session", async () => {
    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/test-image.png", {
      method: "PUT",
      headers: {
        origin: "https://duomei.site",
        "content-type": "image/png",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(401);
    await response.text();
  });

  it("allows the production site upload preflight", async () => {
    const response = await exports.default.fetch("https://duomei-media.test/v1/upload", {
      method: "OPTIONS",
      headers: { origin: "https://duomei.site" },
    });
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://duomei.site");
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
        origin: "https://duomei.site",
        "content-type": "image/png",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(201);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(await env.DUOMEI_MEDIA.get(publicKey)).not.toBeNull();
    await response.text();
  });

  it("rejects SVG uploads even for an authenticated administrator", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const target = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(target);
      if (url.pathname === "/auth/v1/user") return Response.json({ email: "admin@example.com" });
      if (url.pathname === "/rest/v1/duomei_admins") return Response.json([{ email: "admin@example.com" }]);
      return new Response(null, { status: 404 });
    });

    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/test-image.png", {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-session",
        origin: "https://duomei.site",
        "content-type": "image/svg+xml",
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(415);
    await response.text();
  });

  it.each([
    ["article/test-image.svg", "image/png"],
    ["unapproved/test-image.png", "image/png"],
  ])("rejects an invalid public media key: %s", async (key, contentType) => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const target = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(target);
      if (url.pathname === "/auth/v1/user") return Response.json({ email: "admin@example.com" });
      if (url.pathname === "/rest/v1/duomei_admins") return Response.json([{ email: "admin@example.com" }]);
      return new Response(null, { status: 404 });
    });
    const response = await exports.default.fetch(`https://duomei-media.test/v1/upload?key=${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-session",
        origin: "https://duomei.site",
        "content-type": contentType,
        "content-length": "3",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(400);
    await response.text();
  });

  it("rejects a forged content length before writing the object", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const target = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(target);
      if (url.pathname === "/auth/v1/user") return Response.json({ email: "admin@example.com" });
      if (url.pathname === "/rest/v1/duomei_admins") return Response.json([{ email: "admin@example.com" }]);
      return new Response(null, { status: 404 });
    });
    const response = await exports.default.fetch("https://duomei-media.test/v1/upload?key=article/length-mismatch.png", {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-session",
        origin: "https://duomei.site",
        "content-type": "image/png",
        "content-length": "2",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(response.status).toBe(422);
    expect(await env.DUOMEI_MEDIA.get("article/length-mismatch.png")).toBeNull();
    await response.text();
  });

  it("accepts a valid browser upload without an explicit content-length header", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const target = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(target);
      if (url.pathname === "/auth/v1/user") return Response.json({ email: "admin@example.com" });
      if (url.pathname === "/rest/v1/duomei_admins") return Response.json([{ email: "admin@example.com" }]);
      return new Response(null, { status: 404 });
    });
    const request = new Request(`https://duomei-media.test/v1/upload?key=${encodeURIComponent(noLengthKey)}`, {
      method: "PUT",
      headers: {
        authorization: "Bearer valid-session",
        origin: "https://duomei.site",
        "content-type": "image/png",
      },
      body: new Uint8Array([1, 2, 3]),
    });
    expect(request.headers.get("content-length")).toBeNull();
    const response = await exports.default.fetch(request);
    expect(response.status).toBe(201);
    expect(await env.DUOMEI_MEDIA.get(noLengthKey)).not.toBeNull();
    await response.text();
  });

  it("rejects an unapproved upload origin before authentication", async () => {
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
