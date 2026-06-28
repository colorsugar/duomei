# TAMI Digital Archive

多美数字档案馆是一个个人数字档案网站，用来保存旅程、摄影、古文札记、文章、日本生活、介护工作记忆，以及 AI 旅伴留言。

它不是普通博客、摄影模板或简历，而是一个长期保存记忆的私人档案馆。

## 技术栈

- Vite
- React
- TypeScript
- React Router
- Lenis smooth scroll
- localStorage CMS

## 本地运行

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

构建产物会输出到 `dist/`。

## 后台登录

- 地址：`/admin/login`
- 账号：`tami`
- 密码：本地开发密码见项目需求说明

后台当前使用 localStorage 保存内容，适合本地开发和静态部署阶段使用。正式上线前可以替换为真实认证和后端存储。

## GitHub Pages 部署

项目使用 Vite，并设置了相对路径 `base: "./"`，方便部署到 GitHub Pages。

基本流程：

```bash
npm run build
```

然后将 `dist/` 发布到 GitHub Pages。由于这是 React Router 的单页应用，GitHub Pages 直连深层路径时需要额外 fallback 配置；如果不配置 fallback，建议从首页进入站内路由。

## Vercel 部署

在 Vercel 导入仓库后使用默认 Vite 配置即可：

- Build Command: `npm run build`
- Output Directory: `dist`

Vercel 支持 SPA fallback，前台与 `/admin` 路由可正常打开。
