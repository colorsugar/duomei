# Supabase 保留边界

以下状态由用户提供，仅用于避免错误迁移，不包含任何密钥或个人信息。

- 现有项目：`bokvqndvwqgugkcrizwj`
- 地域：`ap-southeast-1`
- 状态：`ACTIVE_HEALTHY`
- 角色：继续承担 DUOMEI 既有数据库与 Auth

本候选不会创建、删除、暂停、迁移或修改该 Supabase 项目，不会提交 anon key、`service_role`、JWT secret 或用户数据。Supabase custom domain 只改变 API URL且属于付费附加能力，不托管 React 前端，因此 `duomei.site` 不能解析到 Supabase。

画册密码门是独立的服务端门禁：Makers Cloud Function 校验答案和会话，原稿保存在新加坡私有 COS 固定前缀。Supabase Auth 不替代画册密码，Supabase Storage 也不作为公开原稿目录。
