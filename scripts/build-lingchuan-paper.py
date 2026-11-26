#!/usr/bin/env python3
"""
灵川全境 · 纸艺长卷地图底图（替换原 DEM 晕渲底图）

画法对齐纸艺立体书：等高线按层剪成平涂彩纸（投影 + 受光毛边），河谷平坝拼成田块，
真实河流湖库做成青绿釉面缎带，真实公路做成米白纸带（描边分级），村落铺暖色纸片。

输入（不进仓库，都在 ~/.gb/lingchuan-dem-cache/）：
  - dem_z12.npz、esri_masks_z12.npz、county-450323.geojson（同 build-lingchuan-dem.py）
  - osm_lingchuan.json：OpenStreetMap Overpass 导出的公路 / 水系 / 铁路 / 村落（© OpenStreetMap contributors, ODbL）
输出：
  - preview-home/lingchuan-walk/img/map/lingchuan-dem-l0.webp（1600x2000 总览）
  - preview-home/lingchuan-walk/img/map/tiles/tile-{r}-{c}.webp（4x5 张 1024 高清瓦片）
  - preview-home/lingchuan-walk/map-props.json（3D 纸艺小景的村落点位与林地密度，供 map-props.js 摆放）
高度图与 map-geo.json 不变（仍由 build-lingchuan-dem.py 产出）。
"""

from __future__ import annotations

import importlib.util
import json
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("lcdem", HERE / "build-lingchuan-dem.py")
D = importlib.util.module_from_spec(spec)
spec.loader.exec_module(D)

W, H = D.MASTER_W, D.MASTER_H
CACHE = D.CACHE
hex_rgb = D.hex_rgb
smoothstep = D.smoothstep


def px(lon: float, lat: float) -> tuple[float, float]:
    return D.lonlat_to_px(lon, lat, W, H)


def draw_lines(ways, width: float) -> np.ndarray:
    """画线宽蒙版（0..1），轻微模糊抗锯齿。"""
    img = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(img)
    wpx = max(1, int(round(width)))
    for pts in ways:
        if len(pts) < 2:
            continue
        dr.line(pts, fill=255, width=wpx, joint="curve")
        if wpx >= 3:
            r = wpx / 2.0
            for x, y in (pts[0], pts[-1]):
                dr.ellipse((x - r, y - r, x + r, y + r), fill=255)
    arr = np.asarray(img, dtype=np.float32) / 255.0
    return ndimage.gaussian_filter(arr, sigma=0.6)


