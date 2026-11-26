#!/usr/bin/env python3
"""
桂林全境纸艺地图底图（桂林市辖 17 个县区连成一张真实地图）

把原来只画灵川县的 build-lingchuan-paper.py 扩到桂林全市：六城区 + 阳朔、灵川、全州、兴安、永福、灌阳、龙胜、资源、平乐、恭城、荔浦。
画法同灵川：等高分层彩纸、平坝田块、OSM 真实河湖与公路、村落暖纸片；区县界画成朱褐线，界外素纸。

数据（不进仓库，缓存在 ~/.gb/guilin-atlas-cache/）：
  - terrarium_z12/：AWS Terrain Tiles（Mapzen Terrarium，SRTM 等，公开）
  - 4503xx.json：民政部区划边界（阿里云 DataV，GCJ-02，脚本内转 WGS84）
  - osm-full/：OpenStreetMap Overpass 分块导出的公路、水系、铁路、村落（© OpenStreetMap contributors, ODbL）
输出（preview-home/lingchuan-walk/）：
  - img/map/lingchuan-dem-l0.webp、img/map/tiles/tile-r-c.webp（8x8 张 1024）
  - img/map/lingchuan-dem-height.png、map-geo.json、map-props.json
"""

from __future__ import annotations

import importlib.util
import io
import json
import math
import os
import time
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
REPO = HERE.parent
spec = importlib.util.spec_from_file_location("lcdem", HERE / "build-lingchuan-dem.py")
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)

CACHE = Path.home() / ".gb/guilin-atlas-cache"
OUT_BASE = REPO / "preview-home/lingchuan-walk"
OUT_MAP = OUT_BASE / "img/map"
OUT_TILES = OUT_MAP / "tiles"

# 画框：经度 109.30–111.82，纬度按 1:1 墨卡托取（约 24.21–26.44），桂林市界全在框内
LON_MIN, LON_MAX = 109.30, 111.82
LAT_CENTER = 25.33
MASTER = 8192
TILES = 8
L0 = 3072
HEIGHT_SIZE = 640
Z = 12
# 像素/度比旧画框（5120px / 1.14°）低，线宽、村点、田块按此比例缩，保证同一缩放下世界尺寸不变
K = (MASTER / (LON_MAX - LON_MIN)) / (5120 / 1.14)

MX_MIN, MX_MAX = math.radians(LON_MIN), math.radians(LON_MAX)
MY_SPAN = MX_MAX - MX_MIN
MY_CENTER = D.merc_y(LAT_CENTER)
MY_MAX, MY_MIN = MY_CENTER + MY_SPAN / 2, MY_CENTER - MY_SPAN / 2
LAT_MAX, LAT_MIN = D.inv_merc_y(MY_MAX), D.inv_merc_y(MY_MIN)

DISTRICTS = {
    "450323": "灵川县", "450302": "秀峰区", "450303": "叠彩区", "450304": "象山区",
    "450305": "七星区", "450311": "雁山区", "450312": "临桂区",
    "450321": "阳朔县", "450324": "全州县", "450325": "兴安县", "450326": "永福县", "450327": "灌阳县",
    "450328": "龙胜各族自治县", "450329": "资源县", "450330": "平乐县", "450332": "恭城瑶族自治县", "450381": "荔浦市",
}


def px(lon, lat, w=MASTER, h=MASTER):
    u = (math.radians(lon) - MX_MIN) / (MX_MAX - MX_MIN)
    v = (MY_MAX - D.merc_y(lat)) / (MY_MAX - MY_MIN)
    return u * w, v * h


def get(url, path: Path, tries=3):
    if path.exists() and path.stat().st_size > 0:
        return path.read_bytes()
    for k in range(tries):
        try:
            data = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "duomei-map/1.0"}), timeout=60).read()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
            return data
        except Exception as e:  # noqa: BLE001
            print("retry", url, e)
            time.sleep(2 + k * 3)
    raise RuntimeError(url)


