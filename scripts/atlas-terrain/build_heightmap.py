#!/usr/bin/env python3
"""Generate terrain height/normal/mask assets from hand-painted basemaps."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color, morphology, measure

REPO = Path(__file__).resolve().parents[2]
ASSETS = REPO / "public/atlas/v6/assets"
OUT_DIR = ASSETS / "terrain"
PREVIEW_DIR = REPO / "tmp/atlas-terrain"

NAMES = ("seven-kingdoms-basemap", "eastern-continent")

H_MIN, H_MAX = -30.0, 120.0  # h = u16/65535*150 - 30
BIN_W, BIN_H = 768, 512
FULL_W, FULL_H = 1536, 1024

ENCLOSED_OCEAN_MIN_AREA = 20000
LAKE_MAX_AREA = 3000
RIVER_MAX_WIDTH = 6.0

# Manual control points (pixel coords: col x, row y; origin top-left)
SALT_BASINS: dict[str, list[tuple[int, int, float]]] = {
    "seven-kingdoms-basemap": [(215, 410, 55.0)],
    "eastern-continent": [(1215, 700, 50.0)],
}

# (col, row, cone_radius R, peak height H, crater_radius_px, crater_lake_level, replace_island)
VOLCANO_MANUAL: dict[str, list[tuple[int, int, float, float, float, float, bool]]] = {
    "eastern-continent": [(790, 165, 45.0, 115.0, 10.0, 92.0, False)],
    "seven-kingdoms-basemap": [(870, 775, 38.0, 70.0, 16.0, 18.0, True)],
}

EROSION_DROPLETS = 250_000
EROSION_BATCHES = 20
EROSION_PARAMS = {
    "inertia": 0.05,
    "capacity": 4.0,
    "min_slope": 0.01,
    "erode": 0.3,
    "deposit": 0.3,
    "evaporate": 0.01,
    "gravity": 4.0,
    "max_steps": 64,
    "erode_radius": 3,
}

LAGOON_POINTS: dict[str, list[tuple[int, int, float]]] = {
    "seven-kingdoms-basemap": [(1320, 850, 28.0)],
}

CHECK_CROPS: list[tuple[str, int, int, str]] = [
    ("seven-kingdoms-basemap", 215, 410, "check-1.png"),
    ("eastern-continent", 1215, 700, "check-2.png"),
    ("eastern-continent", 725, 515, "check-3.png"),
    ("eastern-continent", 790, 165, "check-4.png"),
    ("seven-kingdoms-basemap", 265, 660, "check-5.png"),
]
CHECK_SIZE = 256

# Light from upper-left in image coords
_LIGHT_DX = -1.0 / np.sqrt(2.0)
_LIGHT_DY = -1.0 / np.sqrt(2.0)


def load_rgb(path: Path) -> np.ndarray:
    return np.asarray(Image.open(path).convert("RGB"), dtype=np.float64) / 255.0


def encode_u16(h: np.ndarray) -> np.ndarray:
    t = (h - H_MIN) / (H_MAX - H_MIN)
    return np.clip(np.round(t * 65535.0), 0, 65535).astype("<u2")


def smoothstep(edge0: float, edge1: float, x: np.ndarray) -> np.ndarray:
    t = np.clip((x - edge0) / (edge1 - edge0 + 1e-12), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def bright_turquoise_water(rgb: np.ndarray) -> np.ndarray:
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    cyan_hue = (hue > 0.42) & (hue < 0.72)
    bright = val > 0.35
    blue_cyan = (b > r + 0.02) | (g > r + 0.02)
    return cyan_hue & (sat > 0.10) & bright & blue_cyan


def classify_masks(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Ocean = border-connected water + enclosed areas > 20000 px; inland = rivers + small bright lakes."""
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]

    blue_dom = (b > r + 0.04) & (b > g - 0.02)
    cyan_hue = (hue > 0.42) & (hue < 0.72)
    water_color = (blue_dom | (cyan_hue & (sat > 0.12))) & (sat > 0.08) & (val > 0.08)
    water_color &= val < 0.92

    forest_green = (g > r + 0.03) & (g > b + 0.03) & (sat > 0.14) & (val > 0.10) & (val < 0.62)
    water_color &= ~forest_green

    snow_like = (val > 0.78) & (sat < 0.18)
    water_color &= ~snow_like

    water_color = morphology.binary_opening(water_color, morphology.disk(1))
    water_color = morphology.binary_closing(water_color, morphology.disk(2))

    lake_color = bright_turquoise_water(rgb)
    labeled = measure.label(water_color, connectivity=2)
    props = measure.regionprops(labeled)
    ocean = np.zeros(water_color.shape, dtype=bool)
    inland = np.zeros_like(ocean)

    for reg in props:
        mask = labeled == reg.label
        minr, minc, maxr, maxc = reg.bbox
        touches_border = (
            minr == 0 or minc == 0 or maxr >= water_color.shape[0] or maxc >= water_color.shape[1]
        )
        is_river = False
        if reg.area >= 400:
            cy, cx = reg.centroid
            yy, xx = np.nonzero(mask)
            if len(yy) > 0:
                cov = np.cov(np.vstack([yy - cy, xx - cx]))
                evals = np.linalg.eigvalsh(cov)
                evals = np.sort(np.maximum(evals, 1e-6))
                elong = evals[-1] / evals[0]
                width_est = 2.0 * np.sqrt(evals[0])
                if elong > 8 and width_est < RIVER_MAX_WIDTH:
                    is_river = True

        if is_river:
            inland[mask] = True
            continue

        if touches_border:
            ocean[mask] = True
        elif reg.area >= ENCLOSED_OCEAN_MIN_AREA:
            ocean[mask] = True
        elif reg.area < LAKE_MAX_AREA and np.any(lake_color[mask]):
            inland[mask] = True
        else:
            # Enclosed mis-tags (forest etc.) → land, not water
            pass

    land = ~(ocean | inland)
    land = morphology.binary_closing(land, morphology.disk(3))
    land = morphology.binary_opening(land, morphology.disk(2))

    lab_land = measure.label(land, connectivity=2)
    for reg in measure.regionprops(lab_land):
        if reg.area < 48:
            land[lab_land == reg.label] = False

    ocean = ~(land | inland)
    inland &= ~land

    land |= forest_green
    ocean &= ~forest_green
    inland &= ~forest_green

    land_major = land.copy()
    lab_major = measure.label(land, connectivity=2)
    for reg in measure.regionprops(lab_major):
        if reg.area < 300:
            land_major[lab_major == reg.label] = False
    dist_land = ndimage.distance_transform_edt(~land_major)
    shallow = ocean & (dist_land < 18)
    deep = ocean & ~shallow
    return deep, shallow, inland, land


