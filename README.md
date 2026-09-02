# DUOMEI

DUOMEI 多美小记是保存旅途记录、生活片段、照片、诗页和旧册的个人网站。

## AI 与维护人员先读

1. [`AGENTS.md`](AGENTS.md)
2. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)
3. [`docs/release-source-of-truth.md`](docs/release-source-of-truth.md)

`PROJECT_CONTEXT.md` 记录当前架构、正式环境、路由、数据流、用户维护偏好、发布验收和已知审计问题。任何 AI 开工前都必须先核对它与 Git/线上构建标记。

## 当前技术栈

- React 19、Vite、TypeScript、React Router
- EdgeOne Makers：`duomei.site` 的正式托管、Node Cloud Functions、私有 Guyu Blob
- Supabase：笔记数据库和管理员 Auth/RLS
- Cloudflare Worker/R2：笔记媒体和保留的签名媒体路径

## 本地运行与验证

```bash
npm install
npm run dev
npm run test:home-hold
npm run test:guyu
npm run build
```

Windows PowerShell 中优先使用对应的 `npm.cmd` 命令。构建产物输出到 `dist/`。

## 正式部署

- 正式域名：`https://duomei.site`
- 正式平台：EdgeOne Makers
- 正式分支：`candidate/guyu-edgeone-global-20260901`
- 自动流程：`.github/workflows/deploy-edgeone.yml`

推送正式分支后，流水线会测试、构建、执行发布门禁、部署到固定 EdgeOne 项目，并核对线上提交标记与受保护接口。完整流程见 [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)。

Vercel、GitHub Pages 和 `main` 仅为保留的兼容/备用路径，不是当前正式发布目标。

## 凭据与私有内容

README、源码、测试和公开文档中不得保存真实登录凭据、Guyu 答案、Hash/Salt、API Token、Session Cookie、原始 PDF 或私有书页。LocalStorage 只用于界面状态和本地草稿，服务端授权由 EdgeOne/Supabase 的真实会话与权限负责。
