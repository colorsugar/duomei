import { ORIGIN, FOOT } from '/yunyou/data/geo.js';

/** Scene origin = 逍遥楼 FOOT 中心（米，东 X / 南 Z） */
export const ORIGIN_XY = FOOT.xiaoyaolou.c;

export function worldToLocal(x, z) {
  return [x - ORIGIN_XY[0], z - ORIGIN_XY[1]];
}

export function latLonToLocal(lat, lon) {
  const x = (lon - ORIGIN.lon) * ORIGIN.mPerLon;
  const z = -(lat - ORIGIN.lat) * ORIGIN.mPerLat;
  return worldToLocal(x, z);
}

export function footLocal(id) {
  const c = FOOT[id]?.c;
  if (!c) return null;
  return worldToLocal(c[0], c[1]);
}

/** 方位角：正北 0° 顺时针 → 本地 x/z（北 −z，东 +x） */
export function bearingToXZ(distM, bearingDeg) {
  const rad = (bearingDeg * Math.PI) / 180;
  const x = Math.sin(rad) * distM;
  const z = -Math.cos(rad) * distM;
  return [x, z];
}