def rock_snow_confidence(
    rgb: np.ndarray, land: np.ndarray, L: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]

    loc_std = local_std(L, 9)
    contrast = loc_std / (np.percentile(loc_std[land], 95) + 1e-6)
    contrast = np.clip(contrast, 0, 1)
    tex_hi = loc_std >= np.percentile(loc_std[land], 72)

    rock = land & (sat < 0.42) & (val > 0.18) & (val < 0.82)
    rock &= (hue > 0.02) & (hue < 0.18) | ((sat < 0.25) & (val > 0.25))
    rock = rock.astype(np.float64)

    dark_rock = land & (val > 0.10) & (val < 0.48) & (sat < 0.40)
    dark_rock &= contrast > 0.22
    dark_rock = dark_rock.astype(np.float64)

    rock_dog = ndimage.gaussian_filter(rock, 2.0) + dark_rock * 0.85
    neigh_tex = ndimage.gaussian_filter(contrast, 6.0)
    snow_raw = land & (val > 0.72) & (sat < 0.22) & (neigh_tex > 0.18)
    snow_raw &= rock_dog > 0.12
    snow = snow_raw.astype(np.float64)

    paint_rock = land & tex_hi & (sat < 0.48) & (val > 0.12) & (val < 0.78)
    rock = np.maximum(rock, paint_rock.astype(np.float64) * 0.75)
    rock = ndimage.gaussian_filter(rock + dark_rock * 0.9, 2.0)
    snow = ndimage.gaussian_filter(snow, 1.5)
    dark_rock = ndimage.gaussian_filter(dark_rock, 3.0)
    return np.clip(rock, 0, 1), np.clip(snow, 0, 1), np.clip(dark_rock, 0, 1)


def forest_grass_mask(rgb: np.ndarray, land: np.ndarray, loc_std: np.ndarray) -> np.ndarray:
    """Flat forest / steppe only — textured slopes keep full rock confidence for M."""
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    ls = loc_std[land]
    flat_cut = np.percentile(ls, 55) if ls.size else 0.0
    flat = loc_std <= flat_cut
    forest = (
        land
        & flat
        & (g > r + 0.05)
        & (g > b + 0.05)
        & (sat > 0.14)
        & (val > 0.12)
        & (val < 0.58)
    )
    grass = (
        land
        & flat
        & (hue > 0.07)
        & (hue < 0.17)
        & (sat > 0.10)
        & (sat < 0.42)
        & (val > 0.28)
        & (val < 0.68)
    )
    return forest | grass


def salt_basin_mask(
    rgb: np.ndarray, land: np.ndarray, L: np.ndarray, snow: np.ndarray
) -> np.ndarray:
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    loc_std = local_std(L, 9)
    contrast = loc_std / (np.percentile(loc_std[land], 95) + 1e-6)
    bright_flat = land & (val > 0.62) & (sat < 0.28) & (contrast < 0.22)
    bright_flat &= snow < 0.35
    desert_ring = (hue > 0.05) & (hue < 0.17) & (sat < 0.50) & (val > 0.35)
    desert_near = ndimage.gaussian_filter(desert_ring.astype(np.float64), 12.0) > 0.15
    basin = bright_flat & desert_near
    basin = morphology.binary_closing(basin, morphology.disk(4))
    return basin


def apply_salt_basins(
    h: np.ndarray,
    land: np.ndarray,
    name: str,
    yy: np.ndarray,
    xx: np.ndarray,
    basin_auto: np.ndarray,
) -> np.ndarray:
    soft_px = 40.0
    for cx, cy, radius in SALT_BASINS.get(name, []):
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        edge0 = max(radius - soft_px, 0.0)
        w = 1.0 - smoothstep(edge0, radius, dist)
        w *= land.astype(np.float64)
        flat = 1.0 + 2.0 * smoothstep(0.0, radius * 0.5, dist)
        flat = np.clip(flat, 1.0, 3.0)
        h = np.where(w > 0, h * (1.0 - w) + flat * w, h)
        lake_r = radius * 0.12
        lake = (dist < lake_r) & land
        h[lake] = 0.5
    if np.any(basin_auto):
        soft = ndimage.gaussian_filter(basin_auto.astype(np.float64), 8.0)
        soft = np.clip(soft, 0, 1)
        h = h * (1.0 - soft) + np.clip(1.0 + 2.0 * soft, 1.0, 3.0) * soft
    return h


