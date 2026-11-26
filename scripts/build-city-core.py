#!/usr/bin/env python3
"""
城区核心高清叠层（约 3x3km：老城、两江四湖、象鼻山一带）

用 OpenStreetMap（路、楼、水、绿地）画成和全图底图同一套的纸艺手绘风，输出带羽化边的 RGBA webp，
由 map-street.js 在镜头靠近城区且放大时淡入。城区几乎是平地，所以不用 DEM 分层。

数据（不进仓库）：~/.gb/city-core/raw.json（Overpass 导出，© OpenStreetMap contributors, ODbL）
  没有就按 BBOX 现取。
输出：preview-home/lingchuan-walk/img/map/city-core-l.webp（2048，电脑）、city-core-m.webp（1024，手机）、city-core.json（范围）
"""
from __future__ import annotations

import json
import math
import urllib.parse
import urllib.request
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
OUT = HERE.parent / "preview-home/lingchuan-walk"
CACHE = Path.home() / ".gb/city-core"

# 中心 + 半宽（米）。经纬度范围按 1:1 墨卡托取，所以图和世界坐标线性对应
CLON, CLAT, HALF_M = 110.2930, 25.2760, 1500.0
SS = 4096  # 超采样画布，缩到 2048 / 1024 去锯齿
R = 6378137.0


def mx(lon): return math.radians(lon) * R
def my(lat): return math.log(math.tan(math.pi / 4 + math.radians(lat) / 2)) * R


# 墨卡托米（含 1/cos 放大）：半宽按墨卡托单位取，使 3km 实地约等于图宽
K_LAT = 1 / math.cos(math.radians(CLAT))
HALF_MERC = HALF_M * K_LAT
X0, X1 = mx(CLON) - HALF_MERC, mx(CLON) + HALF_MERC
Y0, Y1 = my(CLAT) - HALF_MERC, my(CLAT) + HALF_MERC
LON0, LON1 = math.degrees(X0 / R), math.degrees(X1 / R)
LAT0 = math.degrees(2 * math.atan(math.exp(Y0 / R)) - math.pi / 2)
LAT1 = math.degrees(2 * math.atan(math.exp(Y1 / R)) - math.pi / 2)
MPP = 2 * HALF_M / SS  # 超采样每像素实地米


def P(lon, lat):
    return ((mx(lon) - X0) / (X1 - X0) * SS, (Y1 - my(lat)) / (Y1 - Y0) * SS)


def fetch():
    raw = CACHE / "raw.json"
    if raw.exists() and raw.stat().st_size > 1000:
        return json.loads(raw.read_text(encoding="utf-8"))
    bb = f"{LAT0:.4f},{LON0:.4f},{LAT1:.4f},{LON1:.4f}"
    q = f"""[out:json][timeout:120];(
way["building"]({bb});way["highway"]({bb});way["waterway"]({bb});
way["natural"~"^(water|wood|scrub|grassland)$"]({bb});relation["natural"="water"]({bb});
relation["waterway"="riverbank"]({bb});
way["landuse"~"^(grass|forest|recreation_ground|village_green|meadow|residential|commercial|retail|industrial)$"]({bb});
way["leisure"~"^(park|garden|pitch|playground)$"]({bb});way["railway"]({bb});
);out geom;"""
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", urllib.parse.urlencode({"data": q}).encode(),
                                 headers={"User-Agent": "duomei-map/1.0"})
    b = urllib.request.urlopen(req, timeout=180).read()
    CACHE.mkdir(parents=True, exist_ok=True)
    raw.write_bytes(b)
    return json.loads(b)


def rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def stitch(segs):
    segs = [list(s) for s in segs if len(s) >= 2]
    rings = []
    while segs:
        cur = segs.pop(0)
        moved = True
        while moved and cur[0] != cur[-1]:
            moved = False
            for i, s in enumerate(segs):
                if s[0] == cur[-1]: cur += s[1:]
                elif s[-1] == cur[-1]: cur += s[::-1][1:]
                elif s[-1] == cur[0]: cur = s[:-1] + cur
                elif s[0] == cur[0]: cur = s[::-1][:-1] + cur
                else: continue
                segs.pop(i)
                moved = True
                break
        if len(cur) >= 4:
            rings.append(cur)
    return rings


