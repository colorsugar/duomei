#!/bin/bash
# 把当前提交部署到独立的预览项目（主站 duomei-guyu 的 production 和
# 素材站 duomei-assets-overseas 的 production / assets.duomei.site 都不动）。
# 素材发到新项目 duomei-slim-preview-assets（海外区），主站以 preview
# 环境发到 duomei-guyu，得到带令牌的预览地址。需要 EDGEONE_API_TOKEN。
set -euo pipefail

redact() { sed -E 's/(eo_token=)[^&[:space:]"]+/\1[redacted]/g; s/Bearer [^[:space:]"]+/Bearer [redacted]/g'; }
json_url() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j.url||j.Url||"")}catch{console.log("")}})'
}
origin_of() {
  node -e 'const u=process.argv[1]; try{const x=new URL(u); process.stdout.write(x.origin)}catch{process.stdout.write(String(u).replace(/[?#].*$/,"").replace(/\/+$/,"") )}' "$1"
}

if [[ -z "${EDGEONE_API_TOKEN:-}" ]]; then
  echo "::error::EDGEONE_API_TOKEN 没配置，发不了预览。"
  exit 1
fi

ASSETS_PROJECT="${PREVIEW_ASSETS_PROJECT:-duomei-slim-preview-assets}"
ASSETS_AREA="${PREVIEW_ASSETS_AREA:-overseas}"
SITE_PROJECT="${PREVIEW_SITE_PROJECT:-duomei-guyu}"
SITE_ENV="${PREVIEW_SITE_ENV:-preview}"

mkdir -p public/.well-known
printf '{"commit":"%s","run":"%s","preview":true,"branch":"%s"}\n' \
  "${GITHUB_SHA:-local}" "${GITHUB_RUN_ID:-0}" "${GITHUB_REF_NAME:-local}" \
  > public/.well-known/duomei-build.json

echo "== 安装依赖并构建 =="
npm ci
npm run build

echo "== 打包素材（不发到正式素材项目） =="
pack="${RUNNER_TEMP:-/tmp}/duomei-slim-preview-assets-pack"
node scripts/assets-split.mjs pack --dir public --out "$pack"
# 素材包的项目名改成预览项目，避免 CLI 误用正式素材项目名
node -e '
  const fs=require("fs"); const p=process.argv[1];
  const f=p+"/edgeone.json"; const j=JSON.parse(fs.readFileSync(f,"utf8"));
  j.name=process.argv[2];
  fs.writeFileSync(f, JSON.stringify(j,null,2)+"\n");
  const pkg=p+"/package.json"; const k=JSON.parse(fs.readFileSync(pkg,"utf8"));
  k.name=process.argv[2];
  fs.writeFileSync(pkg, JSON.stringify(k,null,2)+"\n");
' "$pack" "$ASSETS_PROJECT"
du -sm "$pack/public" || true

echo "== 把素材部署到独立预览项目 ${ASSETS_PROJECT}（-e production 仅针对该新项目，不是 assets.duomei.site） =="
assets_log="$(mktemp)"
assets_err="$(mktemp)"
set +e
( cd "$pack" && edgeone makers deploy -n "$ASSETS_PROJECT" -t "$EDGEONE_API_TOKEN" -e production -a "$ASSETS_AREA" --json ) \
  >"$assets_log" 2>"$assets_err"
assets_rc=$?
set -e
redact < "$assets_err" >&2 || true
redact < "$assets_log" | tail -n 8
if [[ "$assets_rc" -ne 0 ]]; then
  echo "::error::独立素材预览项目部署失败（正式素材站未改）。见上方日志。"
  exit "$assets_rc"
fi
assets_url="$(tail -n 1 "$assets_log" | json_url)"
if [[ -z "$assets_url" ]]; then
  echo "::error::素材预览部署没有返回 url"
  exit 1
fi
assets_base="$(origin_of "$assets_url")"
echo "PREVIEW_ASSETS_BASE=${assets_base}"
echo "素材预览地址（令牌已打码）：$(printf '%s\n' "$assets_url" | redact)"

echo "== 等素材预览域名上的指纹 =="
export DUOMEI_ASSETS_BASE="$assets_base"
local_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs hash --dir public)"
live=0
for attempt in $(seq 1 16); do
  now="$(GITHUB_OUTPUT= node scripts/assets-split.mjs remote --base "$assets_base" || true)"
  if [[ "$now" == "$local_hash" ]]; then
    echo "素材预览域名已是本次指纹（第 ${attempt} 次）。"
    live=1
    break
  fi
  echo "素材预览域名上还是 ${now:-（取不到）}，15 秒后再看（${attempt}/16）"
  sleep 15
done
if [[ "$live" != "1" ]]; then
  echo "::error::素材预览已部署，但 ${assets_base} 上还取不到本次指纹。"
  exit 1
fi
node scripts/assets-split.mjs check --dir dist --base "$assets_base"

echo "== 主站包按预览素材域名拆分（只改本机 edgeone.json / 清单，不改正式站） =="
node scripts/assets-split.mjs apply --dir dist
node scripts/assets-split.mjs guard --dir dist

echo "== 主站预览部署到 ${SITE_PROJECT} 的 ${SITE_ENV} 环境（不碰 production） =="
# 复用仓库里的探测脚本：它只会 edgeone makers deploy -e preview，并闸门检查入口页。
bash scripts/edgeone-preview-probe.sh