def poisson_fft(gx: np.ndarray, gy: np.ndarray) -> np.ndarray:
    rows, cols = gx.shape
    fy = np.fft.fftfreq(rows) * 2.0 * np.pi
    fx = np.fft.fftfreq(cols) * 2.0 * np.pi
    kx, ky = np.meshgrid(fx, fy)
    denom = kx * kx + ky * ky
    denom[0, 0] = 1.0
    Gx = np.fft.fft2(gx)
    Gy = np.fft.fft2(gy)
    H = (1j * kx * Gx + 1j * ky * Gy) / denom
    H[0, 0] = 0.0
    return np.real(np.fft.ifft2(H))


def detail_from_shading(L: np.ndarray, land: np.ndarray) -> np.ndarray:
    L_blur = ndimage.gaussian_filter(L, 10.0)
    L_detail = L - L_blur
    g_d = L_detail.copy()
    g_d[~land] = 0.0
    gx = g_d * _LIGHT_DX
    gy = g_d * _LIGHT_DY
    h_detail = poisson_fft(gx, gy)
    h_detail = ndimage.gaussian_filter(h_detail, 1.5)
    h_detail[~land] = 0.0
    return h_detail


def local_std(L: np.ndarray, size: int = 9) -> np.ndarray:
    """Fast local std via uniform filters (same window as generic_filter size=N)."""
    L64 = L.astype(np.float64)
    mean = ndimage.uniform_filter(L64, size=size, mode="nearest")
    mean2 = ndimage.uniform_filter(L64 * L64, size=size, mode="nearest")
    return np.sqrt(np.maximum(mean2 - mean * mean, 0.0))


def mountain_envelope(
    L: np.ndarray,
    land: np.ndarray,
    rgb: np.ndarray,
    rock: np.ndarray,
    snow: np.ndarray,
    dark_rock: np.ndarray,
    basin_auto: np.ndarray,
) -> np.ndarray:
    loc_std = local_std(L, 9)
    ls = loc_std[land]
    p50, p97 = np.percentile(ls, [50, 97])
    m_std = np.clip((loc_std - p50) / (p97 - p50 + 1e-6), 0.0, 1.0)

    veg = forest_grass_mask(rgb, land, loc_std)
    color_conf = np.clip(rock + snow + dark_rock, 0.0, 1.0)
    # Forest/grass weight 0.35; elsewhere use rock/snow/dark confidence (floor 0.2 so ridges survive σ=18).
    weight = np.where(veg, 0.35, np.maximum(color_conf, 0.2))
    weight[~land] = 0.0

    m_raw = m_std * weight
    m_raw[basin_auto] *= 0.05
    m_smooth = ndimage.gaussian_filter(m_raw, 18.0)

    # Review target: M>0.5 covers ~18–25% of land. σ=18 flattens peaks, so
    # stretch land values so the top ~22% sit above 0.5 before smoothstep.
    land_vals = m_smooth[land]
    thr = float(np.percentile(land_vals, 78))  # ~22% of land above thr
    p99 = float(np.percentile(land_vals, 99))
    m_cal = 0.5 + (m_smooth - thr) / (p99 - thr + 1e-6) * 0.45
    m_cal = np.clip(m_cal, 0.0, 1.0)

    M = smoothstep(0.25, 0.75, m_cal)
    M[~land] = 0.0
    return M


def lowfreq_noise(shape: tuple[int, int], seed: int, amp: float) -> np.ndarray:
    rng = np.random.default_rng(seed)
    n = rng.standard_normal(shape)
    return ndimage.gaussian_filter(n, 24.0) * amp


def _volcano_ridge_count(seed: int) -> int:
    return int(np.random.default_rng(seed).integers(5, 8))


def apply_volcano_manual(
    h: np.ndarray, land: np.ndarray, name: str, yy: np.ndarray, xx: np.ndarray
) -> np.ndarray:
    seed = hash(f"{name}-volcano") & 0xFFFFFFFF
    rng = np.random.default_rng(seed)
    n_ridges = _volcano_ridge_count(seed)
    ridge_phases = rng.uniform(0, 2 * np.pi, size=n_ridges)
    az_wobble_phase = rng.uniform(0, 2 * np.pi)

    for cx, cy, R, H, crater_r, lake_level, replace_island in VOLCANO_MANUAL.get(name, []):
        dy = yy.astype(np.float64) - cy
        dx = xx.astype(np.float64) - cx
        theta = np.arctan2(dy, dx)
        dist = np.hypot(dx, dy)

        R_theta = R * (1.0 + 0.12 * np.sin(3.0 * theta + az_wobble_phase))
        r_norm = dist / (R_theta + 1e-6)

        ridge = np.zeros_like(dist)
        for i in range(n_ridges):
            ridge += np.sin((i + 2) * theta + ridge_phases[i] + dist * 0.11)
        ridge = 4.0 * ridge / max(n_ridges, 1)
        ridge *= np.clip(1.0 - r_norm, 0.0, 1.0) ** 0.6

        rim_raise = float(rng.uniform(18.0, 24.0))
        crater_floor = lake_level
        rim_crest = crater_floor + rim_raise

        cone = H * np.clip(1.0 - r_norm, 0.0, 1.0) ** 1.6 + ridge
        outer = cone.copy()
        outer[dist < crater_r] = crater_floor

        rim_w = 5.0
        in_rim = (dist >= crater_r) & (dist < crater_r + rim_w)
        if np.any(in_rim):
            t = (dist[in_rim] - crater_r) / rim_w
            bump = np.sin(np.pi * t) ** 2
            outer[in_rim] = crater_floor + rim_raise * bump

        beyond = dist >= crater_r + rim_w
        if np.any(beyond):
            r_outer = dist[beyond]
            R_o = R_theta[beyond]
            base = H * np.clip(1.0 - r_outer / (R_o + 1e-6), 0.0, 1.0) ** 1.6 + ridge[beyond]
            join = np.clip((r_outer - crater_r - rim_w) / 10.0, 0.0, 1.0)
            outer[beyond] = (1.0 - join) * rim_crest + join * base
            outer[beyond] = np.maximum(outer[beyond], base)

        outer_s = ndimage.gaussian_filter(outer, 4.0)
        keep_sharp = dist < crater_r + rim_w + 2.0
        outer = np.where(keep_sharp, outer, outer_s)
        volcano_zone = dist < R * 1.08
        if replace_island:
            apply_mask = volcano_zone & land
            h[apply_mask] = outer[apply_mask]
        else:
            h = np.where(volcano_zone, np.maximum(h, outer), h)

    return h


