# DUOMEI

DUOMEI 多美小记是一个个人记录网站，用来保存旅途记录、生活片段、旅行照片和心情文字。

## 技术栈

- Vite
- React
- TypeScript
- React Router
- Supabase

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物输出到 `dist/`。

## 后台登录

- 地址：`/admin/login`
- 登录方式：Supabase Auth
- 管理员账号请在 Supabase Authentication 中创建和维护。

README、代码和公开文档中不保存任何可直接使用的登录凭据。

## 数据发布

正式内容以 Supabase Database 和 Supabase Storage 为准。

LocalStorage 只用于草稿缓存、编辑状态和本地备份，不作为正式发布数据源。

## 部署

源码托管在 GitHub，正式站点通过 Vercel 部署。

GitHub Pages 可作为备用静态版本保留，但不再作为正式内容发布流程。
