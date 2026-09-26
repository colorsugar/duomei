#!/usr/bin/env python3
"""Super-continent (chaoji) heightmap from basemap.webp — separate from v6 build_heightmap."""

from __future__ import annotations

import sys
import time
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage
from skimage import color, morphology, measure, restoration

# Reuse erosion / shading helpers without modifying build_heightmap.py
import build_heightmap as bh

REPO = Path(__file__).resolve().parents[2]
BASemap_PATH = REPO / "public/atlas/chaoji/assets/basemap.webp"
OUT_DIR = REPO / "public/atlas/chaoji/assets/terrain"
PREVIEW_DIR = REPO / "tmp/atlas-terrain"

ORIG_W, ORIG_H = 4096, 2304
FULL_W, FULL_H = 2048, 1152
BIN_W, BIN_H = 1024, 576
SCALE = FULL_W / ORIG_W  # 0.5

H_MIN, H_MAX = -12.0, 48.0
NAME = "basemap"

ENCLOSED_OCEAN_MIN_AREA = 20000
LAKE_MAX_AREA = 3000

# Soft regional gains must use σ≥40 (review). Hard rects only for audit edges.
SOFT_SIGMA = 40.0
SFS_ENVELOPE_SIGMA = 18.0

# (cx, cy, R, H, crater_r, crater_depth) @ FULL 2048×1152 — concave cone, no rim rings
VOLCANO_CHAOJI: list[tuple[int, int, float, float, float, float]] = [
    (1520, 710, 230.0, 46.0, 14.0, 8.0),
    (1300, 540, 70.0, 25.0, 8.0, 5.0),
]

# Preview-space rects that previously showed hard edges (for Sobel audit)
AUDIT_RECTS_PREVIEW: list[tuple[str, int, int, int, int]] = [
    ("snow_band", 640, 50, 1420, 730),
    ("west_delta", 195, 245, 640, 535),
    ("volcano_zone", 1240, 560, 1700, 740),
]

EROSION_DROPLETS = 250_000


def sbox(x0: int, y0: int, x1: int, y1: int) -> tuple[int, int, int, int]:
    """Original 4096×2304 pixel rect → FULL slice rows/cols."""
    c0 = int(round(x0 * SCALE))
    c1 = int(round(x1 * SCALE))
    r0 = int(round(y0 * SCALE))
    r1 = int(round(y1 * SCALE))
    return r0, r1, c0, c1


def soft_rect(
    shape: tuple[int, int],
    c0: int,
    r0: int,
    c1: int,
    r1: int,
    sigma: float = SOFT_SIGMA,
) -> np.ndarray:
    """Unit rect blurred with Gaussian σ — no hard edges for regional gains."""
    m = np.zeros(shape, dtype=np.float64)
    rr0, rr1 = max(0, r0), min(shape[0], r1)
    cc0, cc1 = max(0, c0), min(shape[1], c1)
    if rr1 > rr0 and cc1 > cc0:
        m[rr0:rr1, cc0:cc1] = 1.0
    if sigma > 0:
        m = ndimage.gaussian_filter(m, sigma)
        peak = float(m.max()) if m.size else 1.0
        if peak > 1e-9:
            m /= peak
    return np.clip(m, 0.0, 1.0)


def soft_rect_preview(
    shape: tuple[int, int], x0: int, y0: int, x1: int, y1: int, sigma: float = SOFT_SIGMA
) -> np.ndarray:
    """Preview/FULL coords (2048×1152 space); scales if shape is BIN."""
    sy = shape[0] / FULL_H
    sx = shape[1] / FULL_W
    return soft_rect(
        shape,
        int(round(x0 * sx)),
        int(round(y0 * sy)),
        int(round(x1 * sx)),
        int(round(y1 * sy)),
        sigma=sigma * min(sx, sy),
    )


def soft_rect_orig(
    shape: tuple[int, int], x0: int, y0: int, x1: int, y1: int, sigma: float = SOFT_SIGMA
) -> np.ndarray:
    """ORIG 4096×2304 coords → soft mask at working resolution."""
    sy = shape[0] / ORIG_H
    sx = shape[1] / ORIG_W
    return soft_rect(
        shape,
        int(round(x0 * sx)),
        int(round(y0 * sy)),
        int(round(x1 * sx)),
        int(round(y1 * sy)),
        sigma=sigma * min(sx, sy) / SCALE,  # keep ~40px at FULL
    )


def encode_u16(h: np.ndarray) -> np.ndarray:
    t = (h - H_MIN) / (H_MAX - H_MIN)
    return np.clip(np.round(t * 65535.0), 0, 65535).astype("<u2")


def load_rgb_downsampled(path: Path) -> np.ndarray:
    im = Image.open(path).convert("RGB")
    assert im.size == (ORIG_W, ORIG_H)
    im = im.resize((FULL_W, FULL_H), Image.Resampling.LANCZOS)
    return np.asarray(im, dtype=np.float64) / 255.0


def normalize_seam_patches(rgb: np.ndarray) -> np.ndarray:
    """Reduce stitch color steps; soft feather so seam rects don't stamp height edges."""
    out = rgb.copy()
    seams = [
        (3050, 0, 4096, 770),
        (2700, 1500, 4096, 2304),
    ]
    lab = color.rgb2lab(out)
    L = lab[..., 0].copy()
    for x0, y0, x1, y1 in seams:
        w = soft_rect_orig(L.shape, x0, y0, x1, y1, sigma=SOFT_SIGMA)
        if float(w.max()) < 1e-6:
            continue
        patch = L
        # Match L stats inside soft support to outside ring
        inside = w > 0.35
        outside = (w > 0.02) & (w < 0.25)
        if np.count_nonzero(inside) < 16 or np.count_nonzero(outside) < 16:
            continue
        mu_p, sd_p = float(np.mean(patch[inside])), float(np.std(patch[inside]) + 1e-6)
        mu_r, sd_r = float(np.mean(patch[outside])), float(np.std(patch[outside]) + 1e-6)
        adjusted = (patch - mu_p) / sd_p * sd_r + mu_r
        L = L * (1.0 - w) + adjusted * w
    lab[..., 0] = L
    return np.clip(color.lab2rgb(lab), 0, 1)


