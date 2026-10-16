# 题字字体出处（dgy-assets/fonts/）

用户 10-08 定：要有毛笔笔意，不要印刷体楷书；看过五款样张后选王漢宗中行書繁，**匾额、对联、石匾、石碣、镜面石、酒幌全部用它**。

## 王漢宗中行書繁（HanWangShinSuMedium）
- 文件：`HanWangShinSuMedium-dgy.woff2`（子集，约 79 KB；第 18 轮前 68 KB）
- 原字体：`wt071.ttf`，Version 1.3（2004），sha256 `50a8c5f2c8cfe6d218ec2041deb1902add56882348a86c518eaeab685678c0fe`
- 版权：(C) Copyright Dr. Hann-Tzong Wang（王漢宗，中原大學數學系）, 2002-2004；Edward G.J. Lee 整理
- 授权：**GNU GPL v2 或更新版本**（可商用；分发字体文件——包括本子集——须保持 GPL 并随附授权原文 `COPYING-HanWang-GPLv2.txt`；网页其他代码不受影响）
- 出处：https://github.com/dictcp-snapshot/wangfonts （code.google.com/p/wangfonts 的存档）`TrueType/wt071.ttf`
- 注：行书里「繞」「綠」等字的绞丝旁写成草化的「纟」形，这是行书的传统写法，不是简体字（指挥 10-08 确认可以接受）。

## 字表与重做子集
- 子集字表 `chars.txt`（题字繁体定稿 + plaques.js 的简体键 + 导览图 PDF 匾联列用到的字 + 标点）。繁体定稿的字全齐；简体键在这款 Big5 字体里本来就没有，用不到。
- 加了新题字：把字加进 `chars.txt`，再跑
  `uv run --with fonttools --with brotli pyftsubset wt071.ttf --text-file=dgy-assets/fonts/chars.txt --flavor=woff2 --no-hinting --desubroutinize --output-file=dgy-assets/fonts/HanWangShinSuMedium-dgy.woff2`
  原字体约 9.6 MB，不放仓库，按上面网址下载。
- 查缺字：`fontTools` 读子集的 cmap，对照 `plaques.js` 的 `FANTI` 繁体值。

## 评估过、没用的（2026-10-08，样张 `shots/dgy/r6-font-sample-*.webp`）
- 霞鹜文楷 TC Medium（LXGW WenKai TC，SIL OFL）：繁体全齐，但是印刷体楷书，太工整，用户否了（第一版用过，已从本目录删掉）。
- 马善政毛笔楷书 Ma Shan Zheng、钟齐志莽行书 Zhi Mang Xing、龙藏 Long Cang（Google Fonts，OFL）：简体字库，题字繁体缺 59 字（觀園鳳來儀瀟館……）。
- 佑字肃 Yuji Syuku / 佑字朴 Yuji Boku（Google Fonts，OFL，日本毛笔楷书）：缺 12 字（篙漵蘅芷蔻酴醾啟榭荇櫳槳）。
- 王漢宗顏楷體繁 wt064（GPL v2）：繁体全齐、颜体笔意，样张第五张；用户选了行书，一度定作匾额用，后改全部行书，已删。

## 引文子集（第 10 轮，视觉小说壳）
- 文件：`HanWangShinSuMedium-quote.woff2`（同一款王漢宗中行書繁 wt071.ttf，GPL v2，约 900 KB，2506 字）。界面里的繁体引文（打卡对话、连环画旁白、人物志判词/外貌、图鉴引文、匾联释义里的匾名）用它；CSS 名 `"DGY Quote"`（game.css），`font-display: swap`，用到才下载。匾额字牌仍用上面那份 68 KB 的题字子集，互不影响。
- 字表：`dgy/questText.js`、`dgy/albumData.js`、`dgy/codexData.js`、`dgy/plaques.js` 里出现的全部汉字 + 标点 + `chars.txt`（Big5 字体里没有的简体字自然取不到）。重做：把这几个文件的字抽出来存成 quote-chars.txt，再跑
  `pyftsubset wt071.ttf --text-file=quote-chars.txt --flavor=woff2 --no-hinting --desubroutinize --output-file=dgy-assets/fonts/HanWangShinSuMedium-quote.woff2`
- 引文里字体缺的 3 个字：䰖、槅、肷（逐字回退宋体）。

## 第 18 轮：全图景点名签（繁体行书）补字
- 地图名签（42 处：园内 24 景 + 贾府 18 处，繁体名由 `scripts/dgy-map-data.mjs` 的 `NAME_FAN` 出）用这份子集（CSS 名 "DGY Xing"）。原有 203 字缺 36 个：`上中仁卿可姐宗寧尤嶂府廊廚後德房東梨正母氏沐祠禧秦耳蘆街西角賈赦門間雪體`，已追加到 `chars.txt` 末尾，用上面的 pyftsubset 命令（原字体 wt071.ttf，sha256 对得上）重抽；重抽前先用旧字表复跑，和旧文件逐字节相同；旧 203 字的字形、字宽逐一比对 0 变化。
- 原字体本身没有的字：`广`（蘆雪广，底本回目就写「广」，不是「廣」）。名签里这一个字逐字回退宋体。

