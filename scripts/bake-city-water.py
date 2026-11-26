#!/usr/bin/env python3
"""从 OSM 预烘桂林城区「两江四湖」水系：漓江城区段、桃花江、榕湖、杉湖、桂湖、木龙湖。
只留几何：不带 name 等任何 tag。数据 © OpenStreetMap contributors（ODbL）。
用法：python3 scripts/bake-city-water.py [overpass 导出的 json]
  不给文件就按 OSM id 去 Overpass 取（OVERPASS 环境变量可换镜像）。
输出 preview-home/lingchuan-walk/map-water.json：
  o/k：整数坐标的原点与倍数（lon = o[0] + x / k）
  fill：水面多边形，每个是 [外环, 洞, 洞…]，环为 [x0,y0,x1,y1,…]
  shore：岸线折线（被画框裁掉的边不算岸线）
  line：多边形之间缺口处的河道中线 [宽度(米), 折线]"""
import json, math, os, sys, urllib.parse, urllib.request

OUT = 'preview-home/lingchuan-walk/map-water.json'
BB = (110.255, 110.365, 25.215, 25.33)  # lon0, lon1, lat0, lat1：城区画框，漓江在此框内裁剪
LON0, LAT0, K = BB[0], BB[2], 100000      # 1 单位约 1.1 米
TOL = 0.00004                             # 道格拉斯-普克容差（度，约 4 米）
GAP_W = 30                                # 桃花江缺口段的河宽（米，按两头多边形的宽度估）

# OSM id：漓江水面、桃花江水面（上段、入漓江段）、榕湖、杉湖、桂湖、木龙湖；桃花江中线补缺口
RELS = [2339020, 13888814, 9373836, 9373634]
WAYS = [127872971, 674616142, 674638582]
GAP_LINE = 1547815440


def fetch():
    url = os.environ.get('OVERPASS', 'https://overpass.private.coffee/api/interpreter')
    q = ('[out:json][timeout:90];(relation(id:%s);way(id:%s););out geom;'
         % (','.join(map(str, RELS)), ','.join(map(str, WAYS + [GAP_LINE]))))
    req = urllib.request.Request(url, data=urllib.parse.urlencode({'data': q}).encode(),
                                 headers={'User-Agent': 'duomei-bake-city-water/1.0'})
    with urllib.request.urlopen(req, timeout=150) as r:
        return json.load(r)


def pts(geom):
    return [(g['lon'], g['lat']) for g in geom]


def join_ways(parts):
    """把多段 way 首尾相接拼成闭合环"""
    parts = [p[:] for p in parts if len(p) >= 2]
    rings = []
    while parts:
        cur = parts.pop(0)
        while cur[0] != cur[-1]:
            for i, p in enumerate(parts):
                if p[0] == cur[-1]: cur += p[1:]; break
                if p[-1] == cur[-1]: cur += p[::-1][1:]; break
                if p[-1] == cur[0]: cur = p + cur[1:]; break
                if p[0] == cur[0]: cur = p[::-1] + cur[1:]; break
            else:
                break  # 拼不上：数据不闭合，丢弃
            parts.pop(i)
        if cur[0] == cur[-1] and len(cur) >= 4:
            rings.append(cur)
    return rings


