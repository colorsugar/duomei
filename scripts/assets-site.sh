#!/bin/bash
# 主站发布前决定这次拆不拆大素材（见 scripts/assets-split.mjs）。在 npm run build 和 verify-release 之后、
# edgeone makers deploy 之前跑；dist/ 要已构建。
#
# 拆的条件（全满足才拆）：开关开着（deploy/assets-split.json enabled、仓库变量 DUOMEI_ASSETS_SPLIT 不是 0），
# 素材域名上线中的指纹 == 本次 dist 里素材的指纹（素材项目已发好本次版本），抽查素材域名 206 + 跨域头 + 类型都对。
# 任何一条不满足：退路——不拆，整站照旧全部放主站（mode=whole），打一条警告；体积闸再防 1.1GB 断站线。
# 拆时：写 .assets-split.json + 往 edgeone.json 加 302 跳转，接下来 CLI 重新 npm run build 时 strip 掉这些文件。
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
whole() {
  rm -f .assets-split.json
  echo "mode=whole" >> "$out"
  echo "::warning::这次大素材不拆（$1），整站照旧全部部署到主站。"
  exit 0
}

enabled="$(node -p 'require("./deploy/assets-split.json").enabled')"
[[ "${DUOMEI_ASSETS_SPLIT:-}" == "0" || "${DUOMEI_ASSETS_SPLIT:-}" == "false" ]] && whole "仓库变量 DUOMEI_ASSETS_SPLIT=0"
[[ "$enabled" != "true" && "${DUOMEI_ASSETS_SPLIT:-}" != "1" ]] && whole "deploy/assets-split.json enabled=false"
base="${DUOMEI_ASSETS_BASE:-$(node -p 'require("./deploy/assets-split.json").base')}"
base="${base%/}"

local_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs hash --dir dist)"
remote_hash=""
for attempt in 1 2 3 4; do
  remote_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs remote --base "$base" || true)"
  [[ "$remote_hash" == "$local_hash" ]] && break
  [[ -z "$remote_hash" ]] && break # 域名取不到：别等了
  echo "素材域名上是 ${remote_hash}，本次是 ${local_hash}，20 秒后再看（${attempt}/4）"
  sleep 20
done
[[ -z "$remote_hash" ]] && whole "素材域名 ${base} 取不到 duomei-assets.json（没绑定或没生效）"
[[ "$remote_hash" != "$local_hash" ]] && whole "素材域名上是旧版素材 ${remote_hash}，本次 ${local_hash}（先跑素材发布）"

node scripts/assets-split.mjs check --dir dist --base "$base" || whole "素材域名抽查没通过"
node scripts/assets-split.mjs apply --dir dist
echo "mode=split" >> "$out"
