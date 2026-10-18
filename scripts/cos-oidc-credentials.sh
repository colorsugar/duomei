#!/bin/bash
# 用 GitHub Actions 的 OIDC 身份令牌换腾讯云 STS 临时凭证，给 COS 上传用。仓库里不存、也不用任何长期密钥。
#
# 用法（在 bash 里 source，凭证只留在当前这一步的进程里，不写 GITHUB_ENV）：
#   source scripts/cos-oidc-credentials.sh
#   cos_oidc_assume || echo 换凭证失败
# 成功后导出 COS_TMP_SECRET_ID / COS_TMP_SECRET_KEY / COS_TMP_TOKEN（都先 ::add-mask:: 打码），返回 0；
# 失败只打印错误码和说明（不打印任何令牌），返回 1。
#
# 前提：job 有 permissions: id-token: write（GitHub 才会给 ACTIONS_ID_TOKEN_REQUEST_URL / _TOKEN）。
# 腾讯云那边：CAM 身份提供商 github-actions（客户端 ID sts.tencentcloudapi.com），
# 角色 duomei-deploy-oidc 信任 iss=https://token.actions.githubusercontent.com、aud=sts.tencentcloudapi.com、
# sub 匹配 repo:colorsugar/duomei:*；权限只有资产桶的 GetBucket / HeadObject / GetObject / PutObject。
#
# 接口：STS AssumeRoleWithWebIdentity，Version 2018-08-13，POST https://sts.tencentcloudapi.com/，
# 公共参数放请求头（X-TC-Action / X-TC-Version / X-TC-Region / X-TC-Timestamp），
# 此接口免签名：Authorization 填 SKIP，不带 X-TC-Token。
# 参数：ProviderId、WebIdentityToken、RoleArn、RoleSessionName、DurationSeconds（默认 7200，角色会话上限 2 小时）。
# 返回 Response.Credentials.{TmpSecretId,TmpSecretKey,Token}、ExpiredTime、Expiration、RequestId。
#
# 角色、身份提供商等都在 deploy/cos-assets.json 的 oidc 段，可用同名仓库变量覆盖：
#   COS_OIDC_ROLE_ARN、COS_OIDC_PROVIDER_ID

cos_oidc_assume() {
  local cfg="deploy/cos-assets.json"
  local role provider aud region host duration session
  role="${COS_OIDC_ROLE_ARN:-$(node -p "require('./${cfg}').oidc?.roleArn ?? ''")}"
  provider="${COS_OIDC_PROVIDER_ID:-$(node -p "require('./${cfg}').oidc?.providerId ?? ''")}"
  aud="$(node -p "require('./${cfg}').oidc?.audience ?? 'sts.tencentcloudapi.com'")"
  region="$(node -p "require('./${cfg}').oidc?.stsRegion ?? require('./${cfg}').region")"
  host="$(node -p "require('./${cfg}').oidc?.stsHost ?? 'sts.tencentcloudapi.com'")"
  duration="$(node -p "require('./${cfg}').oidc?.durationSeconds ?? 7200")"
  session="gh-${GITHUB_RUN_ID:-local}-${GITHUB_RUN_ATTEMPT:-1}"

  if [[ -z "$role" || -z "$provider" ]]; then
    echo "OIDC：deploy/cos-assets.json 的 oidc.roleArn / oidc.providerId 没填。" >&2
    return 1
  fi
  if [[ -z "${ACTIONS_ID_TOKEN_REQUEST_URL:-}" || -z "${ACTIONS_ID_TOKEN_REQUEST_TOKEN:-}" ]]; then
    echo "OIDC：拿不到 GitHub 身份令牌接口（job 要加 permissions: id-token: write）。" >&2
    return 1
  fi

  # 1) 向 GitHub 要 audience=sts.tencentcloudapi.com 的身份令牌（JWT，约 10 分钟有效）。
  local idtoken
  idtoken="$(curl -sSf -m 30 \
    -H "Authorization: bearer ${ACTIONS_ID_TOKEN_REQUEST_TOKEN}" \
    "${ACTIONS_ID_TOKEN_REQUEST_URL}&audience=${aud}" | jq -r '.value // empty')" || idtoken=""
  if [[ -z "$idtoken" ]]; then
    echo "OIDC：GitHub 没有返回身份令牌。" >&2
    return 1
  fi
  echo "::add-mask::${idtoken}"

  # 2) 换腾讯云临时凭证。请求体从标准输入传给 curl，令牌不出现在命令行参数里。
  local resp
  resp="$(jq -nc \
      --arg p "$provider" --arg t "$idtoken" --arg r "$role" --arg s "$session" --argjson d "$duration" \
      '{ProviderId:$p, WebIdentityToken:$t, RoleArn:$r, RoleSessionName:$s, DurationSeconds:$d}' \
    | curl -sS -m 30 -X POST "https://${host}/" \
      -H "Content-Type: application/json; charset=utf-8" \
      -H "Authorization: SKIP" \
      -H "X-TC-Action: AssumeRoleWithWebIdentity" \
      -H "X-TC-Version: 2018-08-13" \
      -H "X-TC-Region: ${region}" \
      -H "X-TC-Timestamp: $(date +%s)" \
      --data-binary @-)" || resp=""
  idtoken=""
  if [[ -z "$resp" ]]; then
    echo "OIDC：连不上 ${host}。" >&2
    return 1
  fi

  local err_code
  err_code="$(jq -r '.Response.Error.Code // empty' <<<"$resp" 2>/dev/null)"
  if [[ -n "$err_code" ]]; then
    echo "OIDC：STS AssumeRoleWithWebIdentity 失败：${err_code} $(jq -r '.Response.Error.Message // ""' <<<"$resp")（RequestId $(jq -r '.Response.RequestId // ""' <<<"$resp")）" >&2
    return 1
  fi

  local sid skey stoken
  sid="$(jq -r '.Response.Credentials.TmpSecretId // empty' <<<"$resp" 2>/dev/null)"
  skey="$(jq -r '.Response.Credentials.TmpSecretKey // empty' <<<"$resp" 2>/dev/null)"
  stoken="$(jq -r '.Response.Credentials.Token // empty' <<<"$resp" 2>/dev/null)"
  # 先打码，再做任何别的事。
  [[ -n "$sid" ]] && echo "::add-mask::${sid}"
  [[ -n "$skey" ]] && echo "::add-mask::${skey}"
  [[ -n "$stoken" ]] && echo "::add-mask::${stoken}"
  if [[ -z "$sid" || -z "$skey" || -z "$stoken" ]]; then
    echo "OIDC：STS 返回里没有完整的临时凭证（RequestId $(jq -r '.Response.RequestId // ""' <<<"$resp" 2>/dev/null)）。" >&2
    return 1
  fi
  echo "OIDC：已换到腾讯云临时凭证（角色 ${role##*/}，会话 ${session}，到期 $(jq -r '.Response.Expiration // ""' <<<"$resp")，RequestId $(jq -r '.Response.RequestId // ""' <<<"$resp")）。"
  resp=""

  export COS_TMP_SECRET_ID="$sid" COS_TMP_SECRET_KEY="$skey" COS_TMP_TOKEN="$stoken"
  return 0
}
