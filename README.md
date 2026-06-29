# DUOMEI 多美小记

DUOMEI 多美小记是一个极简个人记录网站，用来保存旅途记录、生活记录、旅行照片和心情文字。

## 技术栈

- Vite
- React
- TypeScript
- React Router
- localStorage CMS

## 本地运行

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

构建产物会输出到 `dist/`。

## 后台登录

- 地址：`/admin/login`
- 账号：`tami`
- 密码：`tamidesu`

当前后台使用浏览器 `localStorage` 保存内容。正式发布前建议在后台先导出 JSON 备份，再生成默认发布数据。

## GitHub Pages

项目使用 Vite，并设置了 `base: "./"`，方便部署到 GitHub Pages。

推荐流程：

```bash
npm run build
```

然后通过 GitHub Actions 或 Pages 发布 `dist/`。如果绑定自定义域名，记得同步更新 `public/sitemap.xml` 和 Open Graph 里的正式网址。