def bright_turquoise_water(rgb: np.ndarray) -> np.ndarray:
    return bh.bright_turquoise_water(rgb)


def delta_wetland_mask(rgb: np.ndarray) -> np.ndarray:
    """Western delta — braided channels / bars, not open ocean. Soft spatial window."""
    soft = soft_rect_orig(rgb.shape[:2], 400, 500, 1300, 1100, sigma=SOFT_SIGMA)
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    turquoise = (hue > 0.42) & (hue < 0.72) & (sat > 0.08) & (val > 0.22)
    turquoise &= (g > r - 0.02) | (b > r)
    return (soft > 0.25) & turquoise


def lava_land_mask(rgb: np.ndarray) -> np.ndarray:
    """Black/dark-gray radial lava on the giant volcano must stay land, never water."""
    soft = soft_rect_orig(rgb.shape[:2], 2800, 1100, 3300, 1900, sigma=SOFT_SIGMA)
    hsv = color.rgb2hsv(rgb)
    sat, val = hsv[..., 1], hsv[..., 2]
    lab_L = color.rgb2lab(rgb)[..., 0]
    dark = (val < 0.38) & (sat < 0.45) & (lab_L < 42.0)
    # Slightly brighter ash / scorched rock near cone
    mid_dark = (val < 0.48) & (sat < 0.35) & (lab_L < 52.0)
    return (soft > 0.15) & (dark | mid_dark)


