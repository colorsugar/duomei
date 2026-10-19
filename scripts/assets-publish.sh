#!/bin/bash
# 把大素材发布到 EdgeOne 素材项目（deploy/assets-split.json 的 project，域名 base），只在素材变了时才部署。
# 在 CI 里跑：要 EDGEONE_API_TOKEN、已全局装好 edgeone CLI；在仓库根目录运行。
#   SRC_DIR       素材来源目录（默认 public；素材都是 public/ 下原样复制进 dist 的静态文件，不用先构建）
#   ASSETS_FORCE  =1 时指纹没变也重新部署
#   ASSETS_ROTATE 部署成功后在素材项目里做几次只有一个小页面的 preview，把旧的大副本挤出存储（默认 3）
# 输出（GITHUB_OUTPUT）：deployed=0|1、hash=本次指纹、live=0|1（素材域名上已是本次指纹）
set -euo pipefail

out="${GITHUB_OUTPUT:-/dev/null}"
src="${SRC_DIR:-public}"
project="$(node -p 'require("./deploy/assets-split.json").project')"
base="${DUOMEI_ASSETS_BASE:-$(node -p 'require("./deploy/assets-split.json").base')}"
base="${base%/}"
rotate="${ASSETS_ROTATE:-3}"

local_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs hash --dir "$src")"
remote_hash="$(GITHUB_OUTPUT= node scripts/assets-split.mjs remote --base "$base" || true)"
echo "hash=${local_hash}" >> "$out"
echo "本次素材指纹 ${local_hash}；${base} 上线中的 ${remote_hash:-（取不到）}"

if [[ "$local_hash" == "$remote_hash" && "${ASSETS_FORCE:-0}" != "1" ]]; then
  echo "素材没变，不部署素材项目（不占存储）。"
  echo "deployed=0" >> "$out"
  echo "live=1" >> "$out"
  exit 0
fi

if [[ -z "${EDGEONE_API_TOKEN:-}" ]]; then
  echo "::error::EDGEONE_API_TOKEN 没配置，发不了素材项目。"
  exit 1
fi

pack="${RUNNER_TEMP:-/tmp}/duomei-assets-pack"
node scripts/assets-split.mjs pack --dir "$src" --out "$pack"
du -sm "$pack/public" || true

deploy_log="$(mktemp)"
deploy_assets() {
  ( cd "$pack" && edgeone makers deploy -n "$project" -t "$EDGEONE_API_TOKEN" -e production -a global --json ) 2>&1 | tee "$deploy_log"
  return "${PIPESTATUS[0]}"
}
tiny_rotate() { # $1 = 项目名，$2 = 次数
  local tiny="${RUNNER_TEMP:-/tmp}/tiny-$1"
  mkdir -p "$tiny"
  for i in $(seq 1 "$2"); do
    echo "<!doctype html><title>rotate $i</title>" > "$tiny/index.html"
    edgeone makers deploy "$tiny" -n "$1" -t "$EDGEONE_API_TOKEN" -e preview -a global --json | tail -n 1 || true
    sleep 20
  done
}

if ! deploy_assets; then
  if grep -qi "storage limit" "$deploy_log"; then
    # 账号 5GiB 满了：先挤主站的旧整站副本（每份约 1.1GB，切换前最占地方），再挤素材项目自己的，重试一次。
    echo "::warning::EdgeOne 账号存储满，挤掉主站和素材项目的旧副本后重试一次"
    tiny_rotate duomei-guyu 3
    tiny_rotate "$project" 3 || true
    deploy_assets
  else
    exit 1
  fi
fi
echo "deployed=1" >> "$out"
tail -n 1 "$deploy_log" | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const j=JSON.parse(s);console.log("素材项目部署结果：",JSON.stringify({status:j.status,projectId:j.projectId||j.ProjectId,deploymentId:j.deploymentId||j.DeploymentId,url:String(j.url||"").replace(/eo_token=[^&]+/,"eo_token=[redacted]")}))}catch{console.log("（CLI 最后一行不是 JSON）")}})'

# 部署成功后挤掉素材项目里旧的大副本：平台保留「正式版 + 最近 3 次」，3 次小 preview 后只剩正式版这一份大的。
[[ "$rotate" != "0" ]] && tiny_rotate "$project" "$rotate"

# 等素材域名切到本次版本（域名还没绑好时取不到，live=0，主站发布会自动不拆）。
for attempt in $(seq 1 12); do
  now="$(GITHUB_OUTPUT= node scripts/assets-split.mjs remote --base "$base" || true)"
  if [[ "$now" == "$local_hash" ]]; then
    echo "素材域名 ${base} 已是本次版本（第 ${attempt} 次探测）。"
    echo "live=1" >> "$out"
    exit 0
  fi
  echo "素材域名上还是 ${now:-（取不到）}，15 秒后再看（${attempt}/12）"
  sleep 15
done
echo "::warning::素材项目已部署，但 ${base} 上还取不到本次版本（域名可能还没绑定或没生效）。主站发布会自动不拆。"
echo "live=0" >> "$out"
