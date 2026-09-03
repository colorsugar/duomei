# Supabase 保留边界

以下状态由用户提供，仅用于避免错误迁移，不包含任何密钥或个人信息。

- 现有项目：`bokvqndvwqgugkcrizwj`
- 地域：`ap-southeast-1`
- 状态：`ACTIVE_HEALTHY`
- 角色：继续承担 DUOMEI 既有数据库与 Auth

当前 EdgeOne 正式站不会创建、删除、暂停或迁移该 Supabase 项目，也不会提交 `service_role`、JWT secret 或用户数据。Supabase custom domain 只改变 API URL且不托管 React 前端，因此 `duomei.site` 不能解析到 Supabase。

画册密码门是独立的服务端门禁：当前 EdgeOne Makers Cloud Function 校验答案和会话，原稿保存在私有 EdgeOne Pages Blob `guyu-private` 的固定前缀。保留的 Vercel/Cloudflare 回退链使用私有 R2 `duomei-private`。Supabase Auth 不替代画册密码，Supabase Storage 也不作为公开原稿目录。

## 公开新说画册边界

`access: "public"` 的新说画册不经过 Supabase、Cloudflare Worker、Cloudflare R2、EdgeOne Pages Blob 或任何鉴权 API。Cloudflare fallback 只保留给历史兼容链，**绝不适用于公开新说画册**。公开文件必须直接作为仓库静态资源保存：预览封面使用根目录 `public/images/guyu-{book-id}-cover.webp`，有序书页使用 `public/images/guyu/{book-id}/pages/001.webp`、`002.webp` …，都由 EdgeOne GitHub Actions 随根站发布。

公开画册不得写入 `private-media/`、`guyu-private`、`duomei-private`，也不得添加 `service_role`、JWT、Blob/R2 URL 或其他密钥。现有 `meiyou-yujian` 仍是唯一私有册，继续使用 EdgeOne Pages Blob；只有用户明确授权新增 `class-gated` / private 册时，才升级到主代理重新评估存储和门禁边界。