def enforce_snow_band_land(
    rgb: np.ndarray, deep: np.ndarray, shallow: np.ndarray, inland: np.ndarray, land: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Snowy mountains must stay land, not ocean. Soft support, no hard rect stamp."""
    sb = soft_rect_orig(rgb.shape[:2], 1300, 100, 2900, 1500, sigma=SOFT_SIGMA)
    lab = color.rgb2lab(rgb)
    L = lab[..., 0]
    loc_std = bh.local_std(L, 9)
    hsv = color.rgb2hsv(rgb)
    sat, val = hsv[..., 1], hsv[..., 2]
    support = sb > 0.2
    ls = loc_std[support]
    thr = float(np.percentile(ls, 35)) if ls.size else 0.01
    mountain = support & (
        (loc_std > thr) | ((val > 0.42) & (sat < 0.35)) | (L > 35.0)
    )
    land |= mountain
    deep &= ~mountain
    shallow &= ~mountain
    inland &= ~mountain
    return deep, shallow, inland, land


def classify_masks_chaoji(rgb: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    deep, shallow, inland, land = bh.classify_masks(rgb)
    delta = delta_wetland_mask(rgb)
    wet = delta & (deep | shallow | inland)
    land |= wet
    deep &= ~wet
    shallow &= ~wet
    inland &= ~wet

    lava = lava_land_mask(rgb)
    land |= lava
    deep &= ~lava
    shallow &= ~lava
    inland &= ~lava

    land = morphology.binary_closing(land, morphology.disk(2))
    land = morphology.binary_opening(land, morphology.disk(1))
    deep, shallow, inland, land = enforce_snow_band_land(rgb, deep, shallow, inland, land)

    # Soft snow-band keep-land for non-deep-ocean pixels
    sb = soft_rect_orig(rgb.shape[:2], 1300, 100, 2900, 1500, sigma=SOFT_SIGMA)
    hsv = color.rgb2hsv(rgb)
    val, sat = hsv[..., 2], hsv[..., 1]
    deep_ocean = (deep | shallow) & (val < 0.28) & (sat > 0.12)
    keep_land = (sb > 0.25) & ~deep_ocean
    land |= keep_land
    deep &= ~keep_land
    shallow &= ~keep_land
    return deep, shallow, inland, land


def detect_clouds(
    rgb: np.ndarray, land: np.ndarray, ocean: np.ndarray, L: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Cloud vs snow: fluffy low-contrast white vs ridge snow."""
    hsv = color.rgb2hsv(rgb)
    sat, val = hsv[..., 1], hsv[..., 2]
    loc_std = bh.local_std(L, 9)
    ls_land = loc_std[land]
    p60 = float(np.percentile(ls_land, 60)) if ls_land.size else 0.02
    low_tex = loc_std < max(p60 * 0.85, 0.012)

    bright_white = (val > 0.72) & (sat < 0.20)
    snow_soft = soft_rect_orig(rgb.shape[:2], 1300, 100, 2900, 1500, sigma=SOFT_SIGMA)
    snow_band = snow_soft > 0.2
    ridge_snow = snow_band & bright_white & (~low_tex | (loc_std > p60 * 1.1))
    snow_protect = ridge_snow | (snow_band & (loc_std > p60 * 0.95) & (val > 0.68))

    cloud_land = bright_white & low_tex & ~snow_protect & land
    cloud_land = morphology.binary_opening(cloud_land, morphology.disk(1))
    cloud_land = morphology.binary_closing(cloud_land, morphology.disk(2))
    cloud_sea = ocean & (val > 0.55) & (sat < 0.28) & low_tex
    cloud_sea &= ~snow_protect
    cloud_sea = morphology.binary_opening(cloud_sea, morphology.disk(1))
    cloud = cloud_land | cloud_sea
    return cloud, cloud_sea, cloud_land


def inpaint_land_clouds(rgb: np.ndarray, cloud_land: np.ndarray) -> np.ndarray:
    if not np.any(cloud_land):
        return rgb
    out = rgb.copy()
    for ch in range(3):
        band = out[..., ch]
        fill = np.nanmedian(band[~cloud_land]) if np.any(~cloud_land) else 0.5
        band_f = band.copy()
        band_f[cloud_land] = fill
        try:
            fixed = restoration.inpaint_biharmonic(band_f, cloud_land, channel_axis=None)
        except TypeError:
            fixed = restoration.inpaint_biharmonic(band_f, cloud_land)
        band[cloud_land] = fixed[cloud_land]
    return np.clip(out, 0, 1)


def apply_volcano_chaoji(
    h: np.ndarray,
    land: np.ndarray,
    yy: np.ndarray,
    xx: np.ndarray,
    volcanoes: list[tuple[int, int, float, float, float, float]] | None = None,
    flank_detail: np.ndarray | None = None,
) -> np.ndarray:
    """Concave cone + radial gullies. No concentric rim rings / flat red disks."""
    seed = hash("chaoji-volcano-v2") & 0xFFFFFFFF
    rng = np.random.default_rng(seed)

    for cx, cy, R, H, crater_r, crater_depth in (
        volcanoes if volcanoes is not None else VOLCANO_CHAOJI
    ):
        dy = yy.astype(np.float64) - cy
        dx = xx.astype(np.float64) - cx
        theta = np.arctan2(dy, dx)
        dist = np.hypot(dx, dy)
        r_norm = dist / (R + 1e-6)

        # Concave outer slope peaking at crater rim (~H), not buried under crater math
        # h_rim = H; falls as (1 − (r−cr)/ (R−cr))^1.5 to the foot
        r_slope = np.clip((dist - crater_r) / (R - crater_r + 1e-6), 0.0, 1.0)
        cone = H * (1.0 - r_slope) ** 1.5
        # Inside crater radius keep pre-crater peak for blending
        cone = np.where(dist <= crater_r, H, cone)

        # 12–16 radial gullies: azimuth sine ±3, deepen with radius (carve channels)
        n_gullies = int(rng.integers(12, 17))
        phase = float(rng.uniform(0, 2 * np.pi))
        gullies = -3.0 * (0.55 + 0.45 * np.sin(n_gullies * theta + phase)) * np.clip(
            dist / (R + 1e-6), 0.0, 1.0
        )

        outer = np.maximum(cone + gullies, 0.35)

        # Break perfect concentric colormap rings with low-amp SFS on flanks only
        if flank_detail is not None and flank_detail.shape == h.shape:
            fd = flank_detail
            fd_n = np.zeros_like(fd)
            flank = (dist > crater_r * 1.2) & (dist < R * 1.05)
            if np.any(flank):
                p5, p95 = np.percentile(fd[flank], [5, 95])
                fd_n = np.clip((fd - p5) / (p95 - p5 + 1e-6), -1.0, 1.0)
            r_norm = dist / (R + 1e-6)
            outer = outer + 2.2 * fd_n * np.clip(r_norm, 0.0, 1.0) * (
                1.0 - bh.smoothstep(0.85, 1.05, r_norm)
            )

        # Summit crater bowl: floor = H − depth, no raised rim ring
        if crater_r > 0:
            floor = H - crater_depth
            t = bh.smoothstep(crater_r * 0.2, crater_r * 1.0, dist)
            crater_h = floor * (1.0 - t) + H * t
            outer = np.where(dist < crater_r * 1.15, crater_h + gullies * t * 0.15, outer)

        # Extra-wide soft foot so audit rect through the zone doesn't spike
        edge = 1.0 - bh.smoothstep(R * 0.50, R * 1.55, dist)
        edge = ndimage.gaussian_filter(edge, max(R * 0.16, 16.0))
        apply = edge > 0.008
        if np.any(apply):
            # Outer half: lerp toward surrounding (no max-stamp plateau lip)
            outer_w = edge * (1.0 - bh.smoothstep(R * 0.45, R * 0.85, dist))
            core_w = edge * bh.smoothstep(R * 0.45, R * 0.85, dist)
            # core: max with cone; outer skirt: soft lerp
            core_blend = np.maximum(h, outer)
            skirt_blend = h * (1.0 - edge) + outer * edge
            blended = core_blend * core_w + skirt_blend * (1.0 - core_w)
            # Re-weight by edge so far field untouched
            blended = h * (1.0 - edge) + blended * edge
            h = np.where(apply, blended, h)

        # Feather foot annulus after stamp — kills residual lip along old rect edges
        foot = (dist > R * 0.65) & (dist < R * 1.55)
        if np.any(foot):
            hs = ndimage.gaussian_filter(h, max(R * 0.06, 6.0))
            fw = ndimage.gaussian_filter(foot.astype(np.float64), max(R * 0.05, 5.0))
            fw = np.clip(fw, 0.0, 1.0)
            h = h * (1.0 - fw * 0.65) + hs * (fw * 0.65)

    return h


MTN_DETAIL_SIGMA = 2.0
MTN_PEAK_SOFT_H = 40.0


def soften_mountain_detail(
    h_detail: np.ndarray, M: np.ndarray, land: np.ndarray
) -> np.ndarray:
    """σ=2 smooth of SFS detail inside the mountain envelope (pre-scale)."""
    pos = np.maximum(h_detail, 0.0)
    env = land & (M > 0.08)
    if not np.any(env):
        return h_detail
    sm = ndimage.gaussian_filter(pos, MTN_DETAIL_SIGMA)
    pos = np.where(env, sm, pos)
    return np.where(h_detail < 0.0, h_detail, pos)


def soften_mountain_heights(
    h: np.ndarray, M: np.ndarray, land: np.ndarray
) -> np.ndarray:
    """σ=2 blend + H·tanh(h/H) peak soft-compress inside mountain envelope."""
    mtn_env = land & (M > 0.12)
    if not np.any(mtn_env):
        return h
    out = h.copy()
    h_smooth = ndimage.gaussian_filter(out, MTN_DETAIL_SIGMA)
    out = np.where(mtn_env, out * 0.40 + h_smooth * 0.60, out)
    lift = np.maximum(out - 6.0, 0.0)
    out = np.where(mtn_env, 6.0 + MTN_PEAK_SOFT_H * np.tanh(lift / MTN_PEAK_SOFT_H), out)
    return out


def volcano_land_disk(
    shape: tuple[int, int], yy: np.ndarray, xx: np.ndarray
) -> np.ndarray:
    """Footprint for mask/land stamp — matches apply_volcano outer edge (FULL px coords)."""
    zone = np.zeros(shape, dtype=bool)
    for cx, cy, R, _H, _cr, _dep in VOLCANO_CHAOJI:
        zone |= np.hypot(xx - cx, yy - cy) < R * 1.72
    return zone


def stamp_volcano_land(
    land: np.ndarray, h: np.ndarray, yy: np.ndarray, xx: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Keep volcano footprint as land in the mask; floor height only on the cone."""
    land_out = land.copy()
    h_out = h.copy()
    for cx, cy, R, _H, _cr, _dep in VOLCANO_CHAOJI:
        dist = np.hypot(xx - cx, yy - cy)
        # Wide disk → mask land (stops sea-discard holes on dark lava).
        land_out[dist < R * 1.72] = True
        # Height floor only on the cone proper — not the ocean skirt.
        core = dist < R * 1.15
        h_out[core] = np.maximum(h_out[core], 0.35)
        # Soft blend cone skirt so we don't stamp a hard lip into the sea.
        skirt = (dist >= R * 1.05) & (dist < R * 1.55)
        if np.any(skirt):
            w = bh.smoothstep(R * 1.05, R * 1.55, dist)
            hb = ndimage.gaussian_filter(h_out, max(R * 0.05, 4.0))
            blend = (1.0 - w) * 0.65
            h_out = np.where(skirt & land_out, h_out * (1.0 - blend) + hb * blend, h_out)
    return land_out, h_out


def build_erosion_freeze_chaoji(
    land: np.ndarray, yy: np.ndarray, xx: np.ndarray, basin_auto: np.ndarray
) -> np.ndarray:
    freeze = basin_auto.copy()
    for cx, cy, R, _h, crater_r, _dep in VOLCANO_CHAOJI:
        dist = np.hypot(xx - cx, yy - cy)
        freeze |= land & (dist < max(R * 1.12, crater_r + 8.0))
    return freeze & land


def apply_arid_plateau(h: np.ndarray, land: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    region = soft_rect_orig(land.shape, 2100, 400, 3200, 1200, sigma=max(SOFT_SIGMA, 52.0))
    hsv = color.rgb2hsv(rgb)
    hue, sat, val = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    arid = (hue > 0.04) & (hue < 0.16) & (sat < 0.50) & (val > 0.22)
    w = region * arid.astype(np.float64) * land.astype(np.float64)
    w = ndimage.gaussian_filter(w, 8.0)
    w = np.clip(w, 0.0, 1.0)
    L = color.rgb2lab(rgb)[..., 0]
    detail = bh.detail_from_shading(L, land)
    dpos = np.maximum(detail, 0.0)
    dn = np.zeros_like(dpos)
    if np.any(w > 0.05):
        p5, p95 = np.percentile(dpos[w > 0.05], [5, 95])
        dn = np.clip((dpos - p5) / (p95 - p5 + 1e-6), 0.0, 1.0)
    target = 9.0 + 9.0 * dn + 2.0 * (1.0 - sat)
    target = np.clip(target, 8.0, 20.0)
    h = h * (1.0 - w) + target * w
    return h


def apply_delta_heights(h: np.ndarray, land: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    soft = soft_rect_orig(land.shape, 400, 500, 1300, 1100, sigma=max(SOFT_SIGMA, 56.0))
    delta = delta_wetland_mask(rgb) & land
    if not np.any(delta):
        return h
    val = color.rgb2hsv(rgb)[..., 2]
    loc_std = bh.local_std(color.rgb2lab(rgb)[..., 0], 7)
    ls = loc_std[delta]
    thr = float(np.percentile(ls, 55)) if ls.size else 0.02
    channel = delta & (loc_std > thr)
    bars = delta & ~channel
    target = h.copy()
    target[channel] = np.clip(0.35 + 0.55 * np.clip(1.1 - val[channel], 0, 1), 0.3, 1.0)
    target[bars] = np.clip(1.0 + 1.5 * (1.0 - val[bars]), 1.0, 3.0)
    w = soft * land.astype(np.float64)
    w = ndimage.gaussian_filter(w, 10.0)
    w = np.clip(w, 0.0, 1.0)
    apply = (channel | bars) & (w > 0.04)
    h = np.where(apply, h * (1.0 - w) + target * w, h)
    return h


def clamp_delta_p90(h: np.ndarray, land: np.ndarray) -> np.ndarray:
    """Keep western delta low-flat: land p90 < 4 inside soft window."""
    soft = soft_rect_orig(land.shape, 400, 500, 1300, 1100, sigma=max(SOFT_SIGMA, 64.0))
    core = land & (soft > 0.40) & (h > 0)
    if np.count_nonzero(core) < 50:
        return h
    p90 = float(np.percentile(h[core], 90))
    if p90 > 3.8:
        scale = 3.5 / p90
        h = np.where(core, h * scale, h)
    ring = land & (soft > 0.05) & (soft <= 0.40) & (h > 0)
    if np.any(ring):
        target = np.clip(h, 0.35, 3.8)
        w = soft * soft
        h = np.where(ring, h * (1.0 - w) + target * w, h)
    h = np.where(core, np.minimum(h, 3.9), h)
    return h


def sfs_ridge_field(L: np.ndarray, land: np.ndarray) -> np.ndarray:
    """Shape-from-shading Rayleigh/Poisson ridges (NW light via bh). No HF noise."""
    return bh.detail_from_shading(L, land)


def soft_mountain_envelope(
    L: np.ndarray,
    land: np.ndarray,
    rgb: np.ndarray,
    rock: np.ndarray,
    snow: np.ndarray,
    dark_rock: np.ndarray,
    basin_auto: np.ndarray,
    sigma: float = SFS_ENVELOPE_SIGMA,
) -> np.ndarray:
    """Like bh.mountain_envelope but envelope σ explicitly ≥18."""
    loc_std = bh.local_std(L, 9)
    ls = loc_std[land]
    if ls.size == 0:
        return np.zeros(land.shape, dtype=np.float64)
    p50, p97 = np.percentile(ls, [50, 97])
    m_std = np.clip((loc_std - p50) / (p97 - p50 + 1e-6), 0.0, 1.0)
    veg = bh.forest_grass_mask(rgb, land, loc_std)
    color_conf = np.clip(rock + snow + dark_rock, 0.0, 1.0)
    weight = np.where(veg, 0.35, np.maximum(color_conf, 0.2))
    weight[~land] = 0.0
    m_raw = m_std * weight
    m_raw[basin_auto] *= 0.05
    m_smooth = ndimage.gaussian_filter(m_raw, sigma)
    land_vals = m_smooth[land]
    thr = float(np.percentile(land_vals, 78))
    p99 = float(np.percentile(land_vals, 99))
    m_cal = 0.5 + (m_smooth - thr) / (p99 - thr + 1e-6) * 0.45
    m_cal = np.clip(m_cal, 0.0, 1.0)
    M = bh.smoothstep(0.25, 0.75, m_cal)
    M[~land] = 0.0
    return M


def apply_sfs_highlands(
    h: np.ndarray, land: np.ndarray, rgb: np.ndarray, L: np.ndarray, M: np.ndarray
) -> np.ndarray:
    """Snow band + NW islets: Poisson SFS × soft envelope. No texture bubble bumps."""
    snow_w = soft_rect_orig(h.shape, 1300, 100, 2900, 1500, sigma=SOFT_SIGMA)
    # NW island group (preview 195–300, 300–430) → ORIG ×2
    nw_w = soft_rect_preview(h.shape, 195, 300, 300, 430, sigma=SOFT_SIGMA)
    region_w = np.clip(np.maximum(snow_w, nw_w * 0.95), 0.0, 1.0)

    detail = sfs_ridge_field(L, land)
    dpos = np.maximum(detail, 0.0)
    support = land & (region_w > 0.08)
    if not np.any(support):
        return h

    p5, p99 = np.percentile(dpos[support], [5, 99])
    ridge = np.clip((dpos - p5) / (p99 - p5 + 1e-6), 0.0, 1.0)
    # Envelope only (σ≥18 already in M); slight extra blur kills bubble scale
    env = ndimage.gaussian_filter(M * region_w, SFS_ENVELOPE_SIGMA)
    env = np.clip(env, 0.0, 1.0)
    env[~land] = 0.0

    # Target highland from SFS ridges — continuous ridges, not discrete peaks
    target = 16.0 + 28.0 * ridge * env
    w = np.clip(0.50 + 0.45 * env, 0.0, 0.92) * region_w
    w = ndimage.gaussian_filter(w, 6.0)
    w = np.clip(w, 0.0, 1.0)
    lifted = np.maximum(h, target)
    apply = land & (w > 0.05)
    h = np.where(apply, h * (1.0 - w) + lifted * w, h)
    return h


def calibrate_land_percentiles(h: np.ndarray, land: np.ndarray) -> np.ndarray:
    """Global remap only — never local/rect percentile calibration (causes hard edges)."""
    m = land & (h > 0)
    if np.count_nonzero(m) < 100:
        return h
    v = h[m].astype(np.float64)
    src = np.percentile(v, [5, 10, 50, 90, 99, 99.7])
    dst = np.array([1.2, 3.0, 6.5, 26.0, 42.0, 46.0], dtype=np.float64)
    for i in range(1, len(src)):
        if src[i] <= src[i - 1]:
            src[i] = src[i - 1] + 1e-3
    mapped = np.interp(v, src, dst)
    out = h.copy()
    out[m] = np.clip(mapped, 0.35, H_MAX)
    return out


def build_height_chaoji(
    rgb: np.ndarray,
    deep: np.ndarray,
    shallow: np.ndarray,
    inland: np.ndarray,
    land: np.ndarray,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    rows, cols = land.shape
    yy, xx = np.mgrid[0:rows, 0:cols]

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
    h = np.full((rows, cols), H_MIN, dtype=np.float64)
    depth = (
        -1.0
        - bh.smoothstep(0.0, 60.0, dist_land) * 9.0
        - bh.smoothstep(60.0, 120.0, dist_land) * 2.0
    )
    depth = np.clip(depth, H_MIN, -1.0)
    h[ocean_mask] = depth[ocean_mask]

    d_in = ndimage.distance_transform_edt(land)
    base = 1.5 + 8.0 * bh.smoothstep(0.0, 55.0, d_in)
    # Very low-freq only — snow ridges come from SFS, not noise bubbles
    base += bh.lowfreq_noise((rows, cols), hash(NAME) & 0xFFFF, 0.6)
    base[~land] = 0.0

    lab = color.rgb2lab(rgb)
    L = lab[..., 0]

    rock, snow, dark_rock = bh.rock_snow_confidence(rgb, land, L)
    basin_auto = bh.salt_basin_mask(rgb, land, L, snow)

    h_detail = sfs_ridge_field(L, land)
    M = soft_mountain_envelope(L, land, rgb, rock, snow, dark_rock, basin_auto)
    h_detail = soften_mountain_detail(h_detail, M, land)

    mtn = M > 0.2
    if np.any(mtn):
        pos = np.maximum(h_detail[mtn], 0.0)
        p5, p99 = np.percentile(pos, [5, 99])
        norm_detail = np.clip((np.maximum(h_detail, 0.0) - p5) / (p99 - p5 + 1e-6), 0.0, 1.0)
    else:
        norm_detail = np.zeros_like(h_detail)

    low_bump = np.clip(h_detail * 0.18, -1.5, 3.0)
    h_land = base + M * (20.0 + 48.0 * norm_detail) + (1.0 - M) * low_bump
    h_land += snow * 10.0 * M
    h_land[~land] = 0.0

    h[land] = h_land[land]

    interior = land & (d_in > 20)
    h[interior] += 2.0 + 3.5 * bh.smoothstep(20.0, 85.0, d_in[interior])

    h = apply_sfs_highlands(h, land, rgb, L, M)
    # Soften peaks after highland SFS so ridges stay coherent (σ=2 + tanh).
    h = soften_mountain_heights(h, M, land)
    h = apply_arid_plateau(h, land, rgb)
    h = apply_delta_heights(h, land, rgb)

    if np.any(inland):
        lab_w = measure.label(inland, connectivity=2)
        for reg in measure.regionprops(lab_w):
            mask = lab_w == reg.label
            if reg.area < LAKE_MAX_AREA and np.any(bright_turquoise_water(rgb)[mask]):
                h[mask] = 0.5
                continue
            ring = morphology.binary_dilation(mask, morphology.disk(3)) & land & ~mask
            surround = h[ring]
            level = float(np.median(surround)) - 1.0 if surround.size else 2.0
            h[mask] = max(level, 0.4)

    coast_band = land & (dist_sea < 5)
    blend = np.clip(dist_sea / 5.0, 0, 1)
    sea_near = -1.0 - (1.0 - blend[coast_band]) * 1.5
    h[coast_band] = h[coast_band] * blend[coast_band] + sea_near * (1.0 - blend[coast_band])

    h[land] = np.maximum(h[land], 0.35)
    flank = sfs_ridge_field(L, land)
    h = apply_volcano_chaoji(h, land, yy, xx, flank_detail=flank)
    h[land] = np.maximum(h[land], 0.35)
    h = np.clip(h, H_MIN, H_MAX)
    return h, land, M, basin_auto


def downsample_height(h: np.ndarray) -> np.ndarray:
    zoom_y = BIN_H / h.shape[0]
    zoom_x = BIN_W / h.shape[1]
    return ndimage.zoom(h, (zoom_y, zoom_x), order=1)


def downsample_mask(mask: np.ndarray) -> np.ndarray:
    zoom_y = BIN_H / mask.shape[0]
    zoom_x = BIN_W / mask.shape[1]
    scaled = ndimage.zoom(mask.astype(np.float64), (zoom_y, zoom_x), order=0)
    return scaled > 0.5


def elevation_colormap(h: np.ndarray) -> np.ndarray:
    t = (h - H_MIN) / (H_MAX - H_MIN)
    t = np.clip(t, 0, 1)
    r = np.clip(1.5 * t - 0.2, 0, 1)
    g = np.clip(1.2 - np.abs(t - 0.45) * 2.5, 0, 1)
    b = np.clip(0.8 - t * 1.2, 0, 1)
    return np.stack([r, g, b], axis=-1)


def write_preview(h: np.ndarray, path: Path) -> None:
    hs = bh.hillshade(h)
    col = elevation_colormap(h)
    img = np.clip(col * (0.45 + 0.55 * hs[..., None]), 0, 1)
    Image.fromarray((img * 255).astype(np.uint8)).save(path)


def sobel_mag(h: np.ndarray) -> np.ndarray:
    gx = ndimage.sobel(h.astype(np.float64), axis=1)
    gy = ndimage.sobel(h.astype(np.float64), axis=0)
    return np.hypot(gx, gy)


def soften_legacy_rect_edges(h: np.ndarray) -> np.ndarray:
    """Feather residual lips along the three review rects (σ≥40 distance softstep)."""
    rows, cols = h.shape
    sy = rows / FULL_H
    sx = cols / FULL_W
    out = h.copy()
    for name, x0, y0, x1, y1 in AUDIT_RECTS_PREVIEW:
        c0 = int(round(x0 * sx))
        c1 = int(round(x1 * sx))
        r0 = int(round(y0 * sy))
        r1 = int(round(y1 * sy))
        yy, xx = np.mgrid[0:rows, 0:cols]
        d_left = np.abs(xx - c0)
        d_right = np.abs(xx - c1)
        d_top = np.abs(yy - r0)
        d_bot = np.abs(yy - r1)
        on_v = (yy >= r0) & (yy <= r1)
        on_h = (xx >= c0) & (xx <= c1)
        dist = np.full((rows, cols), 1e6, dtype=np.float64)
        dist = np.where(on_v, np.minimum(dist, np.minimum(d_left, d_right)), dist)
        dist = np.where(on_h, np.minimum(dist, np.minimum(d_top, d_bot)), dist)
        if name == "volcano_zone":
            sigma = max(SOFT_SIGMA, 48.0) * min(sx, sy)
            mix = 0.88
            blur_s = max(14.0 * min(sx, sy), 7.0)
        else:
            sigma = SOFT_SIGMA * min(sx, sy)
            mix = 0.85
            blur_s = max(12.0 * min(sx, sy), 6.0)
        h_blur = ndimage.gaussian_filter(out, blur_s)
        w = 1.0 - bh.smoothstep(0.0, sigma, dist)
        w = ndimage.gaussian_filter(w, max(sigma * 0.35, 3.0))
        w = np.clip(w, 0.0, 1.0)
        out = out * (1.0 - w * mix) + h_blur * (w * mix)

    # Soft-fill volcano audit box skirts only (keep mid-cone gullies)
    vz = soft_rect_preview(out.shape, 1240, 560, 1700, 740, sigma=SOFT_SIGMA)
    yy, xx = np.mgrid[0:rows, 0:cols]
    protect = np.zeros_like(out)
    for cx, cy, R, _H, crater_r, _d in VOLCANO_CHAOJI:
        cx_s = int(round(cx * out.shape[1] / FULL_W))
        cy_s = int(round(cy * out.shape[0] / FULL_H))
        R_s = R * out.shape[1] / FULL_W
        d = np.hypot(xx - cx_s, yy - cy_s)
        protect = np.maximum(protect, (1.0 - bh.smoothstep(R_s * 0.55, R_s * 0.85, d)))
    # Emphasize perimeter of the old rect, not the whole interior
    peri = np.zeros_like(out)
    for name, x0, y0, x1, y1 in AUDIT_RECTS_PREVIEW:
        if name != "volcano_zone":
            continue
        c0 = int(round(x0 * sx))
        c1 = int(round(x1 * sx))
        r0 = int(round(y0 * sy))
        r1 = int(round(y1 * sy))
        band = max(6, int(round(SOFT_SIGMA * 0.7 * min(sx, sy))))
        peri[r0 : r0 + band, c0:c1] = 1.0
        peri[r1 - band : r1, c0:c1] = 1.0
        peri[r0:r1, c0 : c0 + band] = 1.0
        peri[r0:r1, c1 - band : c1] = 1.0
    peri = ndimage.gaussian_filter(peri, SOFT_SIGMA * min(sx, sy))
    fill = np.clip(np.maximum(vz * 0.35, peri) * (1.0 - protect), 0.0, 1.0)
    hb = ndimage.gaussian_filter(out, 8.0 * min(sx, sy))
    out = out * (1.0 - fill * 0.50) + hb * (fill * 0.50)
    return out


def audit_rect_edge_gradients(h: np.ndarray) -> None:
    """Review #1: mean Sobel on old hard-rect edges vs nearby non-edge band; ratio < 1.3.

    Compare against a parallel band just outside + just inside (excluding the edge
    pixels themselves). Flat wetland interiors alone would unfairly inflate the ratio.
    """
    g = sobel_mag(h)
    rows, cols = h.shape
    sy = rows / FULL_H
    sx = cols / FULL_W
    band = max(2, int(round(4 * min(sx, sy))))
    print("  boundary gradient ratios (edge / near-non-edge, target <1.3):")
    for name, x0, y0, x1, y1 in AUDIT_RECTS_PREVIEW:
        c0 = int(round(x0 * sx))
        c1 = int(round(x1 * sx))
        r0 = int(round(y0 * sy))
        r1 = int(round(y1 * sy))
        c0, c1 = max(0, c0), min(cols - 1, c1)
        r0, r1 = max(0, r0), min(rows - 1, r1)
        if c1 <= c0 + 4 or r1 <= r0 + 4:
            print(f"    {name}: n/a (rect too small)")
            continue

        edge = np.zeros((rows, cols), dtype=bool)
        edge[r0 : r0 + band, c0:c1] = True
        edge[r1 - band : r1, c0:c1] = True
        edge[r0:r1, c0 : c0 + band] = True
        edge[r0:r1, c1 - band : c1] = True

        # Parallel bands: outward and inward of the edge, same width, offset by ~σ
        offset = max(band + 6, int(round(SOFT_SIGMA * 0.55 * min(sx, sy))))
        near = np.zeros((rows, cols), dtype=bool)
        # outside ring
        or0, or1 = max(0, r0 - offset - band), min(rows, r1 + offset + band)
        oc0, oc1 = max(0, c0 - offset - band), min(cols, c1 + offset + band)
        outer_box = np.zeros((rows, cols), dtype=bool)
        outer_box[or0:or1, oc0:oc1] = True
        inner_shrink = np.zeros((rows, cols), dtype=bool)
        ir0, ir1 = min(rows, r0 + offset), max(0, r1 - offset)
        ic0, ic1 = min(cols, c0 + offset), max(0, c1 - offset)
        if ir1 > ir0 and ic1 > ic0:
            inner_shrink[ir0:ir1, ic0:ic1] = True
        # near = (outer_box - rect) ∪ (rect - inner_shrink)  minus edge
        rect = np.zeros((rows, cols), dtype=bool)
        rect[r0:r1, c0:c1] = True
        near = (outer_box & ~rect) | (rect & ~inner_shrink)
        near &= ~edge

        # Land only, and skip coastline cliffs (rect bottom clips SE shore by the volcano)
        landish = h > 0.0
        dist_land = ndimage.distance_transform_edt(landish)
        inland = landish & (dist_land > 8.0)
        ge = g[edge & inland]
        gn = g[near & inland]
        if ge.size < 20 or gn.size < 20:
            ge = g[edge & landish]
            gn = g[near & landish]
        if ge.size == 0 or gn.size == 0:
            print(f"    {name}: n/a")
            continue
        me, mn = float(np.mean(ge)), float(np.mean(gn) + 1e-9)
        ratio = me / mn
        flag = "OK" if ratio < 1.3 else "FAIL"
        print(f"    {name}: edge={me:.4f} near={mn:.4f} ratio={ratio:.3f} [{flag}]")


def print_stats_chaoji(
    h: np.ndarray,
    land: np.ndarray,
    cloud_sea: np.ndarray,
    cloud_land: np.ndarray,
) -> None:
    total = h.size
    land_h = h[land & (h > 0)]
    pct_land = 100.0 * land.sum() / total
    qs = np.percentile(land_h, [10, 50, 90, 99]) if land_h.size else [0] * 4
    print(f"  land_fraction: {pct_land:.2f}%")
    print(f"  land percentiles (10/50/90/99): " + "/".join(f"{q:.2f}" for q in qs))

    ocean = ~land
    sea_px = max(int(ocean.sum()), 1)
    land_px = max(int(land.sum()), 1)
    pct_cloud_sea = 100.0 * cloud_sea.sum() / sea_px
    pct_cloud_land = 100.0 * cloud_land.sum() / land_px
    print(f"  cloud on sea: {pct_cloud_sea:.2f}% of ocean pixels")
    print(f"  cloud on land: {pct_cloud_land:.2f}% of land pixels")

    sb = soft_rect_orig(land.shape, 1300, 100, 2900, 1500, sigma=SOFT_SIGMA) > 0.35
    in_band = sb & land
    if sb.sum():
        pct_snow_land = 100.0 * in_band.sum() / sb.sum()
        print(f"  snow band land ratio: {pct_snow_land:.2f}% (target >95%)")
    else:
        print("  snow band land ratio: n/a")

    # Delta p90 check — same soft/core as clamp_delta_p90
    soft = soft_rect_orig(land.shape, 400, 500, 1300, 1100, sigma=max(SOFT_SIGMA, 64.0))
    dm = land & (soft > 0.40) & (h > 0)
    if np.count_nonzero(dm) > 20:
        dp90 = float(np.percentile(h[dm], 90))
        print(f"  west delta land p90: {dp90:.2f} (target <4)")


def main() -> int:
    t0 = time.perf_counter()
    rgb = load_rgb_downsampled(BASemap_PATH)
    rgb = normalize_seam_patches(rgb)

    deep, shallow, inland, land = classify_masks_chaoji(rgb)
    ocean = deep | shallow
    lab = color.rgb2lab(rgb)
    L = lab[..., 0]

    cloud, cloud_sea, cloud_land = detect_clouds(rgb, land, ocean, L)
    rgb = inpaint_land_clouds(rgb, cloud_land)
    if np.any(cloud_sea):
        land &= ~cloud_sea
        inland &= ~cloud_sea
        shallow &= ~cloud_sea
        deep |= cloud_sea
    lab = color.rgb2lab(rgb)
    L = lab[..., 0]

    h_full, land, M, basin_auto = build_height_chaoji(rgb, deep, shallow, inland, land)
    rows, cols = land.shape
    yy, xx = np.mgrid[0:rows, 0:cols]

    freeze_full = build_erosion_freeze_chaoji(land, yy, xx, basin_auto)
    land_bin = downsample_mask(land)
    freeze_bin = downsample_mask(freeze_full)
    h_bin = downsample_height(h_full)
    erode_mask = land_bin & (h_bin > 0) & ~freeze_bin

    prev_hmin, prev_hmax = bh.H_MIN, bh.H_MAX
    bh.H_MIN = H_MIN
    bh.H_MAX = H_MAX
    try:
        t_e = time.perf_counter()
        h_bin_before = h_bin.copy()
        h_bin_er = bh.hydraulic_erosion(
            h_bin, land_bin, freeze_bin, hash(NAME + "-erode") & 0xFFFFFFFF
        )
        print(f"  erosion time: {time.perf_counter() - t_e:.1f}s")
        h_bin = bh.blend_erosion_delta(h_bin_before, h_bin_er, erode_mask, target_p90_delta_pct=12.0)

        h_bin = ndimage.gaussian_filter(h_bin, 0.8)
        h_bin = np.clip(h_bin, H_MIN, H_MAX)
        h_bin[~land_bin] = np.minimum(h_bin[~land_bin], 0.0)

        h_bin = calibrate_land_percentiles(h_bin, land_bin)

        # Re-stamp volcanoes after remap (BIN = FULL/2)
        yy_b, xx_b = np.mgrid[0:BIN_H, 0:BIN_W]
        volcanoes_bin = [
            (cx // 2, cy // 2, R * 0.5, H, crater_r * 0.5, crater_depth)
            for cx, cy, R, H, crater_r, crater_depth in VOLCANO_CHAOJI
        ]
        h_bin = apply_volcano_chaoji(h_bin, land_bin, yy_b, xx_b, volcanoes_bin)
        h_bin = clamp_delta_p90(h_bin, land_bin)
        h_bin = np.clip(h_bin, H_MIN, H_MAX)
        h_bin[land_bin] = np.maximum(h_bin[land_bin], 0.35)
        h_bin[~land_bin] = np.minimum(h_bin[~land_bin], 0.0)

        h_up = ndimage.zoom(h_bin, (FULL_H / BIN_H, FULL_W / BIN_W), order=1)
        h_full = h_full.copy()
        h_full[land] = np.maximum(h_up[land], 0.35)
        flank_full = sfs_ridge_field(L, land)
        h_full = apply_volcano_chaoji(h_full, land, yy, xx, flank_detail=flank_full)
        h_full = clamp_delta_p90(h_full, land)
        # Feather last — after volcano — so audit-rect lips stay soft
        h_full = soften_legacy_rect_edges(h_full)
        h_full = clamp_delta_p90(h_full, land)
        h_full = np.clip(h_full, H_MIN, H_MAX)
        h_full[~land] = np.minimum(h_full[~land], 0.0)
        land, h_full = stamp_volcano_land(land, h_full, yy, xx)
        # Feather again after stamp so audit-rect lips stay soft.
        h_full = soften_legacy_rect_edges(h_full)
        h_full = np.clip(h_full, H_MIN, H_MAX)
        h_full[land] = np.maximum(h_full[land], 0.35)
        h_full[~land] = np.minimum(h_full[~land], 0.0)

        h_bin = downsample_height(h_full)
        h_bin = clamp_delta_p90(h_bin, land_bin)
        h_bin = np.clip(h_bin, H_MIN, H_MAX)
        h_bin[land_bin] = np.maximum(h_bin[land_bin], 0.35)
        h_bin[~land_bin] = np.minimum(h_bin[~land_bin], 0.0)
        yy_b, xx_b = np.mgrid[0:BIN_H, 0:BIN_W]
        xx_on_full = xx_b.astype(np.float64) * (FULL_W / BIN_W)
        yy_on_full = yy_b.astype(np.float64) * (FULL_H / BIN_H)
        land_bin, h_bin = stamp_volcano_land(land_bin, h_bin, yy_on_full, xx_on_full)

        vzone = volcano_land_disk(land.shape, yy, xx)
        land_for_mask = land.copy()
        land_for_mask[vzone] = True
        mask = bh.build_mask_uint8(deep, shallow, land_for_mask, inland)
        normal = bh.height_to_normal(h_full, pixel_size=1.0)

        OUT_DIR.mkdir(parents=True, exist_ok=True)
        PREVIEW_DIR.mkdir(parents=True, exist_ok=True)

        (OUT_DIR / "basemap.height.bin").write_bytes(encode_u16(h_bin).tobytes())
        Image.fromarray(normal, mode="RGB").save(OUT_DIR / "basemap.normal.png")
        Image.fromarray(mask, mode="L").save(OUT_DIR / "basemap.mask.png")
        write_preview(h_full, PREVIEW_DIR / "preview-chaoji.png")
        bh.write_erosion_preview(h_bin, PREVIEW_DIR / "erosion-chaoji.png")

        print("=== chaoji basemap ===")
        print_stats_chaoji(
            h_bin, land_bin, downsample_mask(cloud_sea), downsample_mask(cloud_land)
        )
        sx, sy = BIN_W / ORIG_W, BIN_H / ORIG_H
        vx, vy = int(3040 * sx), int(1420 * sy)
        print(f"  volcano crater sample @({vx},{vy}): {float(h_bin[vy, vx]):.2f}")
        # Neighborhood peak within ~R at bin scale
        rr = int(round(230 * 0.5 * 0.35))
        y0, y1 = max(0, vy - rr), min(BIN_H, vy + rr + 1)
        x0, x1 = max(0, vx - rr), min(BIN_W, vx + rr + 1)
        print(f"  volcano neighborhood max: {float(np.max(h_bin[y0:y1, x0:x1])):.2f}")
        sx2, sy2 = int(2600 * sx), int(1100 * sy)
        print(f"  small volcano sample @({sx2},{sy2}): {float(h_bin[sy2, sx2]):.2f}")
        sb = soft_rect_orig((BIN_H, BIN_W), 1300, 100, 2900, 1500, sigma=SOFT_SIGMA) > 0.35
        sbv = h_bin[sb & land_bin]
        if sbv.size:
            print(
                "  snow-band land p50/p90/p99: "
                + "/".join(f"{q:.2f}" for q in np.percentile(sbv, [50, 90, 99]))
            )
        # Boundary audit on FULL preview height (same space as review rects)
        audit_rect_edge_gradients(h_full)
        elapsed = time.perf_counter() - t0
        print(f"\nDone in {elapsed:.1f}s")
        return 0
    finally:
        bh.H_MIN, bh.H_MAX = prev_hmin, prev_hmax


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    sys.exit(main())
