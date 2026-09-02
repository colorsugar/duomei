# Supabase 保留边界

以下状态由用户提供，仅用于避免错误迁移，不包含任何密钥或个人信息。

- 现有项目：`bokvqndvwqgugkcrizwj`
- 地域：`ap-southeast-1`
- 状态：`ACTIVE_HEALTHY`
- 角色：继续承担 DUOMEI 既有数据库与 Auth

当前 EdgeOne 正式站不会创建、删除、暂停或迁移该 Supabase 项目，也不会提交 `service_role`、JWT secret 或用户数据。Supabase custom domain 只改变 API URL且不托管 React 前端，因此 `duomei.site` 不能解析到 Supabase。

画册密码门是独立的服务端门禁：当前 EdgeOne Makers Cloud Function 校验答案和会话，原稿保存在私有 EdgeOne Pages Blob `guyu-private` 的固定前缀。保留的 Vercel/Cloudflare 回退链使用私有 R2 `duomei-private`。Supabase Auth 不替代画册密码，Supabase Storage 也不作为公开原稿目录。
