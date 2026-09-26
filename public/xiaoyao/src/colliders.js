/** 简化 AABB 碰撞体 + 可行走平台（与 sakura-crossing player 同参） */

export const STEP = 0.38;
export const EYE = 1.6;
export const RADIUS = 0.34;

/** 二层回廊挑出下檐外（精模灰瓦 maxZ≈16），栏杆紧贴檐外 */
export const GALLERY_RAIL = 16.55;
export const GALLERY_STAND = GALLERY_RAIL - 0.4; // 离栏杆 0.4m → 约 16.15，俯望下檐底窄条
/** 传送默认俯角 −3° */
export const GALLERY_PITCH = (-3 * Math.PI) / 180;

/** @typedef {{ x0:number,x1:number,z0:number,z1:number, top:number, bottom?:number }} Collider */
/** @typedef {{ x0:number,x1:number,z0:number,z1:number, y:number }} Platform */

export function buildWalkColliders() {
  /** @type {Collider[]} */
  const walls = [];
  /** @type {Platform[]} */
  const platforms = [];

  const plat = (x0, x1, z0, z1, y) => platforms.push({ x0, x1, z0, z1, y });
  const wall = (x0, x1, z0, z1, top, bottom = 0) => walls.push({ x0, x1, z0, z1, top, bottom });

  // 滨水广场（示意）
  plat(-28, 28, -32, 32, 0);

  // 台基平台
  plat(-14, 14, -14, 14, 1.5);

  // 一层地面
  plat(-10.5, 10.5, -10.5, 10.5, 3.05);

  // 正门阶梯（南）
  for (let i = 0; i < 7; i++) {
    const z0 = 10.5 + i * 0.4;
    plat(-3.2, 3.2, z0, z0 + 0.45, 1.5 + i * (1.55 / 6));
  }

  // 西侧楼梯上二层（示意）
  const stairX0 = -10.1;
  const stairX1 = -7.6;
  for (let i = 0; i < 16; i++) {
    const z0 = -3.2 + i * 0.36;
    plat(stairX0, stairX1, z0, z0 + 0.4, 3.05 + i * (4.3 / 15));
  }

  // 二层回廊：外圈挑出下檐（灰瓦≈16m）之外，站栏杆边能看见下檐只占画面底窄条
  const gy = 6.9;
  const outer = GALLERY_RAIL;
  const inner = 8.2;
  plat(-outer, outer, -outer, -inner, gy);
  plat(-outer, outer, inner, outer, gy);
  plat(-outer, -inner, -inner, inner, gy);
  plat(inner, outer, -inner, inner, gy);

  // 回廊栏杆（高 1.05 m）
  const railY = gy + 1.05;
  const rw = 0.35;
  wall(-outer, outer, -outer - rw, -outer, railY, gy);
  wall(-outer, outer, outer, outer + rw, railY, gy);
  wall(-outer - rw, -outer, -outer, outer, railY, gy);
  wall(outer, outer + rw, -outer, outer, railY, gy);

  // 楼壳薄墙：顶到回廊地面，二层可走到挑出回廊；南面留正门洞，西面留楼梯洞
  const shellTop = gy;
  // 北
  wall(-11.5, 11.5, -11.5, -11.15, shellTop, 0);
  // 南：门洞约 |x|<3.4
  wall(-11.5, -3.4, 11.15, 11.5, shellTop, 0);
  wall(3.4, 11.5, 11.15, 11.5, shellTop, 0);
  // 东
  wall(11.15, 11.5, -11.5, 11.5, shellTop, 0);
  // 西：楼梯洞约 z -3.5..3.5
  wall(-11.5, -11.15, -11.5, -3.6, shellTop, 0);
  wall(-11.5, -11.15, 3.6, 11.5, shellTop, 0);

  // 一层内隔墙（薄），留南门通道与西侧楼梯口
  wall(-10.5, -10.2, -10.5, -3.8, 6.2, 0);
  wall(-10.5, -10.2, 3.8, 10.5, 6.2, 0);
  wall(10.2, 10.5, -10.5, 10.5, 6.2, 0);
  wall(-10.5, -3.5, -10.5, -10.2, 6.2, 0);
  wall(3.5, 10.5, -10.5, -10.2, 6.2, 0);
  wall(-10.5, -3.5, 10.2, 10.5, 6.2, 0);
  wall(3.5, 10.5, 10.2, 10.5, 6.2, 0);

  return { walls, platforms };
}

export function heightAt(x, z, platforms, fromY) {
  let best = -Infinity;
  for (const p of platforms) {
    if (x < p.x0 || x > p.x1 || z < p.z0 || z > p.z1) continue;
    if (fromY !== undefined && p.y - fromY > STEP + 0.05) continue;
    if (fromY !== undefined && fromY - p.y > 1.2) continue;
    if (p.y > best) best = p.y;
  }
  return best > -Infinity ? best : 0;
}

export function resolveXZ(pos, colliders, feetY, radius = RADIUS) {
  for (const c of colliders) {
    if (c.top !== undefined && c.top <= feetY + STEP) continue;
    if (c.bottom !== undefined && c.bottom > feetY + 1.9) continue;
    const x0 = c.x0 - radius;
    const x1 = c.x1 + radius;
    const z0 = c.z0 - radius;
    const z1 = c.z1 + radius;
    if (pos.x <= x0 || pos.x >= x1 || pos.z <= z0 || pos.z >= z1) continue;
    const dxL = pos.x - x0;
    const dxR = x1 - pos.x;
    const dzL = pos.z - z0;
    const dzR = z1 - pos.z;
    const m = Math.min(dxL, dxR, dzL, dzR);
    if (m === dxL) pos.x = x0;
    else if (m === dxR) pos.x = x1;
    else if (m === dzL) pos.z = z0;
    else pos.z = z1;
  }
}
