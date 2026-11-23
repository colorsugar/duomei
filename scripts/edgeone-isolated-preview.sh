#!/bin/bash
# 把当前提交部署到独立预览项目（正式站 duomei-guyu / duomei.site 和
# 素材站 duomei-assets-overseas / assets.duomei.site 都不动）。
# 素材：duomei-slim-preview-assets；主站：duomei-slim-preview（都是海外区新项目）。
# 主站包本地 strip 后按静态站发布（skip-build），避免把整仓打到正式项目的 preview 环境。
set -euo pipefail

redact() { sed -E 's/(eo_token=)[^&[:space:]"]+/\1[redacted]/g; s/Bearer [^[:space:]"]+/Bearer [redacted]/g'; }
json_field() {
  node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log(j[process.argv[1]]||j[process.argv[1][0].toUpperCase()+process.argv[1].slice(1)]||"")}catch{console.log("")}})' "$1"
}
origin_of() {
  node -e 'const u=process.argv[1]; try{const x=new URL(u); process.stdout.write(x.origin)}catch{process.stdout.write(String(u).replace(/[?#].*$/,"").replace(/\/+$/,"") )}' "$1"
}

if [[ -z "${EDGEONE_API_TOKEN:-}" ]]; then
  echo "::error::EDGEONE_API_TOKEN 没配置，发不了预览。"
  exit 1
fi

ASSETS_PROJECT="${PREVIEW_ASSETS_PROJECT:-duomei-slim-preview-assets}"
SITE_PROJECT="${PREVIEW_SITE_PROJECT:-duomei-slim-preview}"
AREA="${PREVIEW_AREA:-overseas}"

mkdir -p public/.well-known
printf '{"commit":"%s","run":"%s","preview":true,"branch":"%s"}\n' \
  "${GITHUB_SHA:-local}" "${GITHUB_RUN_ID:-0}" "${GITHUB_REF_NAME:-local}" \
  > public/.well-known/duomei-build.json

echo "== 安装依赖并构建 =="
npm ci
npm run build

echo "== 素材指纹 =="
local_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs hash --dir public)"
assets_base="https://${ASSETS_PROJECT}.edgeone.dev"
remote_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs remote --base "$assets_base" || true)"
echo "本次 ${local_hash}；${assets_base} 上 ${remote_hash:-（取不到）}"

if [[ "$remote_hash" == "$local_hash" ]]; then
  echo "素材预览项目已是本次指纹，跳过素材部署（不占新的存储副本）。"
else
  echo "== 打包素材（不发到正式素材项目） =="
  pack="${RUNNER_TEMP:-/tmp}/duomei-slim-preview-assets-pack"
  node scripts/assets-split.mjs pack --dir public --out "$pack"
  node -e '
    const fs=require("fs"); const p=process.argv[1]; const name=process.argv[2];
    for (const file of ["/edgeone.json","/package.json"]) {
      const j=JSON.parse(fs.readFileSync(p+file,"utf8"));
      j.name=name;
      fs.writeFileSync(p+file, JSON.stringify(j,null,2)+"\n");
    }
  ' "$pack" "$ASSETS_PROJECT"
  du -sm "$pack/public" || true

  echo "== 部署到独立素材预览项目 ${ASSETS_PROJECT}（不是 assets.duomei.site） =="
  assets_log="$(mktemp)"
  assets_err="$(mktemp)"
  set +e
  ( cd "$pack" && edgeone makers deploy -n "$ASSETS_PROJECT" -t "$EDGEONE_API_TOKEN" -e production -a "$AREA" --json ) \
    >"$assets_log" 2>"$assets_err"
  assets_rc=$?
  set -e
  redact < "$assets_err" >&2 || true
  redact < "$assets_log" | tail -n 10
  if [[ "$assets_rc" -ne 0 ]]; then
    echo "::error::独立素材预览项目部署失败（正式素材站未改）。"
    exit "$assets_rc"
  fi
  assets_url="$(tail -n 1 "$assets_log" | json_field url)"
  if [[ -n "$assets_url" ]]; then
    assets_base="$(origin_of "$assets_url")"
  fi
  echo "PREVIEW_ASSETS_BASE=${assets_base}"
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
fi

export DUOMEI_ASSETS_BASE="$assets_base"
node scripts/assets-split.mjs check --dir dist --base "$assets_base"

echo "== 主站包按预览素材域名拆分并本地 strip =="
node scripts/assets-split.mjs apply --dir dist
node scripts/assets-split.mjs guard --dir dist
node scripts/assets-split.mjs strip --dir dist
du -sm dist || true

echo "== 打主站静态包（skip-build，发到新项目 ${SITE_PROJECT}，不碰 duomei-guyu） =="
site_pack="${RUNNER_TEMP:-/tmp}/duomei-slim-preview-site-pack"
rm -rf "$site_pack"
mkdir -p "$site_pack"
# 已 strip 的 dist 作为静态产物
cp -a dist "$site_pack/dist"
if [[ -d cloud-functions ]]; then
  cp -a cloud-functions "$site_pack/cloud-functions"
fi
node -e '
  const fs=require("fs");
  const name=process.argv[1];
  const eo=JSON.parse(fs.readFileSync("edgeone.json","utf8"));
  eo.name=name;
  eo.installCommand="echo skip-install";
  eo.buildCommand="echo skip-build";
  eo.outputDirectory="dist";
  fs.writeFileSync(process.argv[2]+"/edgeone.json", JSON.stringify(eo,null,2)+"\n");
  fs.writeFileSync(process.argv[2]+"/package.json", JSON.stringify({name, private:true, version:"1.0.0", scripts:{build:"echo skip-build"}}, null, 2)+"\n");
' "$SITE_PROJECT" "$site_pack"
du -sm "$site_pack/dist" || true

site_log="$(mktemp)"
site_err="$(mktemp)"
set +e
( cd "$site_pack" && edgeone makers deploy -n "$SITE_PROJECT" -t "$EDGEONE_API_TOKEN" -e production -a "$AREA" --json ) \
  >"$site_log" 2>"$site_err"
site_rc=$?
set -e
redact < "$site_err" >&2 || true
redact < "$site_log" | tail -n 12
if [[ "$site_rc" -ne 0 ]]; then
  echo "::error::独立主站预览项目部署失败（正式站 duomei.site 未改）。原文：$(tail -n 1 "$site_log" | redact)"
  exit "$site_rc"
fi
url="$(tail -n 1 "$site_log" | json_field url)"
if [[ -z "$url" ]]; then
  echo "::error::主站预览部署没有返回 url"
  exit 1
fi
base="${url%%\?*}"; query="${url#*\?}"
[[ "$query" == "$url" ]] && query=""
echo "preview base: $base"
echo "预览地址（令牌已打码）：$(printf '%s\n' "$url" | redact)"

q() {
  if [[ -n "$query" ]]; then printf '%s' "${1}?${query}"; else printf '%s' "$1"; fi
}

fail=0
for p in / /honglou/ /xiaoyuan-scene/ /yunyou/index.html /atlas/v6/index.html /atlas/chaoji/ /lingchuan/ /.well-known/duomei-build.json; do
  code="$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "$(q "${base%/}${p}")" 2>/dev/null || echo 000)"
  echo "gate ${p} ${code}"
  [ "$code" = "200" ] || fail=1
done
[ "$fail" = "0" ] || { echo "preview gate failed"; exit 1; }

if [ -f .assets-split.json ]; then
  node scripts/assets-split.mjs verify-site --site "${base%/}" --query "$query" || exit 1
fi

echo "PREVIEW_URL=${url}"
echo "PREVIEW_ASSETS_BASE=${assets_base}"