def tile_xy(lon, lat, z):
    n = 2 ** z
    x = (lon + 180) / 360 * n
    y = (1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n
    return x, y


def load_dem():
    x0, y0 = (int(v) for v in tile_xy(LON_MIN, LAT_MAX, Z))
    x1, y1 = (int(v) for v in tile_xy(LON_MAX, LAT_MIN, Z))
    print(f"DEM tiles x {x0}..{x1}, y {y0}..{y1} ({(x1 - x0 + 1) * (y1 - y0 + 1)} 张)")
    big = np.zeros(((y1 - y0 + 1) * 256, (x1 - x0 + 1) * 256), np.float32)
    for ty in range(y0, y1 + 1):
        for tx in range(x0, x1 + 1):
            b = get(f"https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{Z}/{tx}/{ty}.png", CACHE / f"terrarium_z12/{tx}_{ty}.png")
            a = np.asarray(Image.open(io.BytesIO(b)).convert("RGB"), np.float32)
            e = a[..., 0] * 256 + a[..., 1] + a[..., 2] / 256 - 32768
            big[(ty - y0) * 256:(ty - y0 + 1) * 256, (tx - x0) * 256:(tx - x0 + 1) * 256] = e
    # 重采样到画框
    n = 2 ** Z
    lon = np.degrees(np.linspace(MX_MIN, MX_MAX, MASTER))
    my = np.linspace(MY_MAX, MY_MIN, MASTER)
    sx = ((lon + 180) / 360 * n - x0) * 256
    sy = ((1 - my / math.pi) / 2 * n - y0) * 256
    yy, xx = np.meshgrid(sy, sx, indexing="ij")
    elev = ndimage.map_coordinates(big, [yy, xx], order=1, mode="nearest")
    bad = (elev < 80) | (elev > 2300)
    if bad.any():
        idx = ndimage.distance_transform_edt(bad, return_distances=False, return_indices=True)
        elev = elev[tuple(idx)]
    return elev


def load_bounds():
    masks = {}
    rings_all = {}
    for code, name in DISTRICTS.items():
        gj = json.loads(get(f"https://geo.datav.aliyun.com/areas_v3/bound/{code}.json", CACHE / f"{code}.json"))
        img = Image.new("L", (MASTER, MASTER), 0)
        dr = ImageDraw.Draw(img)
        rings = []
        for f in gj["features"]:
            g = f["geometry"]
            polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            for poly in polys:
                outer = [D.gcj02_to_wgs84(float(c[0]), float(c[1])) for c in poly[0]]
                dr.polygon([px(*p) for p in outer], fill=255)
                rings.append(outer)
                for hole in poly[1:]:
                    dr.polygon([px(*D.gcj02_to_wgs84(float(c[0]), float(c[1]))) for c in hole], fill=0)
        masks[code] = np.asarray(img, np.float32) / 255.0
        rings_all[code] = rings
    return masks, rings_all


OVERPASS = ["https://overpass-api.de/api/interpreter", "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter"]
CHUNKS = 3


def overpass(q, path: Path):
    if path.exists() and path.stat().st_size > 1000:
        return json.loads(path.read_text(encoding="utf-8"))
    data = urllib.parse.urlencode({"data": q}).encode()
    for k in range(6):
        url = OVERPASS[k % len(OVERPASS)]
        try:
            b = urllib.request.urlopen(urllib.request.Request(url, data=data, headers={"User-Agent": "duomei-map/1.0"}), timeout=600).read()
            d = json.loads(b)
            if d.get("remark") and "error" in d["remark"].lower():
                raise RuntimeError(d["remark"][:200])
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(b)
            print("overpass ok", path.name, len(b) // 1024, "KB")
            return d
        except Exception as e:  # noqa: BLE001
            print("overpass retry", url, path.name, e)
            time.sleep(10 + k * 10)
    raise RuntimeError(path)


def load_osm():
    """分 3x3 块向 Overpass 取数（单块过大会超时），按 (type,id) 去重合并。"""
    seen, ways, rels = set(), [], []
    lat_edges = np.linspace(LAT_MIN, LAT_MAX, CHUNKS + 1)
    lon_edges = np.linspace(LON_MIN, LON_MAX, CHUNKS + 1)
    for i in range(CHUNKS):
        for j in range(CHUNKS):
            bbox = f"{lat_edges[i]:.3f},{lon_edges[j]:.3f},{lat_edges[i + 1]:.3f},{lon_edges[j + 1]:.3f}"
            q = (f'[out:json][timeout:500];('
                 f'way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|track)$"]({bbox});'
                 f'way["waterway"~"^(river|stream|canal)$"]({bbox});way["natural"="water"]({bbox});'
                 f'way["railway"="rail"]({bbox});node["place"~"^(town|village|hamlet|suburb|neighbourhood)$"]({bbox});'
                 f');out geom;')
            for e in overpass(q, CACHE / f"osm-full/base-{i}-{j}.json")["elements"]:
                key = (e["type"], e["id"])
                if key not in seen:
                    seen.add(key)
                    ways.append(e)
            qr = f'[out:json][timeout:300];relation["natural"="water"]({bbox});out geom;'
            for e in overpass(qr, CACHE / f"osm-full/water-rel-{i}-{j}.json")["elements"]:
                key = (e["type"], e["id"])
                if key not in seen:
                    seen.add(key)
                    rels.append(e)
    return {"elements": ways}, {"elements": rels}


import urllib.parse  # noqa: E402


def stitch(segs):
    """把首尾相接的折线拼成闭环。"""
    segs = [list(sg) for sg in segs if len(sg) >= 2]
    rings = []
    while segs:
        cur = segs.pop(0)
        changed = True
        while changed and cur[0] != cur[-1]:
            changed = False
            for i, sg in enumerate(segs):
                if sg[0] == cur[-1]:
                    cur += sg[1:]
                elif sg[-1] == cur[-1]:
                    cur += sg[::-1][1:]
                elif sg[-1] == cur[0]:
                    cur = sg[:-1] + cur
                elif sg[0] == cur[0]:
                    cur = sg[::-1][:-1] + cur
                else:
                    continue
                segs.pop(i)
                changed = True
                break
        if len(cur) >= 4:
            rings.append(cur)
    return rings


def draw_lines(ways, width):
    img = Image.new("L", (MASTER, MASTER), 0)
    dr = ImageDraw.Draw(img)
    wpx = max(1, int(round(width * K)))
    for pts in ways:
        if len(pts) >= 2:
            dr.line(pts, fill=255, width=wpx, joint="curve")
    return ndimage.gaussian_filter(np.asarray(img, np.float32) / 255.0, 0.6)


def hex_rgb(s):
    return D.hex_rgb(s)


def smoothstep(a, b, x):
    return D.smoothstep(a, b, x)


def main():
    CACHE.mkdir(parents=True, exist_ok=True)
    print(f"frame lon {LON_MIN}..{LON_MAX}, lat {LAT_MIN:.4f}..{LAT_MAX:.4f}")
    elev = load_dem()
    elev_s = ndimage.gaussian_filter(elev, 2.6)
    elev_b = ndimage.gaussian_filter(elev, 8.5)
    masks, rings = load_bounds()
    region = np.clip(sum(masks.values()), 0, 1)
    region_b = region > 0.5
    osm, rel = load_osm()

    roads, rivers, lakes, rails, villages = {}, {}, [], [], []
    for e in osm["elements"]:
        t = e.get("tags", {})
        if e["type"] == "node":
            pl = t.get("place")
            if pl in ("village", "hamlet", "town", "suburb", "neighbourhood"):
                villages.append((e["lon"], e["lat"], pl, t.get("name", "")))
            continue
        geom = e.get("geometry")
        if not geom:
            continue
        pts = [px(g["lon"], g["lat"]) for g in geom]
        if "highway" in t:
            roads.setdefault(t["highway"], []).append(pts)
        elif "waterway" in t:
            rivers.setdefault(t["waterway"], []).append(pts)
        elif t.get("natural") == "water":
            lakes.append(pts)
        elif t.get("railway") == "rail":
            rails.append(pts)
    # 湖库多边形关系（青狮潭等）：把外环成员线段首尾拼成闭环
    if rel:
        for e in rel["elements"]:
            if e["type"] == "way" and e.get("geometry"):
                lakes.append([px(g["lon"], g["lat"]) for g in e["geometry"]])
                continue
            segs = [[(g["lon"], g["lat"]) for g in m["geometry"]] for m in e.get("members", [])
                    if m.get("role") in ("outer", "") and m.get("geometry")]
            rings_ll = stitch(segs)
            for r in rings_ll:
                lakes.append([px(*q) for q in r])
    print({k: len(v) for k, v in roads.items()}, "lakes", len(lakes), "villages", len(villages))

    H = W = MASTER
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rng = np.random.default_rng(20261126)

    # 水
    lake_img = Image.new("L", (W, H), 0)
    ld = ImageDraw.Draw(lake_img)
    for pts in lakes:
        if len(pts) >= 3:
            ld.polygon(pts, fill=255)
    lake = np.asarray(lake_img, np.float32) / 255.0
    river = np.maximum.reduce([
        draw_lines(rivers.get("river", []), 7.0),
        draw_lines(rivers.get("canal", []), 3.5),
        draw_lines(rivers.get("stream", []), 2.4) * 0.9,
    ])
    water = ndimage.gaussian_filter(np.clip(np.maximum(lake, river), 0, 1), 0.7)
    water_core = water > 0.45

    # 城区：OSM 住宅路密集处画成暖灰街坊纸
    res = draw_lines(roads.get("residential", []), 2.0)
    urban = np.clip(ndimage.gaussian_filter(res, 18.0 * K) * 9.0, 0, 1)
    urban = smoothstep(0.35, 0.8, urban)

    # 地：田块 + 分层彩纸
    dzy, dzx = np.gradient(elev_s, 18.0 / K)
    slope = np.hypot(dzx, dzy)
    cell = 46.0 * K
    jx = ndimage.zoom(rng.random((H // 64 + 2, W // 64 + 2)).astype(np.float32), 64, order=1)[:H, :W]
    jy = ndimage.zoom(rng.random((H // 64 + 2, W // 64 + 2)).astype(np.float32), 64, order=1)[:H, :W]
    gx = (xx + (jx - 0.5) * 40.0 * K) / cell
    gy = (yy + (jy - 0.5) * 40.0 * K) / cell
    cid = (np.floor(gx).astype(np.int64) * 73856093) ^ (np.floor(gy).astype(np.int64) * 19349663)
    field_cols = np.stack([hex_rgb(c) for c in ["#E3E7B8", "#D7E3AA", "#EADFAE", "#CFDCA0", "#E6E4C2", "#DCE6B6"]])
    fcol = field_cols[np.abs(cid) % len(field_cols)]
    fx_ = np.abs(np.fmod(gx, 1.0) - 0.5)
    fy_ = np.abs(np.fmod(gy, 1.0) - 0.5)
    seam = np.clip(1.0 - (0.5 - np.maximum(fx_, fy_)) / 0.035, 0, 1)
    fcol = fcol * (1 - seam[..., None] * 0.25) + hex_rgb("#F6F1DE") * (seam[..., None] * 0.25)
    rgb = np.zeros((H, W, 3), np.float32)
    rgb[:] = hex_rgb("#E4E6BF")
    flat = (1.0 - smoothstep(205.0, 250.0, elev_s)) * (1.0 - smoothstep(0.10, 0.22, slope))
    rgb = rgb * (1 - flat[..., None]) + fcol * flat[..., None]
    # 城区街坊
    blocks = hex_rgb("#E9E1CF") * (1 - seam[..., None] * 0.35) + hex_rgb("#F7F2E4") * (seam[..., None] * 0.35)
    rgb = rgb * (1 - urban[..., None] * 0.85) + blocks * (urban[..., None] * 0.85)

    tiers = [235, 300, 390, 510, 660, 840, 1060, 1320, 1600]
    palette = ["#CCDDA4", "#B3D293", "#97C182", "#7EAE74", "#689C69", "#568860", "#4B775A", "#5C7C68", "#6E8676"]
    for i, th in enumerate(tiers):
        le = elev_s if i < 4 else 0.6 * elev_s + 0.4 * elev_b
        sheet = smoothstep(th - 5.0, th + 5.0, le)
        sh = ndimage.gaussian_filter(ndimage.shift(sheet, (7, 6), order=1, mode="nearest"), 4.0)
        rgb *= (1.0 - np.clip(sh * (1 - sheet), 0, 1)[..., None] * 0.20)
        rgb = rgb * (1 - sheet[..., None]) + hex_rgb(palette[i]) * sheet[..., None]
        rim = np.clip(sheet - ndimage.shift(sheet, (2.5, 2.5), order=1, mode="nearest"), 0, 1)
        rgb += rim[..., None] * np.array([30.0, 30.0, 22.0], np.float32)
        se = np.clip(sheet - ndimage.shift(sheet, (-2, -2), order=1, mode="nearest"), 0, 1)
        rgb -= se[..., None] * np.array([12.0, 14.0, 12.0], np.float32)
        del sheet, sh, rim, se
    nx = -dzx / np.sqrt(dzx * dzx + dzy * dzy + 1)
    ny = -dzy / np.sqrt(dzx * dzx + dzy * dzy + 1)
    nz = 1 / np.sqrt(dzx * dzx + dzy * dzy + 1)
    shade = np.clip(nx * -0.56 + ny * -0.56 + nz * 0.61, 0, 1)
    rgb *= np.clip(0.93 + 0.14 * ((shade - 0.35) / 0.65), 0.88, 1.06)[..., None]
    del nx, ny, nz, shade, gx, gy, cid, fcol, jx, jy

    # 村落
    vil_img = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vil_img)
    for lon, lat, kind, _ in villages:
        if kind in ("suburb", "neighbourhood"):
            continue
        x, y = px(lon, lat)
        r = {"town": 22, "village": 11, "hamlet": 7}[kind] * K
        vd.ellipse((x - r, y - r * 0.8, x + r, y + r * 0.8), fill=255)
    vil = np.clip(ndimage.gaussian_filter(np.asarray(vil_img, np.float32) / 255.0, 3.0) * 1.4, 0, 1) * (1 - water)
    rgb = rgb * (1 - vil[..., None] * 0.55) + hex_rgb("#EBD8B8") * (vil[..., None] * 0.55)

    # 水面
    win = ndimage.distance_transform_edt(water_core)
    wout = ndimage.distance_transform_edt(~water_core)
    bank = np.clip(1.0 - (wout - 0.5) / 2.2, 0, 1) * (1 - water)
    rgb = rgb * (1 - bank[..., None] * 0.85) + hex_rgb("#FBF7EA") * (bank[..., None] * 0.85)
    deep = smoothstep(0.0, 14.0, win)[..., None]
    wcol = hex_rgb("#93DCD2") * (1 - deep) + hex_rgb("#3AA6B2") * deep
    wcol = wcol * (1 - (np.exp(-win / 2.0) * (win > 0))[..., None] * 0.18)
    rgb = rgb * (1 - water[..., None]) + wcol * water[..., None]
    del win, wout, bank, deep, wcol

    # 公路
    order = [
        ("track", 1.6, "#EFE4C6", 0.0), ("residential", 1.8, "#FBF4DF", 0.8), ("unclassified", 2.6, "#FBF4DF", 1.0),
        ("tertiary", 3.8, "#FDF6E2", 1.5), ("secondary", 5.0, "#FFF2CF", 1.6), ("primary", 6.2, "#FFE7B0", 1.8),
        ("trunk", 7.0, "#FFDE9A", 2.0), ("motorway", 7.6, "#F7C97A", 2.0),
    ]
    casing = hex_rgb("#9B7E5C")
    for kind, wd, fill, case in order:
        ways = roads.get(kind, [])
        if not ways:
            continue
        if case > 0:
            cm = draw_lines(ways, wd + case * 2) * (1 - water * 0.6)
            rgb = rgb * (1 - cm[..., None] * 0.55) + casing * (cm[..., None] * 0.55)
        fm = draw_lines(ways, wd) * (1 - water * 0.6)
        a = 0.95 if case > 0 else 0.6
        rgb = rgb * (1 - fm[..., None] * a) + hex_rgb(fill) * (fm[..., None] * a)
    if rails:
        rm = draw_lines(rails, 3.4)
        rgb = rgb * (1 - rm[..., None] * 0.8) + hex_rgb("#6F5E52") * (rm[..., None] * 0.8)

    # 界外素纸、区县界线
    paper = hex_rgb("#F5F0E3")
    in_soft = ndimage.gaussian_filter(region, 1.6)
    rgb = paper * (1 - in_soft[..., None]) + rgb * in_soft[..., None]
    rgb += D.make_paper_grain(H, W)[..., None] * 2.6
    outer = ndimage.binary_dilation(region_b, iterations=3) ^ ndimage.binary_erosion(region_b, iterations=1)
    bb = np.clip(ndimage.gaussian_filter(outer.astype(np.float32), 0.9) * 0.6, 0, 0.7)[..., None]
    rgb = rgb * (1 - bb) + hex_rgb("#8C5D49") * bb
    # 内部区县界：细虚线
    inner = np.zeros((H, W), bool)
    for m in masks.values():
        mb = m > 0.5
        inner |= ndimage.binary_dilation(mb, iterations=1) ^ mb
    inner &= ndimage.binary_erosion(region_b, iterations=4)
    dash = ((np.floor((xx + yy) / 9.0) % 2) == 0)
    ib = np.clip(ndimage.gaussian_filter((inner & dash).astype(np.float32), 0.7) * 0.9, 0, 0.55)[..., None]
    rgb = rgb * (1 - ib) + hex_rgb("#9A6A52") * ib
    out_d = ndimage.distance_transform_edt(~region_b)
    lip = np.clip(1 - (out_d - 3) / 2.0, 0, 1) * (out_d > 0)
    rgb = rgb * (1 - lip[..., None]) + hex_rgb("#FFFDF6") * lip[..., None]

    img = Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), "RGB")
    del rgb
    OUT_TILES.mkdir(parents=True, exist_ok=True)
    for old in OUT_TILES.glob("tile-*.webp"):
        old.unlink()
    img.resize((L0, L0), Image.Resampling.LANCZOS).save(OUT_MAP / "lingchuan-dem-l0.webp", "WEBP", quality=86, method=5)
    ts = MASTER // TILES
    tot = 0
    for r in range(TILES):
        for c in range(TILES):
            tp = OUT_TILES / f"tile-{r}-{c}.webp"
            img.crop((c * ts, r * ts, (c + 1) * ts, (r + 1) * ts)).save(tp, "WEBP", quality=84, method=5)
            tot += tp.stat().st_size
    print(f"tiles {tot / 1024:.0f} KB")
    img.resize((1000, 1000), Image.Resampling.LANCZOS).save(CACHE / "atlas-overview.jpg", quality=88)
    cx, cy = px(110.29, 25.28)
    img.crop((int(cx - 600), int(cy - 600), int(cx + 600), int(cy + 600))).save(CACHE / "atlas-crop-city.jpg", quality=90)

    # 高度图（区县内起伏，界外压平成桌面）
    h_norm = np.clip((elev_s - 135.0) / 1450.0, 0, 1) ** 0.78
    h_norm = np.clip(h_norm - water * 0.06, 0, 1)
    fxm = smoothstep(0.0, 0.04, xx / W) * smoothstep(0.0, 0.04, 1 - xx / W)
    fym = smoothstep(0.0, 0.04, yy / H) * smoothstep(0.0, 0.04, 1 - yy / H)
    h_mask = ndimage.gaussian_filter(region, 28.0) * fxm * fym
    h_final = h_norm * (0.12 + 0.88 * h_mask) * fxm * fym
    Image.fromarray(np.clip(np.round(h_final * 255), 0, 255).astype(np.uint8), "L").resize(
        (HEIGHT_SIZE, HEIGHT_SIZE), Image.Resampling.BILINEAR).save(OUT_MAP / "lingchuan-dem-height.png", optimize=True)

    geo = json.loads((OUT_BASE / "map-geo.json").read_text(encoding="utf-8"))
    geo.update({
        "projection": "web-mercator", "lonMin": LON_MIN, "lonMax": LON_MAX,
        "latMin": round(LAT_MIN, 6), "latMax": round(LAT_MAX, 6), "latCenter": LAT_CENTER,
        "mxMin": round(MX_MIN, 8), "mxMax": round(MX_MAX, 8), "myMin": round(MY_MIN, 8), "myMax": round(MY_MAX, 8),
        "masterSize": [MASTER, MASTER], "tileGrid": {"cols": TILES, "rows": TILES, "tileSize": ts},
        "districts": DISTRICTS,
    })
    (OUT_BASE / "map-geo.json").write_text(json.dumps(geo, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 纸艺小景数据
    vil_out = []
    for lon, lat, kind, name in villages:
        if kind in ("suburb", "neighbourhood"):
            continue
        x, y = px(lon, lat)
        xi, yi = int(np.clip(x, 0, W - 1)), int(np.clip(y, 0, H - 1))
        if not region_b[yi, xi] or water_core[yi, xi] or urban[yi, xi] > 0.5:
            continue
        vil_out.append([round(lon, 5), round(lat, 5), {"town": 3, "village": 2, "hamlet": 1}[kind]])
    G = 128
    forest = smoothstep(235.0, 420.0, elev_s) * region * (1 - water) * (1 - vil) * (1 - urban)
    lowland = (1 - smoothstep(205.0, 250.0, elev_s)) * region * (1 - water) * (1 - vil) * (1 - urban)
    pool = lambda a: a.reshape(G, H // G, G, W // G).mean(axis=(1, 3))  # noqa: E731
    props = {
        "source": "OpenStreetMap contributors (ODbL) + SRTM",
        "grid": [G, G],
        "forest": [round(float(v), 2) for v in pool(forest).ravel()],
        "lowland": [round(float(v), 2) for v in pool(lowland).ravel()],
        "elev": [int(v) for v in pool(elev_s).ravel()],
        "villages": vil_out,
    }
    (OUT_BASE / "map-props.json").write_text(json.dumps(props, separators=(",", ":")), encoding="utf-8")
    print("villages", len(vil_out))


if __name__ == "__main__":
    main()
