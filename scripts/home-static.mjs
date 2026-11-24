// Post-build: the static homepage in preview-home/ becomes dist/index.html ("/"), and the React SPA
// shell moves to dist/app.html, which edgeone.json / vercel.json use as the fallback for every other path.
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const home = path.join(root, "preview-home");
const shell = path.join(dist, "app.html");

if (!fs.existsSync(path.join(home, "index.html"))) throw new Error("preview-home/index.html missing");
if (fs.existsSync(path.join(dist, "index.html"))) fs.renameSync(path.join(dist, "index.html"), shell);
if (!fs.readFileSync(shell, "utf8").includes('<div id="root">')) throw new Error("dist/app.html is not the SPA shell");

for (const name of fs.readdirSync(home)) {
  const target = path.join(dist, name);
  if (fs.existsSync(target)) throw new Error(`preview-home/${name} collides with dist/${name}`);
  fs.cpSync(path.join(home, name), target, { recursive: true });
}
console.log("static homepage → dist/index.html, SPA shell → dist/app.html");
