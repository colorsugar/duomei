#!/bin/bash
# Deploy the checked-out site as an EdgeOne *preview* (production untouched) and probe it,
# to check a large package serves before it goes live. Needs EDGEONE_API_TOKEN.
set -uo pipefail
mkdir -p public/.well-known
printf '{"commit":"%s","run":"%s","preview":true}\n' "${GITHUB_SHA:-local}" "${GITHUB_RUN_ID:-0}" > public/.well-known/duomei-build.json
log="$(mktemp)"
edgeone makers deploy -n duomei-guyu -t "$EDGEONE_API_TOKEN" -e preview -a global --json | tee "$log" | tail -n 5
url="$(tail -n 1 "$log" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).url||"")}catch{console.log("")}})')"
[ -z "$url" ] && { echo "preview deploy gave no url"; exit 1; }
base="${url%%\?*}"; query="${url#*\?}"
echo "preview base: $base"
for i in 1 2 3 4 5 6; do
  for p in / /honglou/ /honglou/BUILD.json /honglou/dgy-assets/cutscene/ch17-v1.mp4 /jiangnan /.well-known/duomei-build.json; do
    printf '%s %s ' "$i" "$p"
    curl -sS -m 20 -o /dev/null -r 0-1023 -w '%{http_code} %{content_type} %{size_download}\n' "${base%/}${p}?${query}" 2>&1 | tail -n 1
  done
  sleep 20
done
# 闸门：首页、红楼梦影、小院、云游、图志的入口页必须 200，否则这次预览算失败。
fail=0
for p in / /honglou/ /xiaoyuan-scene/ /yunyou/index.html /atlas/v6/index.html /lingchuan/; do
  code="$(curl -sS -m 30 -o /dev/null -w '%{http_code}' "${base%/}${p}?${query}" 2>/dev/null || echo 000)"
  echo "gate ${p} ${code}"
  [ "$code" = "200" ] || fail=1
done
[ "$fail" = "0" ] || { echo "preview gate failed"; exit 1; }
# 大文件拆到 COS 时：预览站上被搬走的路径要 302 到 assets.duomei.site，跟过去能取到。
if [ -f .cos-split.json ]; then
  node scripts/cos-assets.mjs verify-site --site "${base%/}" --query "$query" || exit 1
fi
