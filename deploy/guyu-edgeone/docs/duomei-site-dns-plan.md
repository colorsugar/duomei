# duomei.site 历史 DNS 预案（已完成，禁止执行）

> 历史状态说明（2026-09-02）：域名已经投入 EdgeOne 正式使用，本文件仅保留首次上线前的计划证据。不要把下方“尚未执行/值为空/新建候选”当成当前状态，也不要重复改 DNS。当前平台与回退边界见 `../../../PROJECT_CONTEXT.md`。

以下是 2026-09-01 首次上线前“已授权但尚未执行”的历史清单，不代表当前状态。当前不得依照表格重新添加、删除或覆盖 DNS 记录。

## 历史计划记录（禁止执行）

| 顺序 | 用途 | 主机记录 | 类型 | 记录值 | 当前状态 |
|---|---|---|---|---|---|
| 1 | Makers 域名归属权 | EdgeOne 页面下发 | 以页面为准 | EdgeOne 页面下发 | 待登录后获取 |
| 2 | Makers 项目入口 | `@` | CNAME | EdgeOne 页面下发 | 待部署后获取 |
| 3 | HTTPS 验证 | 证书页面下发 | TXT 或 CNAME，以页面为准 | 证书页面下发 | 待域名添加后确认 |

EdgeOne 官方流程要求先验证域名归属、再添加 CNAME；自定义域名添加后不会自动生成证书，HTTPS 要求必须在项目域名管理页确认。任何记录都不能用参考站、Supabase 项目标识或示例值代替。

## 历史平台选择记录

- EdgeOne Makers 加速区域：全球可用区（不含中国大陆）。
- Cloud Functions 海外地域：`ap-singapore`。
- 根域名：`duomei.site`，关联新候选项目的预览/候选环境，不关联任何现有正式项目。
- Supabase 继续作为业务 API/Auth，不能作为 `duomei.site` 的 DNS 目标。

## 历史安全约束

- 不预填 A、AAAA 或固定腾讯 IP；调度由 EdgeOne 下发的 CNAME 完成。
- 不复制 `xiaogai.fun`、CloudBase、Supabase 或任何现有 Vercel 地址。
- 不配置邮件 MX/SPF/DKIM，不改 `dns15.hichina.com`、`dns16.hichina.com`。
- 不猜 EdgeOne TXT/CNAME，不在拿到平台值前创建空记录。
- 不删除既有记录。若 `@` 存在冲突记录，先停止并报告实际冲突。

## 历史执行顺序（禁止重复）

1. 登录 EdgeOne Makers，创建全新候选项目并选全球可用区（不含中国大陆）。
2. 部署成功后记录项目 ID、部署 ID 和可回退版本。
3. 在域名管理添加 `duomei.site`，逐字记录平台下发的归属记录、CNAME 和 HTTPS 要求。
4. 保存阿里云 DNS 变更前快照，只添加确认过的记录。
5. 验证公共 DNS、HTTPS、同源 API，再执行大陆真机与三网 Prototype Gate。

## 历史候选回退设想（不适用于当前生产）

只撤销本次新增且已留存快照的 EdgeOne TXT/CNAME，或解绑新候选项目域名；不删除域名、不改 NS、不删除私有原稿、不修改 Supabase，也不触碰现有正式站。
