import { env, exports } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

describe("DUOMEI public image gateway", () => {
  const key = "article/test-image.png";

  beforeEach(async () => {
    await env.DUOMEI_MEDIA.delete(key);
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
