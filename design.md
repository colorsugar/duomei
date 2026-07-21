# DUOMEI 多美小记 · UI System v3

## Direction

深夜影像档案。界面像一间熄灯后的放映室：靛黑纸面、暖白文字、琥珀信号色，以及真实的小记照片。酷炫来自影像比例、空间纵深和精确动效，不来自霓虹光晕、渐变标题或堆叠玻璃卡片。

## Page structures

- Home: Photographic Fold。首篇真实小记同时作为全幅背景与完整前景照片，标题和地点贴近画面边缘；随后进入横向影像档案。
- Note detail: Cinematic Long Document。完整封面优先，标题不裁切，正文保持窄阅读列，图片可进入原生灯箱查看原图。
- Time: Atmospheric Canvas。保留现有诗词画布与编辑能力，只统一暗场、文字、控件和边界。
- Admin and note editor: Index-first Workbench。扁平、密集、明确，不制造卡中卡。
- Navigation: N5 Floating Pill。桌面为内容宽胶囊，移动端为单行品牌 + 菜单开关。
- Footer: Ft5 Statement。以一句现有站点宣言收尾，导航退居其后。

## Color

- 深靛黑为纸面，不使用纯黑。
- 暖白为主文字，雾灰为次级文字。
- 电影琥珀是唯一交互强调色。
- 红色仅用于错误和不可逆操作。
- 所有颜色均来自 `tokens.css` 的 OKLCH 变量。

## Typography

- Display / wordmark: Syne Variable；仅用于 DUOMEI、主标题与少量强标签。
- Body / controls: Geist Variable + 中文系统黑体。
- Long-form reading: 宋体 / Yu Mincho；仅用于正文与引用。
- 标题使用流体字号与 `overflow-wrap: anywhere`，任何宽度都不得截断。

## Space and shape

- 4px 基础节奏；容器横向留白使用流体值。
- 内容最大宽度 1240px；正文最大宽度 720px。
- 照片舞台可大，但前景照片始终 `object-fit: contain`，保证完整可见。
- 导航和控制可使用胶囊；内容卡片以直角/小圆角为主。
- 暗色层级靠表面明度和细线，不靠彩色发光阴影。

## Motion

- 三种原语上限：首屏照片轻微定场、单次遮罩显现、控件按压反馈。
- 只动画 `transform` 与 `opacity`；焦点环立即出现。
- 卡片既有 rAF 3D 倾斜管线原样保留，`.is-tilting` 期间不增加 transform transition。
- `prefers-reduced-motion` 下空间运动降为不超过 150ms 的透明度切换。

## Components

- Primary action: 琥珀实底 + 深色文字。
- Secondary action: 深色表面 + 细边线。
- Inputs: 固定 1px 边框，44px 高度，焦点不改变几何。
- Cards: 照片主导、信息贴边、无卡中卡。
- Dialogs/lightbox: 原生 dialog 语义，图片 `contain`，关闭和翻页控件至少 44px。
- Empty/error/loading: 明确说明状态与下一步，不使用泛化提示。

## Responsive rules

- 强制验证 320、375、414、768、1280、1440 CSS px。
- `html` 与 `body` 使用 `overflow-x: clip`。
- 所有可点击文字保持单行；空间不足时重排容器或折叠菜单。
- 图像网格使用 `minmax(0, 1fr)`。
- 移动端首屏前景照片保持完整，说明文字进入图片下方。
- 触屏控件最小 48px；标题、标签和内容不得遮挡、溢出或裁切。

## Accessibility

- 每页一个可识别的 `h1`。
- 所有交互元素有高对比 `:focus-visible`。
- 颜色不是唯一状态信号。
- 装饰背景图对辅助技术隐藏；内容图保留真实 alt。
- 弹窗支持 Escape、焦点管理和明确关闭按钮。

## Exports

### CSS custom properties

`tokens.css` 是源文件，包含 `--color-*`、`--font-*`、`--space-*`、`--text-*`、`--ease-*`、`--dur-*`、`--rule-*` 与 `--radius-*`。

