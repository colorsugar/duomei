#!/bin/bash
# Build a ~51MB skip-build pack that is only the new homepage + storybook.
set -euo pipefail
out="${1:?pack dir}"
name="${2:?project name}"
slim_base="${3:-https://duomei-slim-preview.edgeone.dev}"
rm -rf "$out"
mkdir -p "$out/dist"
if [[ -d preview-home ]]; then
  cp -a preview-home/. "$out/dist/"
else
  for rel in index.html main.js interactions.js layers.js popup.html carousel.html storybook.html yunyou-flow.html car-data.json xunji.json js img f fr huiben storybook; do
    [[ -e "dist/$rel" ]] && cp -a "dist/$rel" "$out/dist/"
  done
fi
mkdir -p "$out/dist/.well-known"
if [[ -f public/.well-known/duomei-build.json ]]; then
  cp -a public/.well-known/duomei-build.json "$out/dist/.well-known/"
fi
node -e '
  const fs=require("fs");
  const p=process.argv[1];
  const base=process.argv[2].replace(/\/$/,"");
  let t=fs.readFileSync(p,"utf8");
  for (const path of ["/xiaoyuan-scene/","/honglou/","/yunyou/","/lingchuan/","/atlas/v6/","/legacy/"]) {
    t=t.replaceAll(`href="${path}"`, `href="${base}${path}"`);
    t=t.replaceAll(`href='\''${path}'\''`, `href='\''${base}${path}'\''`);
  }
  fs.writeFileSync(p,t);
  console.log("footer links rewritten to", base);
' "$out/dist/index.html" "$slim_base"
node -e '
  const fs=require("fs");
  const name=process.argv[1];
  const out=process.argv[2];
  fs.writeFileSync(out+"/edgeone.json", JSON.stringify({
    name, installCommand:"echo skip-install", buildCommand:"echo skip-build", outputDirectory:"dist"
  },null,2)+"\n");
  fs.writeFileSync(out+"/package.json", JSON.stringify({
    name, private:true, version:"1.0.0", scripts:{build:"echo skip-build"}
  },null,2)+"\n");
' "$name" "$out"
du -sm "$out" "$out/dist" || true
