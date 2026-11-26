#!/usr/bin/env python3
"""
桂林城区纸艺小景 · 楼房聚类点 + 滨水点（写入 map-props.json 的 "city" 键，不动灵川已有数据）

输入（不进仓库，都在 ~/.gb/guilin-atlas-cache/）：
  - osm-city-buildings.json：Overpass `way["building"](25.22,110.26,25.33,110.34); out center qt;`
  - osm.json：水系（漓江/桃花江/湖面）
输出：preview-home/lingchuan-walk/map-props.json 的 city.blocks / city.water
  blocks: [lon, lat, n]  每 0.003° (~300m) 网格内的建筑数与重心，不逐栋
  water:  [lon, lat]     河湖岸线每 ~80m 一点，供垂柳沿岸
街区（map-street.js 已画楼）半径内的点剔除，避免重复。
© OpenStreetMap contributors, ODbL
"""
import json, math
from pathlib import Path

CACHE = Path.home() / ".gb/guilin-atlas-cache"
OUT = Path(__file__).resolve().parents[1] / "preview-home/lingchuan-walk/map-props.json"
BBOX = (110.26, 110.34, 25.22, 25.33)
STREET = (110.2945, 25.2795)
STREET_R = 0.0042  # 度，约 420m（map-street.js 范围约 1.4km 内只缩立绘，楼只在中心 ~200m）
CELL = 0.003
STEP = 0.0008


def inb(lon, lat):
    return BBOX[0] <= lon <= BBOX[1] and BBOX[2] <= lat <= BBOX[3]


def in_street(lon, lat):
    return math.hypot((lon - STREET[0]) * 0.9, lat - STREET[1]) < STREET_R


cells = {}
for e in json.load(open(CACHE / "osm-city-buildings.json"))["elements"]:
    c = e.get("center")
    if not c or not inb(c["lon"], c["lat"]) or in_street(c["lon"], c["lat"]):
        continue
    k = (int((c["lon"] - BBOX[0]) / CELL), int((c["lat"] - BBOX[2]) / CELL))
    a = cells.setdefault(k, [0.0, 0.0, 0])
    a[0] += c["lon"]; a[1] += c["lat"]; a[2] += 1
blocks = [[round(a[0] / a[2], 5), round(a[1] / a[2], 5), a[2]] for a in cells.values()]
blocks.sort()

water = []
for e in json.load(open(CACHE / "osm.json"))["elements"]:
    t = e.get("tags", {})
    if e["type"] != "way" or not (t.get("natural") == "water" or t.get("waterway") in ("river", "canal")):
        continue
    g = e.get("geometry") or []
    carry = 0.0
    for p, q in zip(g, g[1:]):
        d = math.hypot(q["lon"] - p["lon"], q["lat"] - p["lat"])
        pos = STEP - carry
        while pos <= d:
            f = pos / d if d else 0
            lon = p["lon"] + (q["lon"] - p["lon"]) * f
            lat = p["lat"] + (q["lat"] - p["lat"]) * f
            if inb(lon, lat) and not in_street(lon, lat):
                water.append([round(lon, 5), round(lat, 5)])
            pos += STEP
        carry = (carry + d) % STEP

data = json.load(open(OUT))
data["city"] = {"bbox": BBOX, "cell": CELL, "blocks": blocks, "water": water}
OUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")))
print("blocks", len(blocks), "buildings", sum(b[2] for b in blocks), "water", len(water))