### Tailwind v4

```css
@theme {
  --color-paper: oklch(13% 0.018 270);
  --color-paper-2: oklch(17% 0.022 270);
  --color-paper-3: oklch(22% 0.026 270);
  --color-ink: oklch(94% 0.012 88);
  --color-ink-2: oklch(78% 0.018 86);
  --color-muted: oklch(66% 0.016 270);
  --color-rule: oklch(30% 0.025 270);
  --color-accent: oklch(79% 0.16 78);
  --color-focus: oklch(86% 0.18 82);
  --font-display: "Syne Variable", "Microsoft YaHei", sans-serif;
  --font-body: "Geist Variable", "Microsoft YaHei", sans-serif;
  --font-outlier: "Yu Mincho", "Songti SC", serif;
  --spacing-3xs: 0.25rem;
  --spacing-2xs: 0.5rem;
  --spacing-xs: 0.75rem;
  --spacing-sm: 1rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2rem;
  --spacing-xl: 3rem;
  --spacing-2xl: 4.5rem;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.25rem;
  --text-xl: 1.75rem;
  --text-2xl: 2.5rem;
  --radius-card: 0.5rem;
  --radius-pill: 999px;
  --radius-input: 0.625rem;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in: cubic-bezier(0.7, 0, 0.84, 0);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
}
```

### DTCG tokens.json

```json
{
  "$schema": "https://design-tokens.github.io/community-group/format/",
  "color": {
    "paper": { "$value": "oklch(13% 0.018 270)", "$type": "color" },
    "paper-2": { "$value": "oklch(17% 0.022 270)", "$type": "color" },
    "paper-3": { "$value": "oklch(22% 0.026 270)", "$type": "color" },
    "ink": { "$value": "oklch(94% 0.012 88)", "$type": "color" },
    "ink-2": { "$value": "oklch(78% 0.018 86)", "$type": "color" },
    "muted": { "$value": "oklch(66% 0.016 270)", "$type": "color" },
    "rule": { "$value": "oklch(30% 0.025 270)", "$type": "color" },
    "accent": { "$value": "oklch(79% 0.16 78)", "$type": "color" },
    "focus": { "$value": "oklch(86% 0.18 82)", "$type": "color" }
  },
  "font": {
    "display": { "$value": "Syne Variable, Microsoft YaHei, sans-serif", "$type": "fontFamily" },
    "body": { "$value": "Geist Variable, Microsoft YaHei, sans-serif", "$type": "fontFamily" },
    "outlier": { "$value": "Yu Mincho, Songti SC, serif", "$type": "fontFamily" }
  },
  "duration": {
    "micro": { "$value": "120ms", "$type": "duration" },
    "short": { "$value": "220ms", "$type": "duration" },
    "long": { "$value": "520ms", "$type": "duration" }
  }
}
```

### shadcn/ui

```css
:root {
  --background: 13% 0.018 270;
  --foreground: 94% 0.012 88;
  --card: 17% 0.022 270;
  --card-foreground: 94% 0.012 88;
  --popover: 17% 0.022 270;
  --popover-foreground: 94% 0.012 88;
  --primary: 79% 0.16 78;
  --primary-foreground: 16% 0.02 270;
  --secondary: 22% 0.026 270;
  --secondary-foreground: 94% 0.012 88;
  --muted: 30% 0.025 270;
  --muted-foreground: 78% 0.018 86;
  --accent: 79% 0.16 78;
  --accent-foreground: 16% 0.02 270;
  --destructive: 58% 0.2 25;
  --destructive-foreground: 96% 0.01 88;
  --border: 30% 0.025 270;
  --input: 30% 0.025 270;
  --ring: 86% 0.18 82;
  --radius: 0.5rem;
}
```

## Preservation contract

不改 Supabase、本地存储、发布/草稿、备份恢复、上传裁切、路由和诗词编辑器业务逻辑。旧版保留在 `codex/feat-ui-refresh-v2`；v3 用独立视觉层和独立 Preview，可直接回退。