def inside(p, ring):
    x, y = p; c = False
    for i in range(len(ring) - 1):
        (x1, y1), (x2, y2) = ring[i], ring[i + 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            c = not c
    return c


def in_bb(p):
    return BB[0] <= p[0] <= BB[1] and BB[2] <= p[1] <= BB[3]


def clip(ring):
    """Sutherland-Hodgman：环裁到画框（画框是凸的，结果正确）"""
    out = ring[:-1]
    for axis, v, keep_ge in ((0, BB[0], True), (0, BB[1], False), (1, BB[2], True), (1, BB[3], False)):
        if not out: break
        src, out = out, []
        ok = (lambda p: p[axis] >= v) if keep_ge else (lambda p: p[axis] <= v)
        for i, cur in enumerate(src):
            prev = src[i - 1]
            if ok(cur):
                if not ok(prev): out.append(cross(prev, cur, axis, v))
                out.append(cur)
            elif ok(prev):
                out.append(cross(prev, cur, axis, v))
    return out + out[:1] if len(out) >= 3 else []


def cross(a, b, axis, v):
    t = (v - a[axis]) / (b[axis] - a[axis])
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def dp(line, tol=TOL):
    if len(line) < 3: return line
    a, b = line[0], line[-1]
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    best, bi = -1, 0
    for i in range(1, len(line) - 1):
        p = line[i]
        d = (abs(dy * (p[0] - a[0]) - dx * (p[1] - a[1])) / L) if L else math.hypot(p[0] - a[0], p[1] - a[1])
        if d > best: best, bi = d, i
    if best <= tol: return [a, b]
    return dp(line[:bi + 1], tol)[:-1] + dp(line[bi:], tol)


def dp_ring(ring):
    # 闭合环从最远的两点劈成两半再简化，避免首尾退化
    far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    out = dp(ring[:far + 1])[:-1] + dp(ring[far:])
    return out if len(out) >= 4 else []


def enc(line):
    out = []
    for lon, lat in line:
        out += [round((lon - LON0) * K), round((lat - LAT0) * K)]
    return out


def main():
    data = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else fetch()
    els = {(e['type'], e['id']): e for e in data['elements']}
    polys = []  # [(outer, [inner…])]，原始经纬度环
    for rid in RELS:
        e = els[('relation', rid)]
        outers = join_ways([pts(m['geometry']) for m in e['members'] if m['role'] == 'outer' and 'geometry' in m])
        inners = join_ways([pts(m['geometry']) for m in e['members'] if m['role'] == 'inner' and 'geometry' in m])
        for o in outers:
            polys.append((o, [i for i in inners if inside(i[0], o)]))
    for wid in WAYS:
        g = pts(els[('way', wid)]['geometry'])
        if g[0] == g[-1]: polys.append((g, []))

    fill, shore = [], []
    for outer, inners in polys:
        if not any(in_bb(p) for p in outer): continue
        o = clip(outer)
        o = dp_ring(o) if o else []
        if not o: continue
        rings = [enc(o[:-1])]
        for r in [outer] + inners:
            if r is not outer:
                c = clip(r)
                if c and all(in_bb(p) for p in r):  # 洞完整落在框内才留
                    c = dp_ring(c)
                    if c: rings.append(enc(c[:-1]))
            # 岸线：只要两端都在框内的边，裁剪产生的框边不算
            run = []
            for p in r:
                if in_bb(p): run.append(p)
                else:
                    if len(run) >= 2: shore.append(enc(dp(run)))
                    run = []
            if len(run) >= 2: shore.append(enc(dp(run)))
        fill.append(rings)

    # 桃花江中线：落在所有水面多边形之外的一段（两个水面多边形之间的缺口），两头各多留一点接上
    g = pts(els[('way', GAP_LINE)]['geometry'])
    out = [not any(inside(p, o) for o, _ in polys) and in_bb(p) for p in g]
    lines, i = [], 0
    while i < len(g):
        if out[i]:
            j = i
            while j < len(g) and out[j]: j += 1
            seg = g[max(0, i - 1):min(len(g), j + 1)]
            if len(seg) >= 3: lines.append([GAP_W, enc(dp(seg))])
            i = j
        else:
            i += 1

    res = {'o': [LON0, LAT0], 'k': K, 'fill': fill, 'shore': shore, 'line': lines}
    json.dump(res, open(OUT, 'w'), separators=(',', ':'))
    n = sum(len(r) // 2 for f in fill for r in f) + sum(len(s) // 2 for s in shore)
    print('fill', len(fill), 'shore', len(shore), 'line', len(lines), 'pts', n, 'bytes', os.path.getsize(OUT))


if __name__ == '__main__':
    main()
