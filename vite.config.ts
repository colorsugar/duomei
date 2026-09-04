import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import {
  handleMusicLyricRequest,
  handleMusicPlaylistRequest,
  handleMusicStreamRequest,
} from "./server/neteaseMusic.mjs";

function neteaseMusicDevApi() {
  return {
    name: "duomei-netease-music-dev-api",
    configureServer(server: { middlewares: { use: (handler: (
      request: import("node:http").IncomingMessage,
      response: import("node:http").ServerResponse,
      next: () => void,
    ) => void) => void } }) {
      server.middlewares.use(async (request, response, next) => {
        const requestUrl = request.url ? new URL(request.url, "http://localhost") : undefined;
        const handler = requestUrl?.pathname === "/api/music-playlist"
          ? handleMusicPlaylistRequest
          : requestUrl?.pathname === "/api/music-lyric"
            ? handleMusicLyricRequest
            : requestUrl?.pathname === "/api/music-stream"
              ? handleMusicStreamRequest
              : undefined;
        if (!handler || !requestUrl) {
          next();
          return;
        }

        try {
          const headers = new Headers();
          for (const [name, value] of Object.entries(request.headers)) {
            if (Array.isArray(value)) {
              for (const item of value) headers.append(name, item);
            } else if (value !== undefined) {
              headers.set(name, value);
            }
          }
          const fetchResponse = await handler(new Request(requestUrl, {
            method: request.method,
            headers,
          }));
          response.statusCode = fetchResponse.status;
          fetchResponse.headers.forEach((value: string, name: string) => {
            response.setHeader(name, value);
          });
          if (request.method === "HEAD") {
            response.end();
            return;
          }
          response.end(Buffer.from(await fetchResponse.arrayBuffer()));
        } catch {
          response.statusCode = 500;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("X-Content-Type-Options", "nosniff");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify({ error: "MUSIC_API_UNAVAILABLE" }));
        }
      });
    },
  };
}

export default defineConfig({
  server: { host: "0.0.0.0", allowedHosts: ["terminal.local"] },
  base: process.env.GITHUB_PAGES ? "/duomei/" : "/",
  plugins: [react(), neteaseMusicDevApi()],
});
