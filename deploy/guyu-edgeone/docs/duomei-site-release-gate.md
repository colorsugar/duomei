# duomei.site 历史发布门禁（已完成，禁止重复执行）

> 历史状态说明（2026-09-02）：本文件记录首次候选上线前的域名授权门禁。`duomei.site` 现已绑定并由仓库根目录自动部署到 EdgeOne Makers `duomei-guyu`（`makers-brifmhu31vjf`）。不要重复执行“新建候选项目”或猜写 DNS；当前维护以 `../../../PROJECT_CONTEXT.md` 为准。

记录日期：2026-09-01。以下域名状态由用户提供，仅用于部署编排，不包含或要求任何个人身份信息。

## 2026-09-01 历史状态

- 域名：`duomei.site`
- 注册商：Alibaba Cloud / HiChina
- 创建：2026-09-01
- 到期：2036-09-01
- 权威 DNS：`dns15.hichina.com`、`dns16.hichina.com`
- 实名认证：阿里云官方通知已成功
- ICP：本跨境候选不办理；通知中的至少 3 天等待期仅与后续备案申请有关
- 注册局/解析状态：阿里云当前显示“正常”，用户确认 `clientHold` 等待阶段已结束
- DNS 授权：用户已明确允许为本 EdgeOne Makers 全球不含大陆候选配置 `duomei.site`

## 历史门禁条件（已完成）

下面四项现已满足，域名发布门禁可以通过：

1. 实名认证明确通过（已满足）。
2. 阿里云状态正常，`clientHold` 等待阶段结束。
3. 用户明确授权修改 `duomei.site` DNS（已满足）。
4. 操作目标固定为全新的 EdgeOne Makers 候选项目，Cloud Functions 在新加坡运行，而非任何现有正式站。

`npm run domain:release-gate -- ./domain-release-authorization.json` 只检查本地门禁状态，不执行 DNS、证书或 EdgeOne 写操作。门禁通过后仍只能填写腾讯云控制台实际下发的值，禁止猜写。

本记录不保存短信账号标识、短信链接、姓名、证件、邮箱、手机号或其他个人信息。

## 历史候选操作范围（禁止重复执行）

- 仅在 `duomei.site` 添加 EdgeOne Makers 实际要求的所有权验证记录、CNAME 和 HTTPS 验证记录。
- 仅把域名绑定到新建的 `guyu-duomei-site-candidate` Makers 候选项目。
- 保留 DNS 变更前的记录快照；回退时只撤销本次新增记录。
- 不修改 `color-duomei.vercel.app`、`color-rho-ten.vercel.app` 或其他既有项目。

具体记录类型和占位值见 [duomei-site-dns-plan.md](duomei-site-dns-plan.md)。
