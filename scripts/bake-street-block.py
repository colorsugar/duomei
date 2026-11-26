#!/usr/bin/env python3
"""从 OSM 抽取（/tmp/ag/core.json，Overpass 导出）预烘正阳步行街、东西巷一带的路与楼块。
只留几何：不带 name / brand 等任何 tag。楼高 OSM 没有，运行时按 kind 随机。
用法：python3 scripts/bake-street-block.py [core.json]"""
import json, sys, math
src = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ag/core.json'
OUT = 'preview-home/lingchuan-walk/map-street.json'
BB = (110.2890, 110.2990, 25.2745, 25.2835)  # lon0, lon1, lat0, lat1
LON0, LAT0, K = 110.2890, 25.2745, 200000
els = json.load(open(src))['elements']
def inb(g): return BB[0] <= g['lon'] <= BB[1] and BB[2] <= g['lat'] <= BB[3]
def enc(geom):
    out = []
    for g in geom:
        out += [round((g['lon'] - LON0) * K), round((g['lat'] - LAT0) * K)]
    return out
CLS = {'pedestrian': 0, 'footway': 1, 'living_street': 1}
roads, blds = [], []
for e in els:
    if e['type'] != 'way' or 'geometry' not in e: continue
    t = e['tags']; g = e['geometry']
    if not any(inb(p) for p in g): continue
    if 'highway' in t:
        roads.append([CLS.get(t['highway'], 2), enc(g)])
    elif 'building' in t:
        kind = 1 if ('tourism' in t or 'historic' in t) else 0
        pts = enc(g)
        if pts[:2] == pts[-2:]: pts = pts[:-2]
        if len(pts) >= 6: blds.append([kind, pts])
# 钟塔：街心位置为估，取「正阳步行街」路上纬度最接近 25.2780（街的中段）的节点
pts = [p for e in els if e['type'] == 'way' and e.get('tags', {}).get('name') == '正阳步行街' for p in e['geometry']]
m = min(pts, key=lambda p: abs(p['lat'] - 25.2780))
data = {'o': [LON0, LAT0], 'k': K, 'roads': roads, 'b': blds,
        'clock': {'lon': round(m['lon'], 5), 'lat': round(m['lat'], 5), 'est': True},
        'mixue': {'lon': 110.2937, 'lat': 25.27829}}
json.dump(data, open(OUT, 'w'), separators=(',', ':'))
print(len(roads), len(blds), data['clock'])