def apply_lagoons(
    h: np.ndarray, land: np.ndarray, name: str, yy: np.ndarray, xx: np.ndarray
) -> np.ndarray:
    for cx, cy, radius in LAGOON_POINTS.get(name, []):
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        lagoon = land & (dist < radius)
        depth = -1.0 - 0.8 * (dist / max(radius, 1))
        depth = np.clip(depth, -2.0, -1.0)
        h[lagoon] = depth[lagoon]
    return h


def dark_rock_mountain_mask(
    rgb: np.ndarray, land: np.ndarray, L: np.ndarray, dark_rock: np.ndarray, name: str
) -> np.ndarray:
    """Dark brown / gray rock with local contrast — used for extra M gain in west-south band."""
    if "seven-kingdoms" not in name:
        return np.zeros(land.shape, dtype=np.float64)
    rows, cols = land.shape
    r0, r1, c0, c1 = 560, 760, 200, 330
    region = np.zeros((rows, cols), dtype=np.float64)
    region[r0:r1, c0:c1] = 1.0
    region = ndimage.gaussian_filter(region, 24.0)

    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    loc_std = local_std(L, 9)
    contrast = loc_std / (np.percentile(loc_std[land], 95) + 1e-6)
    contrast = np.clip(contrast, 0.0, 1.0)

    dark_brown = land & (val > 0.08) & (val < 0.52) & (sat < 0.45)
    dark_brown &= (hue > 0.02) & (hue < 0.14) | ((sat < 0.22) & (val > 0.18))
    pixel = (dark_brown | (dark_rock > 0.18)) & (contrast > 0.20)
    strength = np.clip(dark_rock + contrast * 0.55, 0.0, 1.0) * pixel.astype(np.float64)
    strength *= region
    gain = ndimage.gaussian_filter(strength, 15.0)
    return np.clip(gain, 0.0, 1.0)


def boost_dark_rock_m(M: np.ndarray, land: np.ndarray, gain_field: np.ndarray) -> np.ndarray:
    extra = np.clip(gain_field, 0.0, 1.0) * 0.35
    M2 = np.clip(M + extra, 0.0, 1.0)
    M2[~land] = 0.0
    return M2