## 第 22 轮小修（T36b）：「紅綠繞綴」的绞丝旁改回「糸」（修改说明，GPL v2 要求注明）
- 原因：行书里这四字的绞丝旁草化成「纟」，画在匾上、卡上和简体「红绿绕缀」一模一样，指挥 10-10 定为硬伤（原 10-08「可以接受」的说法作废）。
- 做法：`scripts/dgy-font-silk.py`——取同一款字体里「絲」左半的行书「糸」（上幺、下三点）轮廓，缩放到原「纟」的位置，替换各字「纟」那几条轮廓；右半部件原样。仍是 wt071 的笔迹，只是部件重组。
- 已改的文件：`HanWangShinSuMedium-dgy.woff2`、`HanWangShinSuMedium-quote.woff2`、`../map/map-xingshu.woff2`、`../relations/rel-xingshu.woff2`（标题子集没有这几个字）。
- **以后重新 pyftsubset 出任何一份行书子集，都要再跑一遍**：`uv run --with fonttools --with brotli python scripts/dgy-font-silk.py <子集.woff2>`（已改过的字自动跳过）。

## 第 24 轮：引文子集补字（怡红院物件检视卡）
- `HanWangShinSuMedium-quote.woff2` 补 6 字：`括摸檢泯貯預`（2524 → 2530 字）。做法：取旧文件 cmap 全部字 + 新字作字表，用 wt071.ttf（sha256 对得上）pyftsubset 重抽，再跑 `scripts/dgy-font-silk.py`（綠紅繞綴照旧改）；旧 2524 字字形、字宽逐一比对 0 变化。
- 「槅」wt071 里没有（第十七回「一槅一槅」），检视卡里这个字落到字体栈下一款（宋体）。

## 全站字库（desk-fix6，2026-10-15）：界面所有读的中文统一用王漢宗中行書繁
- 字库名 `DGY All`（`dgy-all.css`，`all/HanWangShinSuMedium-all-{A,B1..B5}.woff2`）。来源仍是 `wt071.ttf`（sha256 `50a8c5f2c8cfe6d218ec2041deb1902add56882348a86c518eaeab685678c0fe`，王漢宗字型，GPL v2，全文见 `COPYING-HanWang-GPLv2.txt`）。
- 修改说明（GPL v2 要求注明）：① 只取全站实际用到的汉字做子集；② 在 cmap 里给简体字加「字形别名」（如「红」指向「紅」的字形），字形本身未改、网页文本不变；③ 子集后跑 `scripts/dgy-font-silk.py`，把「綠紅繞綴紈紙細終約線縮繼續」的绞丝旁改回「糸」（同第 22 轮）。
- 分包：A 包（常用字，约 390 KB）首屏预加载；B1–B5 按 `unicode-range` 需要才下载。
- 页面接入：`daguanyuan.html`、`shigao`、`huace`、`timeline` 的 `<head>` 各引一行 `dgy-all.css`；`dgy/fonts.js` 的 `FALLBACK` 以 `"DGY All"` 打头（画布文字）。`dgy-all.css` 末尾的统一规则带 `!important`，并关了 `font-synthesis`。
- 重做：字表扫描与分包脚本在工作区外的 `fontwork/`（scan.py → alias.json / tiers.json → build.py → tier.py），新增字后重跑并再跑 silk 修正。
- 「回」字形重绘（同属修改说明）：原字库的「回」在小字号下与「四」几乎分不出（「第一回」读成「第一四」），全站字库 A 包里这一个字改为用同一字库的「囗」外框加缩小的「口」拼成（字形文件 `all/HanWangShinSuMedium-all-A.woff2` 的 `uni56DE`）。重做子集后需重新套这一步（脚本：fontwork/ 里 wt071-alias3.ttf 的合成片段）。
- 补空字形（同属修改说明）：原字库里「翻 翼 翹 翘」四个字只有字码、没有字形（画出来是空白）。已在全站字库 A/B1/B2 包里用同字库的部件拼出：翻＝番＋羽、翼＝羽＋異、翹/翘＝堯＋羽。「耀」缺「隹」部件拼不出，已从字库的 unicode-range 里去掉，该字回落到系统宋体；「¢」同理。

## 补字 X 包（2026-10-16）：全站字库里原本缺、落到宋体的字
- 文件 `all/HanWangShinSuMedium-all-X.woff2`（约 3.6 KB，8 字）。**修改说明（GPL v2 要求注明）**：`槅椀噼鞓肷轱` 六字用同一字库里别的字的左右部件原位拼成（槅＝梧左＋隔右；椀＝梧左＋婉右；噼＝吃左＋僻右；鞓＝鞋左＋程右；肷＝肚左＋欣右；轱＝軌左＋姑右），字形是 wt071 的笔迹，只是部件重组；`幺` 指向「么」的字形，`讚` 指向「贊」的字形（只改 cmap，文本不变）。
- 仍缺的字：`䰖`（U+4C16）、`箨`（U+7BA8）、Unicode 区块边界字，只在不显示的代码里出现或极少见，回落宋体。
- 生成脚本：`scripts/dgy-font-x.py`（同目录读 A/B 包，输出 X 包）。重做全站字库后需重跑。
