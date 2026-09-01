# EdgeOne 全球不含大陆候选架构

## 定位

`duomei.site` 不备案，因此唯一允许的 EdgeOne 加速区域是“全球可用区（不含中国大陆）”。EdgeOne Makers 同时承载静态前端和 Node.js Cloud Functions；后端函数明确部署到 `ap-singapore`，不依赖 CloudBase 自定义域名。

现有 Supabase 继续作为 DUOMEI 数据库/Auth 后端，但不是 React 托管源站。`duomei.site` 只指向 EdgeOne Makers；画册私有原稿不放入 Supabase 公共存储，密码门也不改成前端可绕过的 Supabase 查询。CloudBase 自定义域名路径已从候选删除。

## 同源数据流

1. `duomei.site` 经 EdgeOne 全球不含大陆节点进入 Makers 项目。
2. 静态路径返回 Vite/React 产物；`/api/*` 由 `cloud-functions/api/[[default]].js` 优先处理。
3. `/api/guyu-auth` 在服务端校验 PBKDF2 摘要并签发 HttpOnly 会话。
4. `/api/guyu-page` 校验 Cookie、固定书 ID 和 `001`—`053` 页码。
5. Cloud Function 使用 EdgeOne Pages Blob 的固定 `guyu-private` 命名空间读取固定私有对象，再以同源 `image/webp` 返回。
6. 图片响应使用 `private, no-store` 和 `CDN-Cache-Control: no-store`，EdgeOne 不缓存受保护页。
7. 既有 DUOMEI 业务若需要数据库/Auth，继续调用原 Supabase 项目；独立画册 API 不使用或暴露 Supabase `service_role`。

## 固定边界

- 唯一书 ID：`meiyou-yujian`
- 唯一页数：53
- 唯一对象前缀：`private-media/guyu/meiyou-yujian/pages`
- 单页最大响应：5.5 MB
- Cloud Functions 海外地域：`ap-singapore`
- EdgeOne 加速区域：全球可用区（不含中国大陆）
- 不接受客户端提供文件路径、Bucket、区域、URL 或 MIME 类型
- 不把原稿、答案、明文 Cookie、会话密钥或上传密钥写入前端、Git 或静态目录

## 域名门禁

域名状态与 DNS 修改授权已满足，但平台下发值仍为空。只有新 Makers 项目成功部署后，才从控制台取得：

1. 域名归属权验证记录。
2. 项目 CNAME。
3. HTTPS 证书申请/绑定要求。

禁止参考其他站点猜值。所有记录先落入 [duomei-site-dns-plan.md](duomei-site-dns-plan.md) 复核，再执行 DNS 修改。

## 回退

候选使用全新 Makers 项目、Cloud Functions 和 Blob 命名空间。回退仅撤销这次新增的 DNS 记录或解绑候选域名；不修改现有正式站、不删除域名、不迁移或删除原稿。