def build_height(
    rgb: np.ndarray, name: str, deep: np.ndarray, shallow: np.ndarray, inland: np.ndarray, land: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows, cols = land.shape
    yy, xx = np.mgrid[0:rows, 0:cols]
    # Do not stamp circular land disks for volcanoes — that made the island a sea ring.
    inland &= ~land
    deep &= ~land
    shallow &= ~land

    dist_sea = ndimage.distance_transform_edt(~(deep | shallow))

    land_major = land.copy()
    lab_major = measure.label(land, connectivity=2)
    for reg in measure.regionprops(lab_major):
        if reg.area < 300:
            land_major[lab_major == reg.label] = False
    dist_land = ndimage.distance_transform_edt(~land_major)

    ocean_mask = deep | shallow
    h = np.full((rows, cols), -30.0, dtype=np.float64)
    depth = (
        -1.0
        - smoothstep(0.0, 60.0, dist_land) * 25.0
        - smoothstep(60.0, 120.0, dist_land) * 4.0
    )
    depth = np.clip(depth, -30.0, -1.0)
    h[ocean_mask] = depth[ocean_mask]

    d_in = ndimage.distance_transform_edt(land)
    base = 0.8 + 11.0 * smoothstep(0.0, 60.0, d_in)
    base += lowfreq_noise((rows, cols), hash(name) & 0xFFFF, 2.0)
    base[~land] = 0.0

    lab = color.rgb2lab(rgb)
    L = lab[..., 0]

    rock, snow, dark_rock = rock_snow_confidence(rgb, land, L)
    basin_auto = salt_basin_mask(rgb, land, L, snow)

    h_detail = detail_from_shading(L, land)
    M = mountain_envelope(L, land, rgb, rock, snow, dark_rock, basin_auto)
    dr_gain = dark_rock_mountain_mask(rgb, land, L, dark_rock, name)
    M = boost_dark_rock_m(M, land, dr_gain)

    mtn = M > 0.2
    if np.any(mtn):
        pos = np.maximum(h_detail[mtn], 0.0)
        p5, p99 = np.percentile(pos, [5, 99])
        norm_detail = np.clip((np.maximum(h_detail, 0.0) - p5) / (p99 - p5 + 1e-6), 0.0, 1.0)
    else:
        norm_detail = np.zeros_like(h_detail)

    low_bump = np.clip(h_detail * 0.25, -3.0, 5.0)
    h_land = base + M * (25.0 + 80.0 * norm_detail) + (1.0 - M) * low_bump
    h_land += snow * 10.0 * M
    h_land[~land] = 0.0

    h[land] = h_land[land]

    if np.any(inland):
        lab_w = measure.label(inland, connectivity=2)
        for reg in measure.regionprops(lab_w):
            mask = lab_w == reg.label
            if reg.area < LAKE_MAX_AREA and np.any(bright_turquoise_water(rgb)[mask]):
                h[mask] = 0.5
                continue
            ring = morphology.binary_dilation(mask, morphology.disk(4)) & land & ~mask
            surround = h[ring]
            if surround.size:
                level = float(np.median(surround)) - 1.5
            else:
                level = 2.0
            level = max(level, 0.5)
            h[mask] = level

    h = apply_salt_basins(h, land, name, yy, xx, basin_auto)
    h = apply_lagoons(h, land, name, yy, xx)

    coast_band = land & (dist_sea < 5)
    blend = np.clip(dist_sea / 5.0, 0, 1)
    sea_near = -1.0 - (1.0 - blend[coast_band]) * 2.0
    h[coast_band] = h[coast_band] * blend[coast_band] + sea_near * (1.0 - blend[coast_band])

    edge = 12
    w_edge = np.ones((rows, cols))
    w_edge[:edge, :] = np.minimum(w_edge[:edge, :], np.linspace(0, 1, edge)[:, None])
    w_edge[-edge:, :] = np.minimum(w_edge[-edge:, :], np.linspace(1, 0, edge)[:, None])
    w_edge[:, :edge] = np.minimum(w_edge[:, :edge], np.linspace(0, 1, edge)[None, :])
    w_edge[:, -edge:] = np.minimum(w_edge[:, -edge:], np.linspace(1, 0, edge)[None, :])
    h = h * w_edge + (-30.0) * (1.0 - w_edge)

    h[land] = np.maximum(h[land], 0.5)
    h = apply_volcano_manual(h, land, name, yy, xx)
    h[land] = np.maximum(h[land], 0.5)
    h = np.clip(h, H_MIN, H_MAX)
    return h, land, M, basin_auto


def build_mask_uint8(deep: np.ndarray, shallow: np.ndarray, land: np.ndarray, inland: np.ndarray) -> np.ndarray:
    m = np.zeros(deep.shape, dtype=np.uint8)
    m[deep] = 0
    m[shallow] = 128
    m[land | inland] = 255
    return m


def height_to_normal(h: np.ndarray, pixel_size: float = 1.0) -> np.ndarray:
    h_pad = np.pad(h, 1, mode="edge")
    dzdx = (h_pad[1:-1, 2:] - h_pad[1:-1, :-2]) / (2 * pixel_size)
    dzdy_up = (h_pad[:-2, 1:-1] - h_pad[2:, 1:-1]) / (2 * pixel_size)
    nx = -dzdx
    ny = -dzdy_up
    nz = np.ones_like(nx)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx /= norm
    ny /= norm
    nz /= norm
    rgb = np.stack(
        [
            np.clip((nx * 0.5 + 0.5) * 255, 0, 255),
            np.clip((ny * 0.5 + 0.5) * 255, 0, 255),
            np.clip((nz * 0.5 + 0.5) * 255, 0, 255),
        ],
        axis=-1,
    ).astype(np.uint8)
    return rgb


def hillshade(h: np.ndarray, azimuth: float = 315.0, altitude: float = 45.0) -> np.ndarray:
    gy, gx = np.gradient(h)
    slope = np.pi / 2.0 - np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az = np.deg2rad(azimuth)
    alt = np.deg2rad(altitude)
    shaded = np.sin(alt) * np.sin(slope) + np.cos(alt) * np.cos(slope) * np.cos(az - aspect)
    return np.clip(shaded, 0, 1)


def elevation_colormap(h: np.ndarray) -> np.ndarray:
    t = (h - H_MIN) / (H_MAX - H_MIN)
    t = np.clip(t, 0, 1)
    r = np.clip(1.5 * t - 0.2, 0, 1)
    g = np.clip(1.2 - np.abs(t - 0.45) * 2.5, 0, 1)
    b = np.clip(0.8 - t * 1.2, 0, 1)
    return np.stack([r, g, b], axis=-1)


def write_preview(h: np.ndarray, path: Path) -> None:
    hs = hillshade(h)
    col = elevation_colormap(h)
    img = np.clip(col * (0.45 + 0.55 * hs[..., None]), 0, 1)
    Image.fromarray((img * 255).astype(np.uint8)).save(path)


def write_check_crop(h: np.ndarray, cx: int, cy: int, path: Path, half: int = CHECK_SIZE // 2) -> None:
    rows, cols = h.shape
    r0, r1 = max(0, cy - half), min(rows, cy + half)
    c0, c1 = max(0, cx - half), min(cols, cx + half)
    patch = h[r0:r1, c0:c1]
    hs = hillshade(patch)
    col = elevation_colormap(patch)
    img = np.clip(col * (0.45 + 0.55 * hs[..., None]), 0, 1)
    out = np.zeros((CHECK_SIZE, CHECK_SIZE, 3), dtype=np.float64)
    pr0 = half - (cy - r0)
    pc0 = half - (cx - c0)
    out[pr0 : pr0 + patch.shape[0], pc0 : pc0 + patch.shape[1]] = img
    Image.fromarray((out * 255).astype(np.uint8)).save(path)


def verify_volcano_peaks(heights: dict[str, np.ndarray]) -> None:
    for name in NAMES:
        cx, cy, vr, rim_h, crater_r, lake, _rep = VOLCANO_MANUAL[name][0]
        h = heights[name]
        crater = float(h[cy, cx])
        yy, xx = np.mgrid[0 : h.shape[0], 0 : h.shape[1]]
        dist = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
        rim_band = (dist > crater_r * 0.85) & (dist < crater_r + 6.0)
        rim = float(np.max(h[rim_band])) if np.any(rim_band) else float("nan")
        outer_band = (dist > crater_r + 4.0) & (dist < vr * 0.92)
        peak = float(np.max(h[outer_band])) if np.any(outer_band) else float("nan")
        print(
            f"  volcano {name} @({cx},{cy}): crater_rim~{rim:.1f} crater={crater:.1f} "
            f"peak~{peak:.1f} (H~{rim_h:.0f} lake~{lake:.0f} R={vr:.0f}px crater_r={crater_r:.0f}px)"
        )


def downsample_height(h: np.ndarray) -> np.ndarray:
    zoom_y = BIN_H / h.shape[0]
    zoom_x = BIN_W / h.shape[1]
    return ndimage.zoom(h, (zoom_y, zoom_x), order=1)


def upsample_height(h_bin: np.ndarray) -> np.ndarray:
    zoom_y = FULL_H / h_bin.shape[0]
    zoom_x = FULL_W / h_bin.shape[1]
    return ndimage.zoom(h_bin, (zoom_y, zoom_x), order=1)


def downsample_mask(mask: np.ndarray) -> np.ndarray:
    zoom_y = BIN_H / mask.shape[0]
    zoom_x = BIN_W / mask.shape[1]
    scaled = ndimage.zoom(mask.astype(np.float64), (zoom_y, zoom_x), order=0)
    return scaled > 0.5


def build_erosion_freeze(
    name: str, land: np.ndarray, yy: np.ndarray, xx: np.ndarray, basin_auto: np.ndarray
) -> np.ndarray:
    freeze = basin_auto.copy()
    for cx, cy, radius in SALT_BASINS.get(name, []):
        dist = np.hypot(xx - cx, yy - cy)
        freeze |= land & (dist < radius + 10.0)
    for cx, cy, R, _h, crater_r, _lake, _rep in VOLCANO_MANUAL.get(name, []):
        dist = np.hypot(xx - cx, yy - cy)
        freeze |= land & (dist < max(R * 1.12, crater_r + 8.0))
    return freeze & land


def land_mean_slope(h: np.ndarray, mask: np.ndarray) -> float:
    gy, gx = np.gradient(h.astype(np.float64))
    s = np.hypot(gx, gy)
    m = mask & (h > 0)
    if not np.any(m):
        return float("nan")
    return float(np.mean(s[m]))


def land_height_percentiles(h: np.ndarray, mask: np.ndarray) -> tuple[float, float, float]:
    vals = h[mask & (h > 0)]
    if vals.size == 0:
        return (float("nan"), float("nan"), float("nan"))
    q = np.percentile(vals, [50, 90, 99])
    return float(q[0]), float(q[1]), float(q[2])


_SPLAT_OFFSETS: list[tuple[int, int, float]] = []
for _dy in range(-3, 4):
    for _dx in range(-3, 4):
        _d2 = _dx * _dx + _dy * _dy
        if _d2 <= 9:
            _SPLAT_OFFSETS.append((_dy, _dx, 1.0 - np.sqrt(_d2) / 3.0))


def _vector_splat(
    h: np.ndarray,
    freeze: np.ndarray,
    cy: np.ndarray,
    cx: np.ndarray,
    amounts: np.ndarray,
) -> None:
    rows, cols = h.shape
    yi = np.round(cy).astype(np.int32)
    xi = np.round(cx).astype(np.int32)
    for dy, dx, w in _SPLAT_OFFSETS:
        y = yi + dy
        x = xi + dx
        valid = (y >= 0) & (y < rows) & (x >= 0) & (x < cols)
        if not np.any(valid):
            continue
        yv, xv = y[valid], x[valid]
        fv = freeze[yv, xv]
        if np.all(fv):
            continue
        m = ~fv
        yw, xw = yv[m], xv[m]
        np.add.at(h, (yw, xw), amounts[valid][m] * w)


def _sample_height_grad(
    h: np.ndarray, x: np.ndarray, y: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows, cols = h.shape
    x = np.clip(x, 0.0, cols - 1.001)
    y = np.clip(y, 0.0, rows - 1.001)
    x0 = np.floor(x).astype(np.int32)
    y0 = np.floor(y).astype(np.int32)
    fx = x - x0
    fy = y - y0
    x1 = np.minimum(x0 + 1, cols - 1)
    y1 = np.minimum(y0 + 1, rows - 1)
    h00 = h[y0, x0]
    h10 = h[y0, x1]
    h01 = h[y1, x0]
    h11 = h[y1, x1]
    h_s = h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
    gx = (h10 - h00) * (1 - fy) + (h11 - h01) * fy
    gy = (h01 - h00) * (1 - fx) + (h11 - h10) * fx
    return h_s, gx, gy


def hydraulic_erosion(
    h: np.ndarray,
    erode_land: np.ndarray,
    freeze: np.ndarray,
    seed: int,
) -> np.ndarray:
    """Particle hydraulic erosion on a single height grid (768×512)."""
    p = EROSION_PARAMS
    rows, cols = h.shape
    h = h.astype(np.float64, copy=True)
    h_orig = h.copy()
    spawn = np.argwhere(erode_land & ~freeze)
    if spawn.size == 0:
        return h

    rng = np.random.default_rng(seed)
    per_batch = EROSION_DROPLETS // EROSION_BATCHES
    inertia = p["inertia"]
    cap = p["capacity"]
    min_slope = p["min_slope"]
    erode_k = p["erode"]
    deposit_k = p["deposit"]
    evaporate = p["evaporate"]
    gravity = p["gravity"]
    max_steps = int(p["max_steps"])
    erode_r = int(p["erode_radius"])

    for batch_i in range(EROSION_BATCHES):
        picks = rng.integers(0, spawn.shape[0], size=per_batch)
        pos_y = spawn[picks, 0].astype(np.float64) + 0.5
        pos_x = spawn[picks, 1].astype(np.float64) + 0.5
        dir_x = np.zeros(per_batch, dtype=np.float64)
        dir_y = np.zeros(per_batch, dtype=np.float64)
        speed = np.zeros(per_batch, dtype=np.float64)
        water = np.ones(per_batch, dtype=np.float64)
        sediment = np.zeros(per_batch, dtype=np.float64)
        alive = np.ones(per_batch, dtype=bool)

        for _step in range(max_steps):
            if not np.any(alive):
                break
            idx = np.nonzero(alive)[0]
            px = pos_x[idx]
            py = pos_y[idx]
            h_s, gx, gy = _sample_height_grad(h, px, py)
            sx = -gx
            sy = -gy
            sl = np.hypot(sx, sy)
            sx = np.where(sl < 1e-8, 0.0, sx / sl)
            sy = np.where(sl < 1e-8, 0.0, sy / sl)
            dir_x[idx] = dir_x[idx] * inertia + sx * (1.0 - inertia)
            dir_y[idx] = dir_y[idx] * inertia + sy * (1.0 - inertia)
            dl = np.hypot(dir_x[idx], dir_y[idx])
            dir_x[idx] = np.where(dl < 1e-8, sx, dir_x[idx] / np.maximum(dl, 1e-8))
            dir_y[idx] = np.where(dl < 1e-8, sy, dir_y[idx] / np.maximum(dl, 1e-8))
            speed[idx] = np.maximum(speed[idx] + gravity * sl, min_slope)
            cap_i = np.maximum(sl, min_slope) * speed[idx] * water[idx] * cap

            erode_amt = np.minimum(
                (cap_i - sediment[idx]) * erode_k,
                np.maximum(h_s - H_MIN, 0.0) * 0.08,
            )
            erode_amt = np.maximum(erode_amt, 0.0)
            deposit_amt = np.maximum((sediment[idx] - cap_i) * deposit_k, 0.0)

            e_ok = erode_amt > 1e-6
            if np.any(e_ok):
                _vector_splat(h, freeze, py[e_ok], px[e_ok], -erode_amt[e_ok])
                sediment[idx[e_ok]] += erode_amt[e_ok]
            d_ok = deposit_amt > 1e-6
            if np.any(d_ok):
                _vector_splat(h, freeze, py[d_ok], px[d_ok], deposit_amt[d_ok])
                sediment[idx[d_ok]] -= deposit_amt[d_ok]

            pos_x[idx] += dir_x[idx]
            pos_y[idx] += dir_y[idx]
            water[idx] *= 1.0 - evaporate
            oob = (
                (pos_x[idx] < 0)
                | (pos_x[idx] >= cols)
                | (pos_y[idx] < 0)
                | (pos_y[idx] >= rows)
            )
            alive[idx] = (~oob) & (water[idx] > 0.05)

        if (batch_i + 1) % 5 == 0:
            print(f"    erosion batch {batch_i + 1}/{EROSION_BATCHES}")

    h[freeze] = h_orig[freeze]
    h[~erode_land] = h_orig[~erode_land]
    return h


def blend_erosion_delta(
    h_before: np.ndarray,
    h_eroded: np.ndarray,
    erode_mask: np.ndarray,
    target_p90_delta_pct: float = 12.0,
) -> np.ndarray:
    """Mix eroded heights so land p90 shifts modestly (review: within ~±15%)."""
    delta = (h_eroded - h_before) * erode_mask.astype(np.float64)
    _, p90_b, _ = land_height_percentiles(h_before, erode_mask)
    if not np.isfinite(p90_b) or p90_b < 1e-3:
        return np.clip(h_before, H_MIN, H_MAX)
    mix = 0.14
    for _ in range(8):
        h_try = h_before + delta * mix
        h_try = np.clip(h_try, H_MIN, H_MAX)
        _, p90_t, _ = land_height_percentiles(h_try, erode_mask)
        chg = 100.0 * (p90_t - p90_b) / p90_b
        if abs(chg) <= target_p90_delta_pct:
            return h_try
        if abs(p90_t - p90_b) < 1e-6:
            return h_try
        mix *= target_p90_delta_pct / max(abs(chg), 1e-3)
        mix = float(np.clip(mix, 0.02, 0.45))
    h_out = h_before + delta * mix
    return np.clip(h_out, H_MIN, H_MAX)


def write_erosion_preview(h: np.ndarray, path: Path) -> None:
    hs = hillshade(h, azimuth=315.0, altitude=45.0)
    gray = (np.clip(hs, 0, 1) * 255).astype(np.uint8)
    Image.fromarray(gray, mode="L").save(path)


def print_ocean_depth_diagnostics(h: np.ndarray, land: np.ndarray, inland: np.ndarray) -> None:
    land_major = land.copy()
    lab_major = measure.label(land, connectivity=2)
    for reg in measure.regionprops(lab_major):
        if reg.area < 300:
            land_major[lab_major == reg.label] = False
    dist_land = ndimage.distance_transform_edt(~land_major)
    ocean = ~(land | inland)
    far = ocean & (dist_land > 120.0)
    if np.any(far):
        pct_above = 100.0 * float(np.mean(h[far] > -28.0))
        print(f"  ocean dist>120px above -28: {pct_above:.3f}% (n={int(far.sum())})")
    else:
        print("  ocean dist>120px above -28: n/a (no pixels)")
    for row in (0, 5, 20):
        if row < h.shape[0]:
            print(f"  row {row} max height: {float(h[row].max()):.2f}")


def print_stats(
    name: str, h: np.ndarray, land: np.ndarray, M: np.ndarray, inland: np.ndarray
) -> None:
    land_h = h[land & (h > 0)]
    total = h.size
    pct_land = 100.0 * land_h.size / total
    mx = float(land_h.max()) if land_h.size else float("nan")
    qs = np.percentile(land_h, [10, 50, 90, 99]) if land_h.size else [0] * 4
    m_half = 100.0 * np.sum((M > 0.5) & land) / max(land.sum(), 1)
    print(f"=== {name} ===")
    print(f"  land_fraction: {pct_land:.2f}%")
    print(f"  max_height (land): {mx:.2f}")
    print(f"  percentiles (10/50/90/99): " + "/".join(f"{q:.2f}" for q in qs))
    print(f"  M>0.5 on land: {m_half:.2f}%")
    print_ocean_depth_diagnostics(h, land, inland)


def process_one(name: str) -> tuple[np.ndarray, np.ndarray]:
    path = ASSETS / f"{name}.webp"
    rgb = load_rgb(path)
    assert rgb.shape[:2] == (FULL_H, FULL_W), rgb.shape

    deep, shallow, inland, land = classify_masks(rgb)
    h_full, land, M, basin_auto = build_height(rgb, name, deep, shallow, inland, land)
    rows, cols = land.shape
    yy, xx = np.mgrid[0:rows, 0:cols]

    freeze_full = build_erosion_freeze(name, land, yy, xx, basin_auto)
    land_bin = downsample_mask(land)
    freeze_bin = downsample_mask(freeze_full)
    h_bin = downsample_height(h_full)
    erode_mask = land_bin & (h_bin > 0) & ~freeze_bin

    slope_before = land_mean_slope(h_bin, erode_mask)
    p50_b, p90_b, p99_b = land_height_percentiles(h_bin, erode_mask)
    print(f"  erosion before ({name}): p50={p50_b:.2f} p90={p90_b:.2f} p99={p99_b:.2f} mean_slope={slope_before:.4f}")

    t_e = time.perf_counter()
    h_bin_before = h_bin.copy()
    h_bin_er = hydraulic_erosion(
        h_bin, land_bin, freeze_bin, hash(name + "-erode") & 0xFFFFFFFF
    )
    print(f"  erosion time: {time.perf_counter() - t_e:.1f}s")
    h_bin = blend_erosion_delta(h_bin_before, h_bin_er, erode_mask)

    slope_after = land_mean_slope(h_bin, erode_mask)
    p50_a, p90_a, p99_a = land_height_percentiles(h_bin, erode_mask)
    p90_chg = 100.0 * (p90_a - p90_b) / (p90_b + 1e-6)
    print(
        f"  erosion after  ({name}): p50={p50_a:.2f} p90={p90_a:.2f} p99={p99_a:.2f} "
        f"mean_slope={slope_after:.4f} (p90 Δ{p90_chg:+.1f}%)"
    )

    h_bin = ndimage.gaussian_filter(h_bin, 1.0)
    h_bin = np.clip(h_bin, H_MIN, H_MAX)
    h_bin[~land_bin] = np.minimum(h_bin[~land_bin], 0.0)

    h = h_full.copy()
    h_up = upsample_height(h_bin)
    h[land] = np.maximum(h_up[land], 0.5)
    h = np.clip(h, H_MIN, H_MAX)

    mask = build_mask_uint8(deep, shallow, land, inland)
    normal = height_to_normal(h, pixel_size=1.0)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

    (OUT_DIR / f"{name}.height.bin").write_bytes(encode_u16(h_bin).tobytes())
    Image.fromarray(normal, mode="RGB").save(OUT_DIR / f"{name}.normal.png")
    Image.fromarray(mask, mode="L").save(OUT_DIR / f"{name}.mask.png")
    write_preview(h, PREVIEW_DIR / f"preview-{name}.png")
    write_erosion_preview(h_bin, PREVIEW_DIR / f"erosion-{name}.png")

    print_stats(name, h, land, M, inland)
    return h, land


def main() -> int:
    t0 = time.perf_counter()
    heights: dict[str, np.ndarray] = {}
    for name in NAMES:
        h, _land = process_one(name)
        heights[name] = h
    verify_volcano_peaks(heights)
    for map_name, cx, cy, fname in CHECK_CROPS:
        write_check_crop(heights[map_name], cx, cy, PREVIEW_DIR / fname)
    print("\nCheck crops:", ", ".join(c[3] for c in CHECK_CROPS))
    elapsed = time.perf_counter() - t0
    print(f"\nDone in {elapsed:.1f}s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
