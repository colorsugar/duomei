#!/usr/bin/env python3
"""县区边界 → preview-home/lingchuan-walk/map-bounds.json（WGS84，抽稀到约 150 m）。
来源：阿里云 DataV 行政区划边界（GCJ-02，转 WGS84），缓存在 ~/.gb/guilin-atlas-cache/<adcode>.json（由 build-guilin-atlas.py 下载）。
用于聚焦某县区时在地图上描出它的边界。"""
import json, math, os, sys
from pathlib import Path
import importlib.util
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('lcdem', HERE / 'build-lingchuan-dem.py')
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)
CACHE = Path.home() / '.gb' / 'guilin-atlas-cache'
IDS = {'450323': 'lingchuan', '450302': 'xiufeng', '450303': 'diecai', '450304': 'xiangshan', '450305': 'qixing',
       '450311': 'yanshan', '450312': 'lingui', '450321': 'yangshuo', '450324': 'quanzhou', '450325': 'xing-an',
       '450326': 'yongfu', '450327': 'guanyang', '450328': 'longsheng', '450329': 'ziyuan', '450330': 'pingle',
       '450332': 'gongcheng', '450381': 'lipu'}


def simplify(pts, tol):
    # Douglas–Peucker（度为单位，tol≈0.0014° ≈ 150 m）
    if len(pts) < 3:
        return pts
    def rec(a, b):
        (x1, y1), (x2, y2) = pts[a], pts[b]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-12
        best, bi = -1, -1
        for i in range(a + 1, b):
            x0, y0 = pts[i]
            d = abs(dy * x0 - dx * y0 + x2 * y1 - y2 * x1) / L
            if d > best:
                best, bi = d, i
        if best > tol:
            return rec(a, bi)[:-1] + rec(bi, b)
        return [pts[a], pts[b]]
    return rec(0, len(pts) - 1)


out = {}
for code, did in IDS.items():
    gj = json.loads((CACHE / f'{code}.json').read_text())
    rings = []
    for f in gj['features']:
        g = f['geometry']
        polys = g['coordinates'] if g['type'] == 'MultiPolygon' else [g['coordinates']]
        for poly in polys:
            ring = [D.gcj02_to_wgs84(float(c[0]), float(c[1])) for c in poly[0]]
            # 闭合环首尾相同，先在离起点最远处切成两段再分别抽稀
            far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
            ring = simplify(ring[:far + 1], 0.0014)[:-1] + simplify(ring[far:], 0.0014)
            if len(ring) >= 4:
                rings.append([[round(x, 4), round(y, 4)] for x, y in ring])
    out[did] = rings
    print(did, len(rings), sum(len(r) for r in rings))
dst = HERE.parent / 'preview-home' / 'lingchuan-walk' / 'map-bounds.json'
dst.write_text(json.dumps({'source': '阿里云 DataV 行政区划边界（GCJ-02 转 WGS84）', 'bounds': out}, ensure_ascii=False, separators=(',', ':')))
print(dst, dst.stat().st_size // 1024, 'KB')
