# 公开故语画册导入流程

本文只适用于新增 `access: "public"` 的故语“新说”画册。它是仓库根站的静态资源导入流程，不是私有原稿上传流程。

## 先确认范围

1. 在 `C:\Users\刘诚颢\Documents\color` 执行 `git status --short --branch`。必须确认自己在正确的 `color` checkout；发现错误 checkout 或错误 branch，立即停止，不切换、不覆盖他人的工作。
2. 先阅读 `AGENTS.md`、`PROJECT_CONTEXT.md` 和 `docs/release-source-of-truth.md`。保留已有未提交内容，只在本流程涉及的文件上工作。
3. 本流程只接受公开静态素材：一个 `book-id`、一张 preview cover，以及按顺序编号的 WebP 页面。不要把密码、原稿、用户数据、Token、Cookie、JWT 或任何 Secret 放进素材、代码、日志或文档。

## 文件放置

在仓库根目录创建下列结构（`book-id` 使用小写 kebab-case，并与代码中的 `id` 完全一致）：

```text
public/images/guyu-{book-id}-cover.webp
public/images/guyu/{book-id}/pages/001.webp
public/images/guyu/{book-id}/pages/002.webp
...
public/images/guyu/{book-id}/pages/NNN.webp
```

只放根级 preview cover 和对应书目录下的 pages 文件。不要顺手加入原始 PDF、PSD、源工程、contact sheet、临时图、隐藏文件或私有副本。页面必须是可直接静态读取的 WebP；页面数量 `NNN` 应与实际文件数一致，编号从 `001` 连续到最后一页，不能跳号、重复或用自然排序导致 `10` 排在 `2` 前面。

## 更新画册清单

在 `src/content/guyuBooks.ts` 添加公开新册的静态路径和元数据：

- `id` 使用目录名 `{book-id}`；`chapter` 为 `"新说"`；`access` 必须为 `"public"`。
- `pages` 使用现有 `publicBookPages(bookId, count)`，因此每页 URL 必须是 `/images/guyu/{book-id}/pages/{001..}.webp`。
- `previewCoverSrc` 使用 `/images/guyu-{book-id}-cover.webp`；`coverSrc` 使用公开第一页或这张独立封面，按画册设计选择。两者都不得指向 `/api/guyu-page`、`private-media`、Blob/R2 URL 或鉴权接口。
- `pageCount`、`pages.length`、`pageDescriptions.length` 与真实页数一致；公开新册的 `logicalPages` 必须全部是 `placement: "full"`，不要复用旧册的扫描拆分/堆叠逻辑。
- 填完整的 `title`、可选 `author`、`kind`、`description`、`accessibilityNote`、`previewAccent`，并把新册加入 `guyuBooks` 的公开新说位置。

页面描述必须按 `001` 到末页排列。不要修改 `meiyou-yujian` 的 53 页私有路径或其 class gate。

## 更新测试与序列哈希

在 `server/guyuBooks.test.ts` 为新册增加明确断言：`chapter`、`kind`、`access`、页数、封面 URL、描述数、全部 `full`，以及页面 URL 的完整顺序。把新册加入“公开页面存在、有序、字节稳定”测试的 `expectedHashes`，并按现有方式对 `001.webp` 到最后一页连续读取、校验 WebP 签名后计算 SHA-256 聚合哈希。

哈希不是装饰：素材确认后记录聚合值；任何页面替换、重编码、重排或增删都必须重新审查并同步测试序列。不要为了让测试通过而删除哈希或放宽页数/文件名断言。

同时完成发布契约更新：

- 在 `scripts/verify-release.ps1` 的 Guyu bundle 和 `$publicCoverHashes` 中加入新 preview cover 路径与 SHA-256。
- 在 `.github/workflows/deploy-edgeone.yml` 的生产探针中加入新册 `pages/001.webp`，保证发布后真实静态页返回 `200`。
- 更新 `PROJECT_CONTEXT.md` 与 `docs/release-source-of-truth.md` 中的公开画册清单、页数和来源审计记录。
- 若使用新的 `previewAccent` token，同步 `tokens.css`；优先复用现有合适 token，不为一册重复造色板。

## 本地验收与正式发布责任

完成代码和测试更新后，由主流程运行正式验证：

```powershell
npm.cmd run test:home-hold
npm.cmd run test:guyu
npm.cmd run build
npm.cmd run release:check
```

**Never request or use account credentials for a public Guyu import.** 真正交付公开画册时，必须确认上述 tests/build/release 全部通过，再由主流程提交并推送 `main`；现有 EdgeOne GitHub Actions 会使用仓库已有的 Secret 发布。不要运行 `edgeone login`、任何 Token 登录、`edgeone ... deploy`，不要使用 Cloudflare R2/Worker CLI，也不要向用户索取 Cloudflare/Tencent/R2/EdgeOne Token。

发布后由负责发布的主流程验证公开 shelf 和 `/guyu/{book-id}` 页面可读；这属于正式发布验收，不由本导入文档代替。

## 私有册升级条件

新增册默认只能是公开静态册。只有用户明确授权新增 `class-gated` / private 册时，才停止当前公开导入流程并升级到主代理，重新设计存储、鉴权、Secret 和发布验证。现有 `meiyou-yujian` 是唯一私有册，使用 EdgeOne Pages Blob；不得把公开新册改成私有册，也不得把它接入保留的 Cloudflare fallback。
