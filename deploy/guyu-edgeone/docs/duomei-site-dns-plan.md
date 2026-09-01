# duomei.site DNS 记录预案

这是已授权但尚未执行的清单。所有记录名称和值必须从 EdgeOne Makers/证书控制台现场复制；当前因腾讯云尚未登录，精确值仍为空，阿里云 DNS 没有发生变更。

## 计划记录

| 顺序 | 用途 | 主机记录 | 类型 | 记录值 | 当前状态 |
|---|---|---|---|---|---|
| 1 | Makers 域名归属权 | EdgeOne 页面下发 | 以页面为准 | EdgeOne 页面下发 | 待登录后获取 |
| 2 | Makers 项目入口 | `@` | CNAME | EdgeOne 页面下发 | 待部署后获取 |
| 3 | HTTPS 验证 | 证书页面下发 | TXT 或 CNAME，以页面为准 | 证书页面下发 | 待域名添加后确认 |

EdgeOne 官方流程要求先验证域名归属、再添加 CNAME；自定义域名添加后不会自动生成证书，HTTPS 要求必须在项目域名管理页确认。任何记录都不能用参考站、Supabase 项目标识或示例值代替。

## 固定平台选择

- EdgeOne Makers 加速区域：全球可用区（不含中国大陆）。
- Cloud Functions 海外地域：`ap-singapore`。
- 根域名：`duomei.site`，关联新候选项目的预览/候选环境，不关联任何现有正式项目。
- Supabase 继续作为业务 API/Auth，不能作为 `duomei.site` 的 DNS 目标。

## 明确不添加

- 不预填 A、AAAA 或固定腾讯 IP；调度由 EdgeOne 下发的 CNAME 完成。
- 不复制 `xiaogai.fun`、CloudBase、Supabase 或任何现有 Vercel 地址。
- 不配置邮件 MX/SPF/DKIM，不改 `dns15.hichina.com`、`dns16.hichina.com`。
- 不猜 EdgeOne TXT/CNAME，不在拿到平台值前创建空记录。
- 不删除既有记录。若 `@` 存在冲突记录，先停止并报告实际冲突。

## 执行顺序

1. 登录 EdgeOne Makers，创建全新候选项目并选全球可用区（不含中国大陆）。
2. 部署成功后记录项目 ID、部署 ID 和可回退版本。
3. 在域名管理添加 `duomei.site`，逐字记录平台下发的归属记录、CNAME 和 HTTPS 要求。
4. 保存阿里云 DNS 变更前快照，只添加确认过的记录。
5. 验证公共 DNS、HTTPS、同源 API，再执行大陆真机与三网 Prototype Gate。

## 回退

只撤销本次新增且已留存快照的 EdgeOne TXT/CNAME，或解绑新候选项目域名；不删除域名、不改 NS、不删除私有原稿、不修改 Supabase，也不触碰现有正式站。
