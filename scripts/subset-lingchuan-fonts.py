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
txt = ''
for p in glob.glob(os.path.join(ROOT, '*.js')) + glob.glob(os.path.join(ROOT, '*.html')) + glob.glob(os.path.join(ROOT, '*.css')) + glob.glob(os.path.join(ROOT, '*.json')):
    txt += open(p, encoding='utf-8').read()
chars = sorted(set(c for c in txt if ord(c) > 0x2000)) + [chr(c) for c in range(0x20, 0x7f)]
# 常用补字：数字月份与常见标点
chars += list('〇一二三四五六七八九十百千万年月日周今明后')
text = ''.join(sorted(set(chars)))
for k, src in SRC.items():
    out = os.path.join(ROOT, 'f', f'{k}-lc.woff2')
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']
    f = subset.load_font(src, opts); s = subset.Subsetter(opts); s.populate(text=text); s.subset(f)
    subset.save_font(f, out, opts)
    print(out, os.path.getsize(out) // 1024, 'KB', len(text), 'chars')
