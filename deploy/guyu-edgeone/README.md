# “没有遇见 何来艳遇”EdgeOne 独立候选

本目录是与现有正式站完全隔离的 EdgeOne Makers 可部署制品。长期入口固定为 `duomei.site`，加速区域必须选择**全球可用区（不含中国大陆）**，因此按 EdgeOne 当前官方规则不要求 ICP 备案。

## 当前结论

- 禁止把 `duomei.site` 直接绑定 CloudBase：CloudBase 当前官方文档把 ICP 备案列为自定义域名前提，开启 EdgeOne 加速也没有免备案例外。
- EdgeOne Makers 项目域名在中国大陆只能通过 3 小时预览链接访问，不能当长期入口；`duomei.site` 自定义域名才是长期 Prototype 入口。
- 用户已确认域名正常并授权 DNS 修改，但目前没有 EdgeOne/腾讯云登录授权，无法创建项目、获取真实 TXT/CNAME、配置证书或部署。
- 现有 Supabase 项目继续承担 DUOMEI 数据库/Auth；本候选不迁移、不修改该项目，也不把 `duomei.site` 解析到 Supabase。画册密码门与私有原稿仍由同源 Makers Cloud Function/COS 独立保护。
- DNS 尚未修改；不存在项目 ID、部署 ID 或可点击候选 URL。
- `color-duomei.vercel.app`、`color-rho-ten.vercel.app` 和其他既有正式资源不在操作范围内。

官方依据：

- [EdgeOne 加速区域及备案要求](https://cloud.tencent.com/document/product/1552/87601)
- [EdgeOne Makers 域名类型和大陆 3 小时预览限制](https://pages.edgeone.ai/document/domain-overview)
- [EdgeOne Makers 自定义域名流程](https://cloud.tencent.com/document/product/1552/127404)
- [Makers Node.js Cloud Functions](https://cloud.tencent.com/document/product/1552/127419)
- [edgeone.json 配置](https://cloud.tencent.com/document/product/1552/127389)
- [CloudBase 自定义域名备案前提](https://docs.cloudbase.net/service/custom-domain)

## 部署架构

- Vite/React 静态产物由 EdgeOne Makers 承载。
- `cloud-functions/api/[[default]].js` 在 Makers Node.js Cloud Functions 中运行，`edgeone.json` 将海外函数地域固定为 `ap-singapore`。
- 页面和 `/api/guyu-auth`、`/api/guyu-page` 保持同源；密码答案只发送给云函数。
- 答案使用 PBKDF2-SHA256（210,000 次）摘要，成功后仅下发 `HttpOnly; Secure; SameSite=Strict` 会话 Cookie。
- 云函数鉴权后只读取 EdgeOne Pages Blob 的 `guyu-private` 命名空间固定路径 `private-media/guyu/meiyou-yujian/pages/001.webp`—`053.webp`，不向前端暴露 Blob URL。
- 原稿、答案、Cookie 和会话密钥均不进入 Git、静态目录或 `edgeone.json`。
- Supabase 项目标识不是站点源站；任何现有业务调用继续使用原有 Supabase 配置，本独立画册页面不引入 `service_role` 或改写 Auth。

## 获得腾讯云授权后的步骤

必须新建项目和存储资源，不能选择或覆盖任何现有项目。

登录入口：[EdgeOne Makers 控制台](https://console.cloud.tencent.com/edgeone/pages)。CLI 使用官方当前命令族：

```bash
npm install -g edgeone
edgeone login
# 在提示中选择 Global，并在弹出的浏览器完成登录
edgeone whoami
```

若使用短期 API Token，只在 Makers 控制台的 API Token 页面创建并设置过期时间，通过本机 `EDGEONE_API_TOKEN` 或 CLI `-t` 参数传入；不得写入仓库、聊天或命令历史。

1. 登录 EdgeOne Makers，新建项目 `guyu-duomei-site-candidate`，项目根目录选择本目录。也可在本目录执行 `edgeone makers link` 关联这个全新项目。构建配置由 `edgeone.json` 提供：`npm ci`、`npm run build`、输出 `dist`、Node 22.17.1。
2. 加速区域只选“全球可用区（不含中国大陆）”。不得选择“中国大陆可用区”或包含中国大陆的全球区。
3. 在 EdgeOne Makers 项目中确认 `guyu-private` 命名空间与固定私有前缀已有 53 页。正式运行时只开放鉴权后的读取函数，不保留网页上传接口。
4. 把下列值配置到 Makers 项目环境变量/Secret；Blob 不需要 COS/CAM 密钥：

   ```text
   GUYU_ANSWER_SALT
   GUYU_ANSWER_HASH
   GUYU_SESSION_SECRET
   GUYU_STORAGE_PREFIX=private-media/guyu/meiyou-yujian/pages
   ```

   前三个值由 `node scripts/generate-secrets.mjs` 在本地生成。不要把输出粘贴到聊天、Git、构建日志或普通环境变量；密钥必须使用平台 Secret。
5. 执行 `edgeone makers deploy -e preview`，只部署到全新的 Makers 预览环境，记录真实项目 ID、部署 ID、构建日志和项目域名。大陆的项目域名只能用于 3 小时开发预览，不作为通过证据。
6. 在项目域名上验证：主页 `200`，`GET /api/guyu-auth` 返回 `200 {"authorized":false}`，未登录私有页返回 `401`；完整答案只在浏览器中输入。
7. 进入域名管理，添加 `duomei.site`。仅将控制台现场显示的归属验证记录、CNAME 和 HTTPS 要求填入 [DNS 清单](docs/duomei-site-dns-plan.md)，复核后才修改阿里云 DNS。
8. 自定义域名生效后运行 Prototype Gate：

   ```bash
   cp prototype-evidence.example.json prototype-evidence.json
   npm run prototype:gate -- \
     --base-url https://duomei.site/ \
     --evidence ./prototype-evidence.json
   ```

## Prototype Gate

候选必须同时通过：

- 精确 URL 首页、匿名鉴权和未授权私有页自动检查。
- 48 小时内 tance.cc 至少 100 节点全部 HTTP 200、零超时；大陆至少 90，电信/联通/移动至少 30/30/29。
- 中国大陆普通网络真机验证密码门、首张私有页、触摸翻页、竖向滚动、预加载后翻页和失败重试。
- 记录 EdgeOne CNAME、解析 IP、响应头、部署 ID 和回退点。

拨测通过只证明当时可达，不代表三网 SLA，也不能把“全球不含大陆”描述成中国大陆节点。

## 回退

先保存 DNS 变更前快照。回退只撤销本次为 `duomei.site` 新增的 EdgeOne TXT/CNAME，或把自定义域名从新候选项目解绑；保留私有对象和部署记录用于审计。不得删除域名、修改 NS、删除原稿或触碰现有正式站。

## 本地验证

```bash
npm ci
npm run verify
npm run domain:release-gate -- ./domain-release-authorization.example.json
```

架构细节见 [docs/architecture.md](docs/architecture.md)，Supabase 边界见 [docs/supabase-boundary.md](docs/supabase-boundary.md)，精确 DNS 占位清单见 [docs/duomei-site-dns-plan.md](docs/duomei-site-dns-plan.md)。
