import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          GUYU_MEDIA_SIGNING_SECRET: "test-only-secret-that-is-longer-than-thirty-two-characters",
        },
      },
    }),
  ],
});
