// Ships preview-home/ next to the Vite SPA: its index.html becomes dist/home.html, served at "/" by an
// exact rewrite. The SPA shell stays dist/index.html because EdgeOne only treats "/* → /index.html" as a
// not-found fallback; any other wildcard destination also swallows real files (JS, iframes, JSON).
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const home = path.join(root, "preview-home");

if (!fs.existsSync(path.join(home, "index.html"))) throw new Error("preview-home/index.html missing");
if (!fs.readFileSync(path.join(dist, "index.html"), "utf8").includes('<div id="root">')) throw new Error("dist/index.html is not the SPA shell");
for (const name of fs.readdirSync(home)) {
  const target = path.join(dist, name === "index.html" ? "home.html" : name);
  if (fs.existsSync(target)) throw new Error(`preview-home/${name} collides with ${path.relative(root, target)}`);
  fs.cpSync(path.join(home, name), target, { recursive: true });
}
console.log("static homepage → dist/home.html (served at /), SPA shell stays dist/index.html");