def polys_of(e):
    """返回 (外环列表, 内环列表)，点为 (lon,lat)"""
    if e["type"] == "way":
        g = e.get("geometry") or []
        return ([[(p["lon"], p["lat"]) for p in g]] if len(g) >= 3 else []), []
    outer = [[(p["lon"], p["lat"]) for p in m["geometry"]] for m in e.get("members", []) if m.get("role") != "inner" and m.get("geometry")]
    inner = [[(p["lon"], p["lat"]) for p in m["geometry"]] for m in e.get("members", []) if m.get("role") == "inner" and m.get("geometry")]
    return stitch(outer), stitch(inner)


def main():
    d = fetch()["elements"]
    water, parks, woods, blds, landres, rails = [], [], [], [], [], []
    roads = []  # (class, pts)
    streams = []
    for e in d:
        t = e.get("tags", {})
        if "building" in t and e["type"] == "way":
            o, _ = polys_of(e)
            blds += o
        elif t.get("natural") == "water" or t.get("waterway") == "riverbank":
            water.append(polys_of(e))
        elif "waterway" in t and e["type"] == "way":
            g = e.get("geometry") or []
            if len(g) >= 2 and t["waterway"] in ("river", "stream", "canal", "drain", "ditch"):
                streams.append(([(p["lon"], p["lat"]) for p in g], t["waterway"]))
        elif "highway" in t and e["type"] == "way":
            g = e.get("geometry") or []
            if len(g) >= 2:
                roads.append((t["highway"], [(p["lon"], p["lat"]) for p in g], t.get("bridge") == "yes" or t.get("bridge") == "viaduct"))
        elif t.get("natural") in ("wood", "scrub") or t.get("landuse") == "forest":
            woods.append(polys_of(e))
        elif t.get("leisure") in ("park", "garden") or t.get("landuse") in ("grass", "recreation_ground", "village_green", "meadow") or t.get("natural") == "grassland":
            parks.append(polys_of(e))
        elif t.get("leisure") in ("pitch", "playground"):
            parks.append(polys_of(e))
        elif t.get("landuse") in ("residential", "commercial", "retail", "industrial") and e["type"] == "way":
            landres.append(polys_of(e))
        elif "railway" in t and e["type"] == "way":
            g = e.get("geometry") or []
            if len(g) >= 2:
                rails.append([(p["lon"], p["lat"]) for p in g])
    print("water", len(water), "parks", len(parks), "woods", len(woods), "bld", len(blds), "roads", len(roads), "streams", len(streams))

    def px_(pts):
        return [P(*p) for p in pts]

    def mpx(m):  # 米 → 超采样像素
        return max(1, int(round(m / MPP)))

    def layer():
        return Image.new("L", (SS, SS), 0)

    def fill_polys(items, img, val=255):
        dr = ImageDraw.Draw(img)
        for outer, inner in items:
            for r in outer:
                dr.polygon(px_(r), fill=val)
        for outer, inner in items:  # 内环（湖心岛等）挖掉
            for r in inner:
                dr.polygon(px_(r), fill=0)

    # ---------- 底：暖纸 + 柔和街坊色块 ----------
    img = Image.new("RGB", (SS, SS), rgb("#EDE6D2"))
    rng = np.random.default_rng(20261127)

    def paste(color, mask, alpha=1.0):
        nonlocal img
        m = mask if alpha >= 1 else mask.point(lambda v: int(v * alpha))
        img.paste(Image.new("RGB", (SS, SS), rgb(color)), (0, 0), m)

    res = layer()
    fill_polys(landres, res)
    paste("#E9DFC8", res.filter(ImageFilter.GaussianBlur(3)), 0.8)
    wood = layer(); fill_polys(woods, wood)
    park = layer(); fill_polys(parks, park)
    paste("#C9DB9E", park.filter(ImageFilter.GaussianBlur(2)))
    paste("#9CC184", wood.filter(ImageFilter.GaussianBlur(2)))
    # 绿地里撒小圆点当树冠，纸艺感
    dr = ImageDraw.Draw(img)
    gmask = np.asarray(ImageChops_max(park, wood), np.uint8) > 0
    ys, xs = np.nonzero(gmask[::18, ::18])
    for y, x in zip(ys, xs):
        if rng.random() < 0.55:
            cx, cy = x * 18 + rng.integers(0, 18), y * 18 + rng.integers(0, 18)
            if gmask[min(cy, SS - 1), min(cx, SS - 1)]:
                r = mpx(rng.uniform(2.5, 4.5))
                dr.ellipse((cx - r, cy - r, cx + r, cy + r), fill=rgb(["#8FB97C", "#7DAA70", "#A5C98A"][rng.integers(0, 3)]))

    # ---------- 水 ----------
    wl = layer()
    fill_polys(water, wl)
    wdr = ImageDraw.Draw(wl)
    for pts, kind in streams:
        w = {"river": 40, "canal": 10, "stream": 5, "drain": 3, "ditch": 3}[kind]
        wdr.line(px_(pts), fill=255, width=mpx(w), joint="curve")
    wl = wl.filter(ImageFilter.GaussianBlur(1.2))
    wa = np.asarray(wl, np.float32) / 255.0
    from scipy import ndimage  # noqa: E402
    core = wa > 0.5
    dist_in = ndimage.distance_transform_edt(core) * MPP
    dist_out = ndimage.distance_transform_edt(~core) * MPP
    base = np.asarray(img, np.float32)
    # 岸：浅奶白纸边
    bank = np.clip(1 - (dist_out - 0.5) / 7.0, 0, 1) * (1 - wa)
    base = base * (1 - bank[..., None] * 0.8) + np.array(rgb("#FBF7EA"), np.float32) * (bank[..., None] * 0.8)
    deep = np.clip(dist_in / 40.0, 0, 1)[..., None]
    wcol = np.array(rgb("#93DCD2"), np.float32) * (1 - deep) + np.array(rgb("#3AA6B2"), np.float32) * deep
    # 水面纸纹：横向细波
    yy = np.arange(SS, dtype=np.float32)[:, None]
    ripple = (np.sin(yy / (mpx(2.2)) + rng.random() * 6) > 0.92).astype(np.float32)
    wcol = wcol + ripple[..., None] * 9.0 * np.ones((1, SS, 1), np.float32)
    base = base * (1 - wa[..., None]) + wcol * wa[..., None]
    img = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
    del base, wcol, ripple, bank, deep
    water_mask = wl

    # ---------- 路：褐边 + 奶油芯 ----------
    # (宽度米, 芯色, 边色)  按从窄到宽画，宽路压在上面
    ROAD = {
        "footway": (2.2, "#F6EEDA", None), "path": (2.0, "#F6EEDA", None), "steps": (2.0, "#EADFC4", None),
        "cycleway": (2.4, "#F6EEDA", None), "pedestrian": (7.0, "#FBF4DF", "#C9B79A"),
        "service": (4.0, "#FBF4DF", "#C9B79A"), "living_street": (5.0, "#FBF4DF", "#C9B79A"),
        "residential": (6.5, "#FDF6E2", "#B79F7E"), "unclassified": (6.5, "#FDF6E2", "#B79F7E"),
        "tertiary": (9.0, "#FFF4D6", "#A98E6A"), "tertiary_link": (6.0, "#FFF4D6", "#A98E6A"),
        "secondary": (11.0, "#FFEFC4", "#A38662"), "secondary_link": (7.0, "#FFEFC4", "#A38662"),
        "primary": (13.0, "#FFE7B0", "#9B7E5C"), "primary_link": (8.0, "#FFE7B0", "#9B7E5C"),
        "trunk": (14.0, "#FFDE9A", "#9B7E5C"), "trunk_link": (8.0, "#FFDE9A", "#9B7E5C"),
        "motorway": (14.0, "#F7C97A", "#9B7E5C"), "motorway_link": (8.0, "#F7C97A", "#9B7E5C"),
    }
    order = list(ROAD.keys())
    rd = ImageDraw.Draw(img)
    # 先画全部边，再按级别画芯，让路口相通
    for stage in (0, 1):
        for kind in order:
            w, core_c, edge_c = ROAD[kind]
            for cls, pts, bridge in roads:
                if cls != kind:
                    continue
                p = px_(pts)
                if stage == 0 and edge_c:
                    rd.line(p, fill=rgb("#8E7658" if bridge else edge_c), width=mpx(w + 2.6), joint="curve")
                elif stage == 1:
                    rd.line(p, fill=rgb(core_c), width=mpx(w), joint="curve")
    # 铁路
    for pts in rails:
        rd.line(px_(pts), fill=rgb("#7A6A5C"), width=mpx(3), joint="curve")

    # ---------- 楼：纸片投影 + 屋顶色（按面积、编号稳定地换色）----------
    sh = layer()
    sd = ImageDraw.Draw(sh)
    off = mpx(2.6)
    for r in blds:
        sd.polygon([(x + off, y + off) for x, y in px_(r)], fill=255)
    sh = sh.filter(ImageFilter.GaussianBlur(mpx(1.3)))
    img.paste(Image.new("RGB", (SS, SS), rgb("#6E5B45")), (0, 0), sh.point(lambda v: int(v * 0.30)))
    bdr = ImageDraw.Draw(img)
    roofs = ["#E3C9A5", "#D9B896", "#E9D5B4", "#CFA989", "#DDC3A0", "#EAD9BC"]
    for i, r in enumerate(blds):
        p = px_(r)
        h = (i * 2654435761) % 6
        bdr.polygon(p, fill=rgb(roofs[h]), outline=rgb("#B08E6C"))

    # 纸纹
    grain = rng.normal(0, 1.0, (SS // 4, SS // 4)).astype(np.float32)
    grain = np.asarray(Image.fromarray(((grain * 28) + 128).clip(0, 255).astype(np.uint8)).resize((SS, SS), Image.BICUBIC), np.float32) - 128
    a = np.asarray(img, np.float32) + (grain / 28.0 * 2.2)[..., None]
    img = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    del a, grain

    # 羽化边（alpha），边缘 8% 内渐隐
    u = np.linspace(0, 1, SS, dtype=np.float32)
    f = np.clip(np.minimum(u, 1 - u) / 0.08, 0, 1)
    f = f * f * (3 - 2 * f)
    alpha = (f[:, None] * f[None, :] * 255).astype(np.uint8)
    out = img.convert("RGBA")
    out.putalpha(Image.fromarray(alpha))
    dst = OUT / "img/map"
    dst.mkdir(parents=True, exist_ok=True)
    for name, size, q in (("city-core-l.webp", 2048, 80), ("city-core-m.webp", 1024, 78)):
        out.resize((size, size), Image.LANCZOS).save(dst / name, "WEBP", quality=q, method=5)
        print(name, (dst / name).stat().st_size // 1024, "KB")
    (OUT / "img/map/city-core.json").write_text(json.dumps({
        "lon": [round(LON0, 6), round(LON1, 6)], "lat": [round(LAT0, 6), round(LAT1, 6)],
        "mPerPx": {"l": round(2 * HALF_M / 2048, 2), "m": round(2 * HALF_M / 1024, 2)},
        "source": "OpenStreetMap contributors (ODbL)",
    }, ensure_ascii=False) + "\n", encoding="utf-8")
    out.resize((1024, 1024), Image.LANCZOS).convert("RGB").save(Path.home() / "grokbox/city-r4/core-preview.jpg", quality=88)


def ImageChops_max(a, b):
    from PIL import ImageChops
    return ImageChops.lighter(a, b)


if __name__ == "__main__":
    main()