def main() -> None:
    print("loading DEM / masks / OSM ...")
    dem = np.load(CACHE / "dem_z12.npz")
    elev_raw = dem["elev"]
    x0, y0, x1, y1, z = (int(dem[k]) for k in ("x0", "y0", "x1", "y1", "z"))
    bad = (elev_raw < 80.0) | (elev_raw > 2300.0)
    if bad.any():
        idx = ndimage.distance_transform_edt(bad, return_distances=False, return_indices=True)
        elev_raw = elev_raw[tuple(idx)]
    masks = np.load(CACHE / "esri_masks_z12.npz")
    elev = D.resample_from_z12(elev_raw, x0, y0, x1, y1, z, W, H, order=1)
    water_body = D.resample_from_z12(masks["water_body"].astype(np.float32), x0, y0, x1, y1, z, W, H, order=1)
    elev_s = ndimage.gaussian_filter(elev, sigma=2.4)
    elev_b = ndimage.gaussian_filter(elev, sigma=8.0)
    county, _ = D.build_county_mask(CACHE / "county-450323.geojson", W, H, apply_gcj_fix=True)
    county_b = county > 0.5

    osm = json.loads((CACHE / "osm_lingchuan.json").read_text(encoding="utf-8"))
    roads: dict[str, list] = {}
    rivers: dict[str, list] = {}
    lakes: list = []
    rails: list = []
    villages: list = []
    for e in osm["elements"]:
        t = e.get("tags", {})
        if e["type"] == "node":
            if t.get("place") in ("village", "hamlet", "town"):
                villages.append((e["lon"], e["lat"], t.get("place"), t.get("name", "")))
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
    print({k: len(v) for k, v in roads.items()}, {k: len(v) for k, v in rivers.items()}, "lakes", len(lakes), "villages", len(villages))

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rng = np.random.default_rng(20261126)

    # ------------------------------------------------------------------
    # 1) 水：Esri 水面 + OSM 湖库多边形 + OSM 河流线宽
    # ------------------------------------------------------------------
    lake_img = Image.new("L", (W, H), 0)
    ld = ImageDraw.Draw(lake_img)
    for pts in lakes:
        if len(pts) >= 3:
            ld.polygon(pts, fill=255)
    lake = np.asarray(lake_img, dtype=np.float32) / 255.0
    river = np.maximum.reduce([
        draw_lines(rivers.get("river", []), 7.0),
        draw_lines(rivers.get("canal", []), 3.5),
        draw_lines(rivers.get("stream", []), 2.4) * 0.9,
    ])
    water = np.clip(np.maximum.reduce([lake, river, ndimage.gaussian_filter(water_body, 0.8) > 0.3]).astype(np.float32), 0, 1)
    water = ndimage.gaussian_filter(water, 0.7)
    water_core = water > 0.45

    # ------------------------------------------------------------------
    # 2) 地：平坝田块 + 分层彩纸山
    # ------------------------------------------------------------------
    dzy, dzx = np.gradient(elev_s, 18.0)
    slope = np.hypot(dzx, dzy)

    rgb = np.zeros((H, W, 3), np.float32)
    # 田块：抖动的 Voronoi 格（约 46px ≈ 0.8 km），每块一种纸色
    cell = 46.0
    jx = ndimage.zoom(rng.random((H // 64 + 2, W // 64 + 2)).astype(np.float32), 64, order=1)[:H, :W]
    jy = ndimage.zoom(rng.random((H // 64 + 2, W // 64 + 2)).astype(np.float32), 64, order=1)[:H, :W]
    gx = (xx + (jx - 0.5) * 40.0) / cell
    gy = (yy + (jy - 0.5) * 40.0) / cell
    cid = (np.floor(gx).astype(np.int64) * 73856093) ^ (np.floor(gy).astype(np.int64) * 19349663)
    field_cols = np.stack([hex_rgb(c) for c in ["#E3E7B8", "#D7E3AA", "#EADFAE", "#CFDCA0", "#E6E4C2", "#DCE6B6"]])
    fcol = field_cols[np.abs(cid) % len(field_cols)]
    fx_ = np.abs(np.fmod(gx, 1.0) - 0.5)
    fy_ = np.abs(np.fmod(gy, 1.0) - 0.5)
    seam = np.clip(1.0 - (0.5 - np.maximum(fx_, fy_)) / 0.035, 0, 1)
    fcol = fcol * (1 - seam[..., None] * 0.25) + hex_rgb("#F6F1DE") * (seam[..., None] * 0.25)
    rgb[:] = hex_rgb("#E4E6BF")
    flat = (1.0 - smoothstep(205.0, 250.0, elev_s)) * (1.0 - smoothstep(0.10, 0.22, slope))
    rgb = rgb * (1 - flat[..., None]) + fcol * flat[..., None]

    tiers = [235, 300, 390, 510, 660, 840, 1060, 1320]
    palette = ["#CCDDA4", "#B3D293", "#97C182", "#7EAE74", "#689C69", "#568860", "#4B775A", "#5C7C68"]
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

    # 轻晕渲，只留纸面起伏
    nx = -dzx / np.sqrt(dzx * dzx + dzy * dzy + 1)
    ny = -dzy / np.sqrt(dzx * dzx + dzy * dzy + 1)
    nz = 1 / np.sqrt(dzx * dzx + dzy * dzy + 1)
    shade = np.clip(nx * -0.56 + ny * -0.56 + nz * 0.61, 0, 1)
    rgb *= np.clip(0.93 + 0.14 * ((shade - 0.35) / 0.65), 0.88, 1.06)[..., None]

    # ------------------------------------------------------------------
    # 3) 村落暖纸片
    # ------------------------------------------------------------------
    vil_img = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vil_img)
    for lon, lat, kind, _ in villages:
        x, y = px(lon, lat)
        r = {"town": 22, "village": 11, "hamlet": 7}[kind]
        vd.ellipse((x - r, y - r * 0.8, x + r, y + r * 0.8), fill=255)
    vil = ndimage.gaussian_filter(np.asarray(vil_img, np.float32) / 255.0, 3.0)
    vil = np.clip(vil * 1.4, 0, 1) * (1 - water)
    rgb = rgb * (1 - vil[..., None] * 0.55) + hex_rgb("#EBD8B8") * (vil[..., None] * 0.55)

    # ------------------------------------------------------------------
    # 4) 水面：青绿釉面 + 白纸岸边 + 岸内投影
    # ------------------------------------------------------------------
    win = ndimage.distance_transform_edt(water_core)
    wout = ndimage.distance_transform_edt(~water_core)
    bank = np.clip(1.0 - (wout - 0.5) / 2.2, 0, 1) * (1 - water)
    rgb = rgb * (1 - bank[..., None] * 0.85) + hex_rgb("#FBF7EA") * (bank[..., None] * 0.85)
    deep = smoothstep(0.0, 14.0, win)[..., None]
    wcol = hex_rgb("#93DCD2") * (1 - deep) + hex_rgb("#3AA6B2") * deep
    inner_sh = np.exp(-win / 2.0) * (win > 0)
    wcol = wcol * (1 - inner_sh[..., None] * 0.18)
    ripple = (np.sin((xx * 0.21 + yy * 0.07) + ndimage.gaussian_filter(rng.random((H, W)).astype(np.float32), 6) * 30) > 0.93) * smoothstep(3, 8, win)
    wcol += ripple[..., None] * np.array([40.0, 40.0, 34.0], np.float32)
    rgb = rgb * (1 - water[..., None]) + wcol * water[..., None]

    # ------------------------------------------------------------------
    # 5) 公路纸带（描边 + 填色），铁路
    # ------------------------------------------------------------------
    order = [
        ("track", 1.6, "#EFE4C6", 0.0),
        ("residential", 2.0, "#FBF4DF", 1.0),
        ("unclassified", 2.6, "#FBF4DF", 1.0),
        ("tertiary", 3.8, "#FDF6E2", 1.5),
        ("secondary", 5.0, "#FFF2CF", 1.6),
        ("primary", 6.2, "#FFE7B0", 1.8),
        ("trunk", 7.0, "#FFDE9A", 2.0),
        ("motorway", 7.6, "#F7C97A", 2.0),
    ]
    casing_col = hex_rgb("#9B7E5C")
    for kind, wd, fill, case in order:
        ways = roads.get(kind, [])
        if not ways:
            continue
        if case > 0:
            cm = draw_lines(ways, wd + case * 2) * (1 - water * 0.6)
            sh = ndimage.shift(cm, (2, 1.5), order=1, mode="nearest")
            rgb *= (1 - np.clip(sh - cm, 0, 1)[..., None] * 0.25)
            rgb = rgb * (1 - cm[..., None] * 0.55) + casing_col * (cm[..., None] * 0.55)
        fm = draw_lines(ways, wd) * (1 - water * 0.6)
        a = 0.95 if case > 0 else 0.6
        rgb = rgb * (1 - fm[..., None] * a) + hex_rgb(fill) * (fm[..., None] * a)
    if rails:
        rm = draw_lines(rails, 3.4)
        rgb = rgb * (1 - rm[..., None] * 0.8) + hex_rgb("#6F5E52") * (rm[..., None] * 0.8)
        # 白色枕木点
        tick = (np.sin(xx * 0.9) * np.sin(yy * 0.9) > 0.6).astype(np.float32)
        rw = draw_lines(rails, 1.4) * tick
        rgb = rgb * (1 - rw[..., None] * 0.7) + hex_rgb("#F4EEE2") * (rw[..., None] * 0.7)

    # ------------------------------------------------------------------
    # 6) 县界外：素净宣纸；县界一道朱褐双线
    # ------------------------------------------------------------------
    paper = hex_rgb("#F5F0E3")
    in_soft = ndimage.gaussian_filter(county, 1.6)
    rgb = paper * (1 - in_soft[..., None]) + rgb * in_soft[..., None]
    grain = D.make_paper_grain(H, W)
    rgb += grain[..., None] * 2.6
    border = ndimage.binary_dilation(county_b, iterations=3) ^ ndimage.binary_erosion(county_b, iterations=1)
    bb = np.clip(ndimage.gaussian_filter(border.astype(np.float32), 0.9) * 0.6, 0, 0.7)[..., None]
    rgb = rgb * (1 - bb) + hex_rgb("#8C5D49") * bb
    # 县界外 3px 白纸边 + 投影：县域像一张剪下来的纸摆在桌上
    out_d = ndimage.distance_transform_edt(~county_b)
    lip = np.clip(1 - (out_d - 3) / 2.0, 0, 1) * (out_d > 0)
    drop = np.exp(-np.clip(ndimage.distance_transform_edt(~ndimage.shift(county_b, (8, 6), order=0)) , 0, 40) / 6.0) * (out_d > 3)
    rgb *= (1 - (drop * 0.10)[..., None])
    rgb = rgb * (1 - lip[..., None]) + hex_rgb("#FFFDF6") * lip[..., None]

    img = Image.fromarray(np.clip(np.round(rgb), 0, 255).astype(np.uint8), "RGB")

    out_map = D.OUT_MAP
    out_tiles = D.OUT_TILES
    l0 = img.resize((D.L0_W, D.L0_H), Image.Resampling.LANCZOS)
    l0.save(out_map / "lingchuan-dem-l0.webp", "WEBP", quality=86, method=5)
    tw, th = W // D.TILE_COLS, H // D.TILE_ROWS
    tot = 0
    for r in range(D.TILE_ROWS):
        for c in range(D.TILE_COLS):
            tp = out_tiles / f"tile-{r}-{c}.webp"
            img.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th)).save(tp, "WEBP", quality=84, method=5)
            tot += tp.stat().st_size
    print(f"tiles {tot / 1024:.0f} KB, L0 {(out_map / 'lingchuan-dem-l0.webp').stat().st_size / 1024:.0f} KB")
    img.resize((800, 1000), Image.Resampling.LANCZOS).save(CACHE / "paper-overview.jpg", quality=88)
    img.crop((2400, 2900, 3400, 3900)).save(CACHE / "paper-crop-daxu.jpg", quality=90)
    img.crop((600, 1200, 1600, 2200)).save(CACHE / "paper-crop-west.jpg", quality=90)

    # ------------------------------------------------------------------
    # 7) 3D 纸艺小景数据：村落点（县内）、林地密度格（64x80）
    # ------------------------------------------------------------------
    vil_out = []
    for lon, lat, kind, name in villages:
        x, y = px(lon, lat)
        xi, yi = int(np.clip(x, 0, W - 1)), int(np.clip(y, 0, H - 1))
        if not county_b[yi, xi] or water_core[yi, xi]:
            continue
        vil_out.append([round(lon, 5), round(lat, 5), {"town": 3, "village": 2, "hamlet": 1}[kind]])
    GW, GH = 64, 80
    forest = smoothstep(235.0, 420.0, elev_s) * county * (1 - water) * (1 - vil)
    fgrid = forest.reshape(GH, H // GH, GW, W // GW).mean(axis=(1, 3))
    egrid = elev_s.reshape(GH, H // GH, GW, W // GW).mean(axis=(1, 3))
    lowland = (1 - smoothstep(205.0, 250.0, elev_s)) * county * (1 - water) * (1 - vil)
    lgrid = lowland.reshape(GH, H // GH, GW, W // GW).mean(axis=(1, 3))
    props = {
        "source": "OpenStreetMap contributors (ODbL) + SRTM",
        "grid": [GW, GH],
        "forest": [round(float(v), 2) for v in fgrid.ravel()],
        "lowland": [round(float(v), 2) for v in lgrid.ravel()],
        "elev": [int(v) for v in egrid.ravel()],
        "villages": vil_out,
    }
    (D.OUT_BASE / "map-props.json").write_text(json.dumps(props, separators=(",", ":")), encoding="utf-8")
    print("villages in county:", len(vil_out))


if __name__ == "__main__":
    main()
