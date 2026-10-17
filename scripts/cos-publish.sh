#!/bin/bash
# 发布前把大文件同步到腾讯云 COS，并让接下来的 EdgeOne 部署只带小网站（见 scripts/cos-assets.mjs）。
# 在 CI 里、npm run build 之后、edgeone makers deploy 之前跑。需要 dist/ 已构建。
#
# 什么时候走 COS：deploy/cos-assets.json enabled=true、仓库变量 DUOMEI_ASSETS_ON_COS 不是 0、
# Secrets 里有 COS_SECRET_ID / COS_SECRET_KEY、桶名已知（配置或仓库变量 COS_BUCKET）。
# 任何一条不满足：不拆，整站照旧全部放 EdgeOne（mode=edgeone），并打一条警告。
# 走 COS 时：先写跳转和清单 → 增量上传 → 抽查 assets 域名上能取到（不通就让整个发布失败，不会发出缺文件的网站）。
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
mode_edgeone() {
  echo "mode=edgeone" >> "$out"
  rm -f .cos-split.json
  echo "::warning::大文件这次不走 COS（$1），整站照旧全部部署到 EdgeOne。"
  exit 0
}

enabled="$(node -p 'require("./deploy/cos-assets.json").enabled')"
[[ "${DUOMEI_ASSETS_ON_COS:-}" == "0" || "${DUOMEI_ASSETS_ON_COS:-}" == "false" ]] && mode_edgeone "仓库变量 DUOMEI_ASSETS_ON_COS=0"
[[ "$enabled" != "true" && "${DUOMEI_ASSETS_ON_COS:-}" != "1" ]] && mode_edgeone "deploy/cos-assets.json enabled=false"
[[ -z "${COS_SECRET_ID:-}" || -z "${COS_SECRET_KEY:-}" ]] && mode_edgeone "仓库 Secrets 里还没有 COS_SECRET_ID / COS_SECRET_KEY"
bucket="${COS_BUCKET:-$(node -p 'require("./deploy/cos-assets.json").bucket')}"
[[ -z "$bucket" ]] && mode_edgeone "还不知道桶名（deploy/cos-assets.json bucket 或仓库变量 COS_BUCKET）"
export COS_BUCKET="$bucket"

node scripts/cos-assets.mjs apply --dir dist

sdk_dir="${RUNNER_TEMP:-/tmp}/cos-sdk"
mkdir -p "$sdk_dir"
( cd "$sdk_dir" && npm init -y >/dev/null && npm install --no-audit --no-fund --silent cos-nodejs-sdk-v5@2.15.4 )
COS_SDK_DIR="$sdk_dir" node scripts/cos-assets.mjs sync --dir dist ${COS_SYNC_FORCE:+--force}

# 回源 + 加速域名要真能取到，才发小网站；第一次上传后节点可能要几秒才通，重试几次。
for attempt in 1 2 3 4 5 6; do
  if node scripts/cos-assets.mjs check --dir dist; then
    echo "mode=cos" >> "$out"
    exit 0
  fi
  echo "assets 域名抽查未通过（第 ${attempt} 次），20 秒后重试…"
  sleep 20
done
echo "::error::assets 域名上取不到刚上传的文件，停止发布（正式站不动）。"
exit 1
