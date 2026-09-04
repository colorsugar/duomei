# DUOMEI

DUOMEI 多美小记是保存旅途记录、生活片段、照片、诗页和旧册的个人网站。

## AI 与维护人员先读

1. [`AGENTS.md`](AGENTS.md)
2. [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)
3. [`docs/release-source-of-truth.md`](docs/release-source-of-truth.md)
4. 新增故语画册时再读 [`docs/guyu-book-import.md`](docs/guyu-book-import.md)

`PROJECT_CONTEXT.md` 记录当前架构、正式环境、路由、数据流、用户维护偏好、发布验收和已知审计问题。任何 AI 开工前都必须先核对它与 Git/线上构建标记。

## 当前技术栈

- React 19、Vite、TypeScript、React Router
- 原生 Three.js 0.170.0：React `/yunyou-map` 音乐外壳内嵌同源桂林两江四湖 3D 地图
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
- 正式分支：`main`
- 自动流程：`.github/workflows/deploy-edgeone.yml`

推送正式分支后，流水线会测试、构建、执行发布门禁、部署到固定 EdgeOne 项目，并核对线上提交标记与受保护接口。完整流程见 [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)。

同仓库 `cursor/*` 分支提交的普通站点 ready PR 会先运行 [`PR Validation`](.github/workflows/pr-validation.yml)；可信工作流随后复核精确 SHA 和改动路径，自动 squash 合并 `main` 并显式触发 [EdgeOne 正式流程](.github/workflows/deploy-edgeone.yml)。失败、Draft 或修改工作流/依赖/部署与服务端安全边界的 PR 不会自动发布，也不需要把任何平台 Token 交给 Cursor。

Vercel、GitHub Pages 和旧 candidate 分支仅为保留的兼容/迁移路径，不是当前正式发布目标。

公开 `新说` 画册直接作为 Git 静态资源保存：封面使用 `public/images/guyu-<book-id>-cover.webp`，书页使用 `public/images/guyu/<book-id>/pages/`。它们随 `main` 的 EdgeOne workflow 发布，不需要 Cloudflare、腾讯云、R2 或 EdgeOne Token。只有现有 `meiyou-yujian` 是 EdgeOne Blob 私有册；新增私有册必须先取得明确授权。

桂林 3D 地图通过 `https://duomei.site/yunyou-map` 进入，外层沿用主站音乐播放器，内层从 `/yunyou/index.html?embed=1` 加载，不依赖 Vercel Preview。运行文件位于 `public/yunyou/`；Three.js 必要模块已固定并本地化，许可证保存在同目录。顶层 `/yunyou/` 会进入音乐外壳，`?standalone=1` 仅保留给诊断。正式站只允许 `/yunyou/*` 被同源页面嵌入，其他页面继续拒绝 framing。

## 凭据与私有内容

README、源码、测试和公开文档中不得保存真实登录凭据、Guyu 答案、Hash/Salt、API Token、Session Cookie、原始 PDF 或私有书页。LocalStorage 只用于界面状态和本地草稿，服务端授权由 EdgeOne/Supabase 的真实会话与权限负责。
