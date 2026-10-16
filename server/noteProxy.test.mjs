import assert from "node:assert/strict";
import { test } from "node:test";
import {
  NOTE_MEDIA_ORIGIN,
  handleNoteDataRequest,
  handleNoteMediaRequest,
  noteDataUpstream,
  noteMediaKey,
  rewriteMediaLinks,
} from "./noteProxy.mjs";

test("note data upstream keeps the published-only filters and rebuilds the query", () => {
  const all = noteDataUpstream(new URLSearchParams("status=eq.draft&select=secret"));
  assert.equal(all.searchParams.get("status"), "eq.published");
  assert.equal(all.searchParams.get("select"), "*");
  assert.equal(all.searchParams.get("deleted_at"), "is.null");
  assert.equal(all.searchParams.get("order"), "date.desc,updated_at.desc");

  const one = noteDataUpstream(new URLSearchParams("slug=kyoto-autumn"));
  assert.equal(one.searchParams.get("slug"), "eq.kyoto-autumn");
  assert.equal(one.searchParams.get("limit"), "1");

  assert.equal(noteDataUpstream(new URLSearchParams("slug=a,b)or(status.eq.draft")), null);
});

test("picture links are handed out as same-origin paths", () => {
  const row = JSON.stringify({ cover_image_url: `${NOTE_MEDIA_ORIGIN}/media/covers/1-a.webp` });
  assert.equal(JSON.parse(rewriteMediaLinks(row)).cover_image_url, "/note-media/covers/1-a.webp");
});

test("note data relay rewrites links and caches briefly", async () => {
  let asked;
  const fetchImpl = async (url) => {
    asked = String(url);
    return new Response(JSON.stringify([{ slug: "x", cover_image_url: `${NOTE_MEDIA_ORIGIN}/media/covers/1-a.png` }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };
  const response = await handleNoteDataRequest(new Request("https://duomei.site/note-data?slug=x"), { fetchImpl });
  assert.equal(response.status, 200);
  assert.match(response.headers.get("cache-control"), /max-age=60/);
  assert.match(asked, /slug=eq\.x/);
  const rows = await response.json();
  assert.equal(rows[0].cover_image_url, "/note-media/covers/1-a.png");

  const failed = await handleNoteDataRequest(new Request("https://duomei.site/note-data"), {
    fetchImpl: async () => new Response("no", { status: 500 }),
  });
  assert.equal(failed.status, 502);
});

test("media relay only serves public picture keys", async () => {
  assert.equal(noteMediaKey("/note-media/covers/1-a.webp"), "covers/1-a.webp");
  assert.equal(noteMediaKey("/note-media/../private-media/x.webp"), null);
  assert.equal(noteMediaKey("/note-media/guyu/meiyou-yujian/pages/001.webp"), null);
  assert.equal(noteMediaKey("/note-media/covers/x.svg"), null);

  let asked;
  const fetchImpl = async (url) => {
    asked = String(url);
    return new Response("img", { status: 200, headers: { "content-type": "image/webp" } });
  };
  const response = await handleNoteMediaRequest(new Request("https://duomei.site/note-media/covers/1-a.webp"), { fetchImpl });
  assert.equal(response.status, 200);
  assert.equal(asked, `${NOTE_MEDIA_ORIGIN}/media/covers/1-a.webp`);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.match(response.headers.get("cache-control"), /immutable/);

  const missing = await handleNoteMediaRequest(new Request("https://duomei.site/note-media/covers/x.exe"), { fetchImpl });
  assert.equal(missing.status, 404);
  const post = await handleNoteMediaRequest(new Request("https://duomei.site/note-media/covers/1-a.webp", { method: "POST" }), { fetchImpl });
  assert.equal(post.status, 405);
});
