#!/usr/bin/env python3
"""
Build Lingchuan County Real-30m-DEM Song-Celadon Xuan-Paper Sculpted Relief Atlas:
  - L0 overview: preview-home/lingchuan-walk/img/map/lingchuan-dem-l0.webp (1536x2048)
  - L1/L2 high-res tiles: preview-home/lingchuan-walk/img/map/tiles/tile-{r}-{c}.webp (3x4 grid of 1024x1024)
  - 3D displacement heightmap: preview-home/lingchuan-walk/img/map/lingchuan-dem-height.png (256x340, 8-bit smooth)
  - Real WGS84 geo config: preview-home/lingchuan-walk/map-geo.json

Data caches live in ~/.gb/lingchuan-dem-cache/ (never committed to repo):
  - dem_z12.npz (AWS Terrarium z=12 real 30m SRTM/Mapzen DEM)
  - esri_masks_z12.npz (pixel-aligned Esri Gray + Topo z=12 water & major road masks)
  - county-450323.geojson (official Lingchuan County boundary)
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage

REPO = Path(__file__).resolve().parents[1]
OUT_BASE = REPO / "preview-home/lingchuan-walk"
OUT_MAP = OUT_BASE / "img/map"
OUT_TILES = OUT_MAP / "tiles"
CACHE = Path.home() / ".gb/lingchuan-dem-cache"

# Master canvas dimensions (4:5 aspect closely matches Lingchuan's real ~70km x 85km shape!)
MASTER_W, MASTER_H = 4096, 5120
TILE_COLS, TILE_ROWS = 4, 5  # 20 crisp 1024x1024 tiles = 20.97 MP!
L0_W, L0_H = 1600, 2000
HEIGHT_W, HEIGHT_H = 256, 320

# Tighter exact Mercator bounding box framing Lingchuan County (lon 110.095..110.785, lat 25.023..25.786)
# Minimizes wasted margin so the full county fills the viewport boldly!
LON_MIN, LON_MAX = 110.068, 110.812  # span = 0.744 deg (~74.8 km E-W)
LAT_CENTER = 25.406

def merc_y(lat_deg: float) -> float:
    r = math.radians(lat_deg)
    return math.log(math.tan(math.pi / 4.0 + r / 2.0))

def inv_merc_y(my: float) -> float:
    return math.degrees(2.0 * math.atan(math.exp(my)) - math.pi / 2.0)

# Compute exact Mercator LAT_MIN / LAT_MAX so x-scale == y-scale at 3:4 aspect (zero distortion!)
MX_MIN = math.radians(LON_MIN)
MX_MAX = math.radians(LON_MAX)
MY_SPAN = (MX_MAX - MX_MIN) * (MASTER_H / MASTER_W)
MY_CENTER = merc_y(LAT_CENTER)
MY_MAX = MY_CENTER + MY_SPAN * 0.5
MY_MIN = MY_CENTER - MY_SPAN * 0.5
LAT_MAX = inv_merc_y(MY_MAX)
LAT_MIN = inv_merc_y(MY_MIN)

# Standard GCJ-02 -> WGS84 (for China DataV GeoJSON alignment with WGS84 DEM/Esri)
_A = 6378245.0
_EE = 0.00669342162296594323

def _tlat(x: float, y: float) -> float:
    ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * math.sqrt(abs(x))
    ret += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(y * math.pi) + 40.0 * math.sin(y / 3.0 * math.pi)) * 2.0 / 3.0
    ret += (160.0 * math.sin(y / 12.0 * math.pi) + 320 * math.sin(y * math.pi / 30.0)) * 2.0 / 3.0
    return ret

def _tlon(x: float, y: float) -> float:
    ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * math.sqrt(abs(x))
    ret += (20.0 * math.sin(6.0 * x * math.pi) + 20.0 * math.sin(2.0 * x * math.pi)) * 2.0 / 3.0
    ret += (20.0 * math.sin(x * math.pi) + 40.0 * math.sin(x / 3.0 * math.pi)) * 2.0 / 3.0
    ret += (150.0 * math.sin(x / 12.0 * math.pi) + 300.0 * math.sin(x / 30.0 * math.pi)) * 2.0 / 3.0
    return ret

def gcj02_to_wgs84(lon: float, lat: float) -> tuple[float, float]:
    dlat = _tlat(lon - 105.0, lat - 35.0)
    dlon = _tlon(lon - 105.0, lat - 35.0)
    radlat = lat / 180.0 * math.pi
    magic = math.sin(radlat)
    magic = 1.0 - _EE * magic * magic
    sqrtmagic = math.sqrt(magic)
    dlat = (dlat * 180.0) / ((_A * (1.0 - _EE)) / (magic * sqrtmagic) * math.pi)
    dlon = (dlon * 180.0) / (_A / sqrtmagic * math.cos(radlat) * math.pi)
    return lon - dlon, lat - dlat

def lonlat_to_px(lon: float, lat: float, w: int = MASTER_W, h: int = MASTER_H) -> tuple[float, float]:
    u = (math.radians(lon) - MX_MIN) / (MX_MAX - MX_MIN)
    v = (MY_MAX - merc_y(lat)) / (MY_MAX - MY_MIN)
    return u * w, v * h

def hex_rgb(s: str) -> np.ndarray:
    s = s.lstrip("#")
    return np.array([int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16)], dtype=np.float32)

def resample_from_z12(arr: np.ndarray, x0: int, y0: int, x1: int, y1: int, z: int, out_w: int, out_h: int, order: int = 1) -> np.ndarray:
    """Exact Mercator crop + resample from assembled z=12 tile grid to target (out_h, out_w)."""
    n = 2 ** z
    # Target Mercator u,v -> fractional tile coordinates
    mx = np.linspace(MX_MIN, MX_MAX, out_w, dtype=np.float64)
    my = np.linspace(MY_MAX, MY_MIN, out_h, dtype=np.float64)
    lon_deg = np.degrees(mx)
    tx_f = (lon_deg + 180.0) / 360.0 * n
    ty_f = (1.0 - my / math.pi) / 2.0 * n

    src_x = (tx_f - x0) * 256.0
    src_y = (ty_f - y0) * 256.0

    yy, xx = np.meshgrid(src_y, src_x, indexing="ij")
    return ndimage.map_coordinates(arr.astype(np.float32), [yy, xx], order=order, mode="nearest")

def build_county_mask(gj_path: Path, w: int, h: int, apply_gcj_fix: bool = True) -> tuple[np.ndarray, list]:
    gj = json.loads(gj_path.read_text(encoding="utf-8"))
    img = Image.new("L", (w, h), 0)
    draw = ImageDraw.Draw(img)
    rings_wgs84 = []

    def draw_poly(poly_coords):
        outer = poly_coords[0]
        pts_px = []
        ring_ll = []
        for c in outer:
            lon, lat = float(c[0]), float(c[1])
            if apply_gcj_fix:
                lon, lat = gcj02_to_wgs84(lon, lat)
            pts_px.append(lonlat_to_px(lon, lat, w, h))
            ring_ll.append((lon, lat))
        if len(pts_px) >= 3:
            draw.polygon(pts_px, fill=255)
            rings_wgs84.append(ring_ll)
        for hole in poly_coords[1:]:
            hpts = []
            for c in hole:
                lon, lat = float(c[0]), float(c[1])
                if apply_gcj_fix:
                    lon, lat = gcj02_to_wgs84(lon, lat)
                hpts.append(lonlat_to_px(lon, lat, w, h))
            if len(hpts) >= 3:
                draw.polygon(hpts, fill=0)

    for feat in gj["features"]:
        geom = feat["geometry"]
        if geom["type"] == "Polygon":
            draw_poly(geom["coordinates"])
        elif geom["type"] == "MultiPolygon":
            for poly in geom["coordinates"]:
                draw_poly(poly)

    mask = np.asarray(img, dtype=np.float32) / 255.0
    return mask, rings_wgs84

def smoothstep(e0: float, e1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - e0) / (e1 - e0 + 1e-8), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)

def make_paper_grain(h: int, w: int) -> np.ndarray:
    """Subtle handmade xuan-paper fiber luminance texture (clean, warm, no stains)."""
    rng = np.random.default_rng(450323)
    coarse = rng.normal(0, 1.0, (h // 8, w // 8)).astype(np.float32)
    coarse = ndimage.zoom(coarse, 8, order=1)[:h, :w]
    fine = rng.normal(0, 1.0, (h // 2, w // 2)).astype(np.float32)
    fine = ndimage.zoom(fine, 2, order=1)[:h, :w]
    # Gentle horizontal paper laid lines
    laid = np.sin(np.linspace(0, h * 0.45, h, dtype=np.float32))[:, None] * 0.25
    grain = (coarse * 0.45 + fine * 0.35 + laid * 0.20)
    return np.clip(grain, -2.2, 2.2)

def main() -> None:
    print(f"Frame WGS84: lon={LON_MIN:.4f}..{LON_MAX:.4f}, lat={LAT_MIN:.4f}..{LAT_MAX:.4f} (aspect={MASTER_W}:{MASTER_H})")

    dem_npz = np.load(CACHE / "dem_z12.npz")
    elev_raw = dem_npz["elev"]
    x0, y0, x1, y1, z = int(dem_npz["x0"]), int(dem_npz["y0"]), int(dem_npz["x1"]), int(dem_npz["y1"]), int(dem_npz["z"])

    # Patch occasional SRTM nodata pits (< 80m; Guilin/Lingchuan valley floor is >= 130m)
    bad = (elev_raw < 80.0) | (elev_raw > 2300.0)
    if bad.any():
        print(f"Patching {int(bad.sum())} DEM void pixels via nearest valid neighbor...")
        idx = ndimage.distance_transform_edt(bad, return_distances=False, return_indices=True)
        elev_raw = elev_raw[tuple(idx)]

    masks_npz = np.load(CACHE / "esri_masks_z12.npz")
    water_body_src = masks_npz["water_body"].astype(np.float32)
    water_river_src = masks_npz["water_river"].astype(np.float32)
    roads_src = masks_npz["roads"].astype(np.float32)

    print("Resampling real 30m DEM & water/road masks to 3072x4096 exact Mercator canvas...")
    elev = resample_from_z12(elev_raw, x0, y0, x1, y1, z, MASTER_W, MASTER_H, order=1)
    water_body = resample_from_z12(water_body_src, x0, y0, x1, y1, z, MASTER_W, MASTER_H, order=1)
    water_river = resample_from_z12(water_river_src, x0, y0, x1, y1, z, MASTER_W, MASTER_H, order=1)
    roads = resample_from_z12(roads_src, x0, y0, x1, y1, z, MASTER_W, MASTER_H, order=1)

    # Smooth sensor micro-jitter while keeping sharp karst towers & real mountain ridges!
    elev_s = ndimage.gaussian_filter(elev, sigma=2.2)
    elev_broad = ndimage.gaussian_filter(elev, sigma=7.5)

    # County boundary mask (GCJ-02 -> WGS84 corrected)
    county_mask, county_rings = build_county_mask(CACHE / "county-450323.geojson", MASTER_W, MASTER_H, apply_gcj_fix=True)
    county_bool = county_mask > 0.5

    # Verify all 12 official townships (OSM ground-truth verified!) lie INSIDE the real county polygon!
    townships_wgs84 = {
        "lantian":        (110.1966, 25.6097, "兰田瑶族乡"),
        "gongping":       (110.1571, 25.4931, "公平乡"),
        "jiuwu":          (110.2510, 25.5302, "九屋镇"),
        "sanjie":         (110.3849, 25.4685, "三街镇"),
        "tanxia":         (110.2822, 25.4545, "潭下镇"),
        "lingchuan-zhen": (110.3217, 25.4129, "灵川镇"),
        "dingjiang":      (110.2996, 25.3381, "定江镇"),
        "lingtian":       (110.4723, 25.3441, "灵田镇"),
        "haiyang":        (110.5628, 25.3094, "海洋乡"),
        "daxu":           (110.4224, 25.1891, "大圩镇"),
        "chaotian":       (110.5086, 25.2000, "潮田乡"),
        "dajing":         (110.5774, 25.2038, "大境瑶族乡"),
    }
    inside_cnt = 0
    for tid, (lon, lat, name) in townships_wgs84.items():
        px, py = lonlat_to_px(lon, lat)
        ins = bool(county_bool[int(np.clip(py, 0, MASTER_H - 1)), int(np.clip(px, 0, MASTER_W - 1))])
        elev_here = float(elev_s[int(np.clip(py, 0, MASTER_H - 1)), int(np.clip(px, 0, MASTER_W - 1))])
        if ins:
            inside_cnt += 1
        print(f"  Town {tid:14s} ({name:5s}): px=({px:6.1f},{py:6.1f}) inside={ins} elev={elev_here:.0f}m")
    print(f"Townships verified inside real Lingchuan County boundary: {inside_cnt}/12")

    # =========================================================================
    # SONG-CELADON LAYERED XUAN-PAPER SCULPTED RELIEF RENDERER
    # =========================================================================
    print("Rendering 14-tier sculpted paper-cut relief in Song celadon mineral palette...")

    # Clean, rich water mask (Qingshitan Reservoir + Li River + Gantang River + Chaotian River)
    # Remove tiny isolated label artifacts (< 18px) while preserving all real river ribbons!
    river_raw = ndimage.gaussian_filter(water_river, sigma=0.75) > 0.24
    rlab, rn = ndimage.label(river_raw)
    if rn > 0:
        rsizes = ndimage.sum(river_raw, rlab, range(1, rn + 1))
        keep_r = np.zeros(rn + 1, dtype=bool)
        keep_r[1:] = rsizes >= 22
        river_clean = keep_r[rlab]
    else:
        river_clean = river_raw
    body_clean = ndimage.gaussian_filter(water_body, sigma=0.85) > 0.28
    water_core = body_clean | ndimage.binary_dilation(river_clean, iterations=1)
    water_core = ndimage.binary_closing(water_core, iterations=1)
    water_alpha = ndimage.gaussian_filter(water_core.astype(np.float32), sigma=0.95)

    # 14 curated real-elevation paper-cut tiers (meters)
    # Finer steps in 150..500m to celebrate Guilin-Lingchuan karst peaks & river valleys,
    # noble steps up to 1700m for Lantian / Haiyang / Dajing mountain ranges!
    tiers = [168, 200, 238, 285, 345, 420, 515, 630, 770, 930, 1110, 1310, 1520]

    # Song dynasty mineral palette (warm xuan-paper lowland -> jade celadon -> deep pine indigo -> warm ochre ridge)
    palette = [
        hex_rgb("#F1ECDD"),  # 0: < 168m  river valley xuan paper
        hex_rgb("#EAE7D6"),  # 1: 168-200 plain & paddy valley
        hex_rgb("#DFE4D2"),  # 2: 200-238 gentle karst foothills
        hex_rgb("#D0DEC9"),  # 3: 238-285 pale celadon hills
        hex_rgb("#BED5BE"),  # 4: 285-345 Song celadon lower slopes
        hex_rgb("#A9C8B3"),  # 5: 345-420 mid karst towers
        hex_rgb("#93B9A6"),  # 6: 420-515 jade green ridges
        hex_rgb("#7CA998"),  # 7: 515-630 deeper celadon mountains
        hex_rgb("#669689"),  # 8: 630-770 pine-celadon massif
        hex_rgb("#53837B"),  # 9: 770-930 alpine Yao ridges
        hex_rgb("#46736E"),  # 10: 930-1110 deep mineral indigo-green
        hex_rgb("#3F6664"),  # 11: 1110-1310 high summit spine
        hex_rgb("#4C6B66"),  # 12: 1310-1520 mist-kissed high ridge
        hex_rgb("#657A6D"),  # 13: > 1520m cloud-top ochre-celadon crest
    ]

    # Build layered paper-cut color + physical cast drop-shadows + sunlit paper-edge rims!
    rgb = np.zeros((MASTER_H, MASTER_W, 3), dtype=np.float32)
    rgb[:] = palette[0]

    # Subtle regional mineral washes (warm ginkgo gold in Haiyang Mountain, subtle peach-warmth in Chaotian valley)
    yy_n, xx_n = np.mgrid[0:MASTER_H, 0:MASTER_W].astype(np.float32)
    hy_px, hy_py = lonlat_to_px(110.575, 25.315)
    haiyang_wash = np.exp(-(((xx_n - hy_px) / 340.0) ** 2 + ((yy_n - hy_py) / 380.0) ** 2))
    ct_px, ct_py = lonlat_to_px(110.505, 25.198)
    chaotian_wash = np.exp(-(((xx_n - ct_px) / 260.0) ** 2 + ((yy_n - ct_py) / 240.0) ** 2))

    # Stack each paper-cut elevation layer from lowest to highest!
    # Light comes from Upper-Left (NW: dx=-1, dy=-1) -> shadow casts to Lower-Right (+dx, +dy)!
    shadow_dx, shadow_dy = 5, 6
    rim_dx, rim_dy = -2, -2

    for i, thresh in enumerate(tiers):
        # Soft-edged paper sheet mask for this elevation contour
        # Wider blur at higher tiers for stately mountain sheets, crisp at lower karst tiers
        layer_elev = elev_s if i < 6 else (0.65 * elev_s + 0.35 * elev_broad)
        sheet = smoothstep(thresh - 6.0, thresh + 6.0, layer_elev)

        # 1) Cast warm paper shadow onto LOWER sheets (shift sheet down-right & blur)
        sh_shifted = ndimage.shift(sheet, shift=(shadow_dy, shadow_dx), order=1, mode="nearest")
        sh_blur = ndimage.gaussian_filter(sh_shifted, sigma=3.8)
        # Shadow only falls outside the current sheet itself
        cast_sh = np.clip(sh_blur * (1.0 - sheet), 0.0, 1.0)
        sh_strength = 0.14 if i < 5 else 0.165
        rgb *= (1.0 - cast_sh[..., None] * sh_strength)

        # 2) Lay down the crisp paper sheet with Song mineral color
        col = palette[i + 1].copy()
        sheet3 = sheet[..., None]
        rgb = rgb * (1.0 - sheet3) + col * sheet3

        # 3) Sunlit NW paper cut edge rim highlight! (crispy handmade paper thickness)
        inner_shifted = ndimage.shift(sheet, shift=(-rim_dy, -rim_dx), order=1, mode="nearest")
        rim = np.clip(sheet - inner_shifted, 0.0, 1.0)
        # Also subtle darker SE cliff edge
        se_shifted = ndimage.shift(sheet, shift=(2, 2), order=1, mode="nearest")
        se_edge = np.clip(sheet - se_shifted, 0.0, 1.0)

        rgb += rim[..., None] * np.array([26.0, 24.0, 18.0], dtype=np.float32)
        rgb -= se_edge[..., None] * np.array([14.0, 16.0, 14.0], dtype=np.float32)

    # Blend gentle continuous real-DEM hillshade (gives real karst micro-topography inside each paper tier!)
    dz_dy, dz_dx = np.gradient(elev_s, 22.0)
    slope = np.hypot(dz_dx, dz_dy)
    # NW sunlight vector (-0.58, -0.58, 0.57)
    nx = -dz_dx / np.sqrt(dz_dx * dz_dx + dz_dy * dz_dy + 1.0)
    ny = -dz_dy / np.sqrt(dz_dx * dz_dx + dz_dy * dz_dy + 1.0)
    nz = 1.0 / np.sqrt(dz_dx * dz_dx + dz_dy * dz_dy + 1.0)
    shade = np.clip(nx * (-0.56) + ny * (-0.56) + nz * 0.61, 0.0, 1.0)
    # Normalize around neutral 0.62 so flat valleys stay luminous xuan paper
    hill_mod = 0.88 + 0.24 * ((shade - 0.35) / 0.65)
    hill_mod = np.clip(hill_mod, 0.80, 1.10)
    rgb *= hill_mod[..., None]

    # Subtle Song-style ochre mineral tint on steep sunlit karst ridges & Haiyang ginkgo warmth
    ridge_sun = np.clip((elev_s - 480.0) / 800.0, 0.0, 1.0) * np.clip((shade - 0.58) * 2.2, 0.0, 1.0)
    ochre_col = hex_rgb("#C9AE74")
    rgb = rgb * (1.0 - ridge_sun[..., None] * 0.16) + ochre_col * (ridge_sun[..., None] * 0.16)

    # Gentle Haiyang ginkgo warm gold mineral bloom & Chaotian peach-mist valley tint
    ginkgo_w = (haiyang_wash * smoothstep(260.0, 620.0, elev_s) * 0.20)[..., None]
    rgb = rgb * (1.0 - ginkgo_w) + hex_rgb("#D8B86A") * ginkgo_w
    peach_w = (chaotian_wash * (1.0 - smoothstep(190.0, 380.0, elev_s)) * 0.10)[..., None]
    rgb = rgb * (1.0 - peach_w) + hex_rgb("#E8C4B8") * peach_w

    # =========================================================================
    # JADE-GLASS REAL WATERWAYS (Qingshitan, Li River, Gantang River, Chaotian River)
    # =========================================================================
    print("Inlaying jade-glass real water bodies & subtle mineral road hairlines...")
    # Recessed bank shadow around water bodies (looks like water cut into paper!)
    w_dist = ndimage.distance_transform_edt(~water_core)
    bank_ao = np.exp(-w_dist / 3.5) * (1.0 - water_alpha)
    rgb *= (1.0 - bank_ao[..., None] * 0.14)

    # Inner water depth gradient (shoreline pale jade foam -> deep lake teal-jade)
    w_in_dist = ndimage.distance_transform_edt(water_core)
    deep_t = smoothstep(0.0, 18.0, w_in_dist)[..., None]
    water_shore = hex_rgb("#B5DBD5")
    water_deep = hex_rgb("#6BA8A6")
    water_col = water_shore * (1.0 - deep_t) + water_deep * deep_t
    # Delicate crisp white-jade water ripple shoreline
    shore_rim = np.clip(np.exp(-((w_in_dist - 1.5) ** 2) / 2.2), 0.0, 1.0) * water_alpha
    water_col += shore_rim[..., None] * np.array([22.0, 20.0, 14.0], dtype=np.float32)

    wa3 = np.clip(water_alpha * 0.96, 0.0, 1.0)[..., None]
    rgb = rgb * (1.0 - wa3) + water_col * wa3

    # =========================================================================
    # DELICATE MINERAL-GOLD ROAD NETWORK (G72/G322/S202 & Township Links)
    # =========================================================================
    roads_clean = ndimage.gaussian_filter(roads, sigma=0.7)
    roads_mask = np.clip((roads_clean - 0.18) / 0.55, 0.0, 1.0) * (1.0 - water_alpha) * county_mask
    # Subtle warm ink-ochre road hairlines — readable when zoomed in, never noisy from afar!
    road_col = hex_rgb("#B5986E")
    rm3 = (roads_mask * 0.42)[..., None]
    rgb = rgb * (1.0 - rm3) + road_col * rm3

    # =========================================================================
    # REAL LINGCHUAN COUNTY BORDER + GRACEFUL XUAN-PAPER SURROUNDING FADE
    # =========================================================================
    print("Applying real Lingchuan County editorial boundary & xuan-paper surround...")
    paper_bg = hex_rgb("#F5F0E3")
    # Outside Lingchuan County: soften into pale 26%-strength ghost relief fading smoothly into pure #F5F0E3 xuan paper!
    out_dist = ndimage.distance_transform_edt(~county_bool)
    outside_ghost = 0.24 * np.exp(-out_dist / 150.0)
    # Soft boundary transition
    in_soft = ndimage.gaussian_filter(county_mask, sigma=2.0)
    # Inside county: full vivid sculpted color; outside: pale xuan-paper whisper relief
    keep_weight = np.maximum(in_soft, outside_ghost * (1.0 - in_soft))
    # Also softly fade outer 5% frame border into pure #F5F0E3 so 3D tabletop blends with zero seam!
    fx = smoothstep(0.0, 0.055, xx_n / MASTER_W) * smoothstep(0.0, 0.055, 1.0 - xx_n / MASTER_W)
    fy = smoothstep(0.0, 0.055, yy_n / MASTER_H) * smoothstep(0.0, 0.055, 1.0 - yy_n / MASTER_H)
    keep_weight *= (fx * fy)

    # Desaturate slightly outside county so Lingchuan pops unmistakably as the jade centerpiece
    gray_lum = (rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114)[..., None]
    outside_rgb = rgb * 0.48 + gray_lum * 0.52
    blended_rgb = rgb * in_soft[..., None] + outside_rgb * (1.0 - in_soft[..., None])
    rgb = paper_bg * (1.0 - keep_weight[..., None]) + blended_rgb * keep_weight[..., None]

    # Subtle handmade xuan-paper fiber grain across entire sheet
    grain = make_paper_grain(MASTER_H, MASTER_W)
    rgb += grain[..., None] * 2.2

    # Crisp antique cartographic county boundary line (inner faint cinnabar-ink double hairline)
    border_outer = ndimage.binary_dilation(county_bool, iterations=3) ^ ndimage.binary_erosion(county_bool, iterations=1)
    border_blur = ndimage.gaussian_filter(border_outer.astype(np.float32), sigma=0.9)
    border_col = hex_rgb("#8C5D49")  # refined muted seal-ochre ink
    b3 = np.clip(border_blur * 0.55, 0.0, 0.65)[..., None]
    rgb = rgb * (1.0 - b3) + border_col * b3

    rgb_u8 = np.clip(np.round(rgb), 0, 255).astype(np.uint8)
    master_img = Image.fromarray(rgb_u8, "RGB")

    # =========================================================================
    # EXPORT L0 (1536x2048), L1 3x4 TILES (1024x1024), AND 3D HEIGHTMAP
    # =========================================================================
    OUT_MAP.mkdir(parents=True, exist_ok=True)
    OUT_TILES.mkdir(parents=True, exist_ok=True)

    l0_path = OUT_MAP / "lingchuan-dem-l0.webp"
    l0_img = master_img.resize((L0_W, L0_H), Image.Resampling.LANCZOS)
    l0_img.save(l0_path, "WEBP", quality=84, method=5)
    print(f"Saved L0 overview: {l0_path} ({l0_path.stat().st_size / 1024:.1f} KB)")

    tw, th = MASTER_W // TILE_COLS, MASTER_H // TILE_ROWS
    tile_total = 0
    for r in range(TILE_ROWS):
        for c in range(TILE_COLS):
            crop = master_img.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th))
            tp = OUT_TILES / f"tile-{r}-{c}.webp"
            crop.save(tp, "WEBP", quality=83, method=5)
            tile_total += tp.stat().st_size
    print(f"Saved {TILE_ROWS}x{TILE_COLS} ({TILE_ROWS * TILE_COLS}) 1024x1024 tiles: total={tile_total / 1024:.1f} KB (avg {tile_total / (TILE_ROWS * TILE_COLS) / 1024:.1f} KB)")

    # 3D Heightmap for Three.js terrain displacement (0..255 smooth sculpted height, masked cleanly to county + soft surround)
    # Map real elevation 135m..1650m -> 0.0..1.0 with slight concave curve so karst valleys & ridges both pop beautifully in 3D
    h_norm = np.clip((elev_s - 135.0) / 1450.0, 0.0, 1.0)
    h_sculpt = np.power(h_norm, 0.78)
    # Depress real water slightly so Qingshitan & Li River sit peacefully nestled in valleys
    h_sculpt = np.clip(h_sculpt - water_alpha * 0.06, 0.0, 1.0)
    # Smoothly flatten outside county into xuan-paper tabletop
    h_mask = ndimage.gaussian_filter(county_mask, sigma=28.0) * (fx * fy)
    h_final = h_sculpt * (0.12 + 0.88 * h_mask) * (fx * fy)
    h_small = Image.fromarray(np.clip(np.round(h_final * 255.0), 0, 255).astype(np.uint8), "L").resize(
        (HEIGHT_W, HEIGHT_H), Image.Resampling.BILINEAR
    )
    h_path = OUT_MAP / "lingchuan-dem-height.png"
    h_small.save(h_path, "PNG", optimize=True)
    print(f"Saved 3D heightmap: {h_path} ({h_path.stat().st_size / 1024:.1f} KB)")

    # Write map-geo.json so map-3d.js uses 100% exact same Mercator projection!
    # Also export simplified county outline + key rivers metadata for optional UI scale bar / telemetry
    geo_meta = {
        "projection": "web-mercator",
        "lonMin": round(LON_MIN, 6),
        "lonMax": round(LON_MAX, 6),
        "latMin": round(LAT_MIN, 6),
        "latMax": round(LAT_MAX, 6),
        "mxMin": round(MX_MIN, 8),
        "mxMax": round(MX_MAX, 8),
        "myMin": round(MY_MIN, 8),
        "myMax": round(MY_MAX, 8),
        "masterSize": [MASTER_W, MASTER_H],
        "tileGrid": {"cols": TILE_COLS, "rows": TILE_ROWS, "tileSize": tw},
        "heightRangeMeters": [135, 1650],
        "townshipsWgs84": {
            tid: {"lon": lon, "lat": lat, "name": name}
            for tid, (lon, lat, name) in townships_wgs84.items()
        },
    }
    geo_path = OUT_BASE / "map-geo.json"
    geo_path.write_text(json.dumps(geo_meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved geo metadata: {geo_path}")

    # Save visual QA previews to ~/.gb/lingchuan-dem-cache/ (full overview + 5x zoomed crops of Qingshitan, Daxu/Chaotian, Haiyang)
    l0_img.resize((960, 1280), Image.Resampling.LANCZOS).save(CACHE / "qa-overview.jpg", quality=90)
    # 1:1 native crop around Qingshitan Reservoir & Jiuwu
    qx, qy = lonlat_to_px(110.225, 25.545)
    master_img.crop((int(qx - 480), int(qy - 480), int(qx + 480), int(qy + 480))).save(CACHE / "qa-crop-qingshitan.jpg", quality=92)
    # 1:1 native crop around Daxu + Chaotian + Haiyang south
    cx, cy = lonlat_to_px(110.485, 25.205)
    master_img.crop((int(cx - 480), int(cy - 480), int(cx + 480), int(cy + 480))).save(CACHE / "qa-crop-chaotian-daxu.jpg", quality=92)
    print("Saved QA previews to ~/.gb/lingchuan-dem-cache/qa-*.jpg!")

if __name__ == "__main__":
    main()
