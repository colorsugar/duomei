import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const css = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../header-tablet-nav.css"), "utf8");
const query = "@media (max-width: 768px), (hover: none) and (pointer: coarse)";

test("keeps a reachable hamburger on 768px and coarse/hover-none viewports", () => {
  const start = css.lastIndexOf(query);
  assert.notEqual(start, -1, "missing tablet/coarse header media query");
  const block = css.slice(start);
  assert.match(block, /\.duomei-menu-toggle[\s\S]*display:\s*inline-flex\s*!important/);
  assert.match(block, /\.duomei-header\.is-menu-open nav[\s\S]*pointer-events:\s*auto\s*!important/);
  assert.match(block, /\.duomei-header-hover-zone[\s\S]*display:\s*none\s*!important/);
});
