#!/usr/bin/env python3
"""灵川页面书法字体子集：把 lingchuan-walk 里所有用到的汉字（含游踪资料）裁进志莽行书 / 马善政楷书。
原字体为 Google Fonts 的 OFL 授权字体。新增文字后重跑本脚本即可补字。"""
import glob, os, sys
from fontTools import subset
ROOT = os.path.join(os.path.dirname(__file__), '..', 'preview-home', 'lingchuan-walk')
SRC = {
    'zmx': os.path.expanduser('~/Projects/ai-inbox/files/fonts/ZhiMangXing-Regular.ttf'),
    'msz': os.path.expanduser('~/Projects/ai-inbox/files/fonts/MaShanZheng-Regular.ttf'),
}
# 按出现频次排序后切成小块，每块一个 @font-face + unicode-range：
# 浏览器只下载屏幕上实际出现的字所在的块（高频字集中在前两块），不再一次拉 1.5 MB。
from collections import Counter
cnt = Counter()
for p in glob.glob(os.path.join(ROOT, '*.js')) + glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, '*.css')) + glob.glob(os.path.join(ROOT, '*.json')):
    if os.path.basename(p) == 'map-props.json':
        continue
    cnt.update(c for c in open(p, encoding='utf-8').read() if ord(c) > 0x2000)
extra = '〇一二三四五六七八九十百千万年月日周今明后'
for c in extra:
    cnt[c] += 1
cjk = [c for c, _ in sorted(cnt.items(), key=lambda kv: (-kv[1], kv[0]))]
ascii_chunk = [chr(c) for c in range(0x20, 0x7f)]
SIZES = [300, 400, 500]  # 前三块，其余每块 600 字
chunks, i = [], 0
for n in SIZES:
    chunks.append(cjk[i:i + n]); i += n
while i < len(cjk):
    chunks.append(cjk[i:i + 600]); i += 600
chunks[0] = ascii_chunk + chunks[0]

def urange(chars):
    cps = sorted(set(ord(c) for c in chars))
    out, a = [], None
    for k, cp in enumerate(cps):
        if a is None: a = b = cp
        elif cp == b + 1: b = cp
        else: out.append((a, b)); a = b = cp
    if a is not None: out.append((a, b))
    return ', '.join(f'U+{x:X}' if x == y else f'U+{x:X}-{y:X}' for x, y in out)

FAMILY = {'zmx': 'ZMX', 'msz': 'MSZ'}
css = ['/* 由 scripts/subset-lingchuan-fonts.py 生成，勿手改 */']
for old in glob.glob(os.path.join(ROOT, 'f', '*-lc*.woff2')):
    os.remove(old)
for k, src in SRC.items():
    total = 0
    for idx, ch in enumerate(chunks):
        out = os.path.join(ROOT, 'f', f'{k}-lc-{idx}.woff2')
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
        f = subset.load_font(src, opts); s = subset.Subsetter(opts); s.populate(text=''.join(ch)); s.subset(f)
        subset.save_font(f, out, opts)
        total += os.path.getsize(out)
        css.append(f"@font-face {{ font-family: '{FAMILY[k]}'; src: url('./{k}-lc-{idx}.woff2') format('woff2'); font-display: swap; unicode-range: {urange(ch)}; }}")
    print(k, len(chunks), 'chunks', total // 1024, 'KB total', len(cjk), 'CJK chars')
open(os.path.join(ROOT, 'f', 'fonts.css'), 'w', encoding='utf-8').write('\n'.join(css) + '\n')
