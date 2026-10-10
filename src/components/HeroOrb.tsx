import { useEffect, useRef } from "react";

// 色彩星球 · a sphere of a few hundred coloured points in the ten section hues, slowly turning,
// three thin orbit rings with a satellite each, the odd shooting star. The pointer steers the spin
// and lights up the points it passes. Canvas 2D, no library; sleeps when the tab is hidden.
const HUES = [
  [224, 137, 74], // 早报 橘
  [230, 121, 138], // 快活 粉
  [200, 85, 74], // 故语 朱
  [217, 168, 74], // 大陆 金
  [95, 154, 108], // Skill 绿
  [92, 165, 139], // 云游 黛
  [79, 163, 184], // 小记 青
  [90, 111, 200], // 寻迹 靛
  [154, 107, 200], // 微言 紫
  [208, 106, 168], // 颜色 玫
];

type Point = { x: number; y: number; z: number; hue: number[]; size: number; twinkle: number; burst: number };
type Ring = { tilt: number; roll: number; speed: number; phase: number; hue: number[] };
type Star = { x: number; y: number; vx: number; vy: number; life: number; hue: number[] };

function fibonacciSphere(count: number): Point[] {
  const points: Point[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let index = 0; index < count; index += 1) {
    const y = 1 - (index / (count - 1)) * 2;
    const radius = Math.sqrt(1 - y * y);
    const theta = golden * index;
    const band = Math.min(HUES.length - 1, Math.floor(((1 - y) / 2) * HUES.length));
    points.push({
      x: Math.cos(theta) * radius,
      y,
      z: Math.sin(theta) * radius,
      hue: HUES[band],
      size: 0.95 + Math.random() * 1.1,
      twinkle: Math.random() * Math.PI * 2,
      // How far this point flies when the sphere bursts on scroll (IllustrationLayer writes --duomei-hero-progress).
      burst: 0.5 + Math.random() * 1.1,
    });
  }
  return points;
}

export function HeroOrb() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const compact = window.matchMedia("(max-width: 48rem)").matches;
    const points = fibonacciSphere(compact ? 300 : 460);
    const rings: Ring[] = [
      { tilt: 1.15, roll: 0.35, speed: 0.42, phase: 0, hue: HUES[0] },
      { tilt: 0.55, roll: -0.9, speed: -0.31, phase: 2.1, hue: HUES[6] },
      { tilt: 1.42, roll: 1.6, speed: 0.24, phase: 4.2, hue: HUES[8] },
    ];
    const stars: Star[] = [];
    // One pre-rendered dot per hue: drawImage with globalAlpha is far cheaper than arc + fill per point.
    const SPRITE = 32;
    const sprites = HUES.map(([r, g, b]) => {
      const dot = document.createElement("canvas");
      dot.width = SPRITE;
      dot.height = SPRITE;
      const dctx = dot.getContext("2d");
      if (dctx) {
        const grad = dctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 1)`);
        grad.addColorStop(0.55, `rgba(${r}, ${g}, ${b}, 0.95)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        dctx.fillStyle = grad;
        dctx.beginPath();
        dctx.arc(SPRITE / 2, SPRITE / 2, SPRITE / 2, 0, Math.PI * 2);
        dctx.fill();
      }
      return dot;
    });
    let lastDraw = 0;
    // One draw per display frame at 60 Hz, every other frame at 120 Hz: a 30 fps throttle landed on
    // uneven 3/4-frame intervals on ProMotion displays and read as a stutter.
    const FRAME_MS = 1000 / 60 - 2;
    let smoothRadius = 0;
    let smoothCenterY = 0;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = performance.now();
    let rotY = 0.4;
    let rotX = -0.25;
    let velY = 0.12;
    let goalX = -0.25;
    let pointerX = -1e4;
    let pointerY = -1e4;
    let nextStar = 2.5;
    let running = true;
    // The sphere (plus its widest ring) is kept between the fixed header's bottom edge and the
    // top of the DUOMEI word, measured live, so no header height or font metric can cover it.
    let layoutTop = 0;
    let layoutBottom = 0;
    let layoutMeasuredAt = 0;
    let visible = true;
    let asleep = false;
    const RING = 1.28;
    const measureLayout = () => {
      const rect = canvas.getBoundingClientRect();
      const header = document.querySelector(".duomei-header")?.getBoundingClientRect();
      const name = document.querySelector(".bounce-name")?.getBoundingClientRect();
      const top = header && header.bottom > 0 ? header.bottom - rect.top + 10 : 0;
      const bottom = name ? name.top - rect.top - 6 : rect.height;
      layoutTop = Math.max(0, top);
      layoutBottom = Math.min(rect.height, bottom);
      if (layoutBottom - layoutTop < 120) {
        layoutTop = 0;
        layoutBottom = rect.height;
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      frame = 0;
      if (now - lastDraw < FRAME_MS - 1) {
        if (running && visible && !reduced) frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // Steering: the pointer adds spin and tilt, both eased.
      const inside = pointerX > -1e3;
      const centerX = width / 2;
      if (window.scrollY < 12 && now - layoutMeasuredAt > 400) {
        layoutMeasuredAt = now;
        measureLayout();
      }
      // The sphere is allowed to be bigger than the gap between header and wordmark: its lower
      // third sits behind DUOMEI, so the whole hero reads as one object rather than a badge.
      const available = Math.max(80, layoutBottom - layoutTop);
      // Layout is re-measured every 400 ms (header height, wordmark position); ease toward the new
      // values instead of snapping so the sphere never jumps.
      const targetRadius = Math.min(Math.min(width, height) * 0.34, available * 0.62);
      const targetCenterY = layoutTop + targetRadius * 1.04;
      if (!smoothRadius) { smoothRadius = targetRadius; smoothCenterY = targetCenterY; }
      smoothRadius += (targetRadius - smoothRadius) * 0.08;
      smoothCenterY += (targetCenterY - smoothCenterY) * 0.08;
      const radius = smoothRadius;
      const centerY = smoothCenterY;
      // Scroll-driven burst: 0 at rest, 1 once the hero has scrolled half a viewport. Past the
      // end the hero is hidden under the paper layer, so the canvas goes to sleep (scroll wakes it).
      const heroProgress = Number.parseFloat(document.documentElement.style.getPropertyValue("--duomei-hero-progress")) || 0;
      const burstRaw = Math.min(1, Math.max(0, (heroProgress - 0.03) / 0.5));
      const burst = burstRaw * burstRaw * (3 - 2 * burstRaw);
      if (heroProgress >= 0.99) {
        context.clearRect(0, 0, width, height);
        asleep = true;
        return;
      }
      const spread = 1 + burst * 5.5;
      const fade = 1 - burst;
      if (inside) {
        const nx = (pointerX - centerX) / Math.max(1, width / 2);
        const ny = (pointerY - centerY) / Math.max(1, height / 2);
        velY += (0.12 + nx * 0.9 - velY) * 0.05;
        goalX = -0.25 + ny * 0.45;
      } else {
        velY += (0.12 - velY) * 0.03;
        goalX = -0.25;
      }
      rotY += velY * dt;
      rotX += (goalX - rotX) * 0.04;

      context.clearRect(0, 0, width, height);

      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const focal = 2.4;

      // Rings behind the sphere first, then points, then ring fronts.
      const ringPass = (front: boolean) => {
        for (const ring of rings) {
          const angle = ring.phase + t * ring.speed;
          context.beginPath();
          let started = false;
          const steps = 64;
          for (let step = 0; step <= steps; step += 1) {
            const a = (step / steps) * Math.PI * 2;
            let x = Math.cos(a) * 1.28;
            let y = 0;
            let z = Math.sin(a) * 1.28;
            // ring orientation
            const cr = Math.cos(ring.roll + t * 0.03), sr = Math.sin(ring.roll + t * 0.03);
            const ct = Math.cos(ring.tilt), st = Math.sin(ring.tilt);
            let y1 = y * ct - z * st, z1 = y * st + z * ct;
            let x2 = x * cr - y1 * sr, y2 = x * sr + y1 * cr;
            x = x2; y = y2; z = z1;
            // world rotation
            const xr = x * cosY - z * sinY, zr = x * sinY + z * cosY;
            const yr = y * cosX - zr * sinX, zz = y * sinX + zr * cosX;
            const isFront = zz >= 0;
            if (isFront !== front) { started = false; continue; }
            const scale = focal / (focal + zz);
            const px = centerX + xr * radius * (1 + burst * 3) * scale;
            const py = centerY + yr * radius * (1 + burst * 3) * scale;
            if (!started) { context.moveTo(px, py); started = true; } else context.lineTo(px, py);
          }
          const [r, g, b] = ring.hue;
          context.strokeStyle = `rgba(${r}, ${g}, ${b}, ${(front ? 0.7 : 0.22) * fade})`;
          context.lineWidth = front ? 1.3 : 0.8;
          context.stroke();

          // satellite
          {
            let x = Math.cos(angle) * 1.28, y = 0, z = Math.sin(angle) * 1.28;
            const cr = Math.cos(ring.roll + t * 0.03), sr = Math.sin(ring.roll + t * 0.03);
            const ct = Math.cos(ring.tilt), st = Math.sin(ring.tilt);
            const y1 = y * ct - z * st, z1 = y * st + z * ct;
            const x2 = x * cr - y1 * sr, y2 = x * sr + y1 * cr;
            x = x2; y = y2; z = z1;
            const xr = x * cosY - z * sinY, zr = x * sinY + z * cosY;
            const yr = y * cosX - zr * sinX, zz = y * sinX + zr * cosX;
            if ((zz >= 0) === front) {
              const scale = focal / (focal + zz);
              const px = centerX + xr * radius * (1 + burst * 3) * scale, py = centerY + yr * radius * (1 + burst * 3) * scale;
              const glow = context.createRadialGradient(px, py, 0, px, py, 9 * scale);
              glow.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${(front ? 0.95 : 0.4) * fade})`);
              glow.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
              context.fillStyle = glow;
              context.beginPath();
              context.arc(px, py, 9 * scale, 0, Math.PI * 2);
              context.fill();
            }
          }
        }
      };

      ringPass(false);

      // Soft core glow
      const core = context.createRadialGradient(centerX, centerY, radius * 0.1, centerX, centerY, radius * 1.05);
      core.addColorStop(0, `rgba(255, 250, 240, ${0.55 * fade})`);
      core.addColorStop(0.7, `rgba(255, 245, 235, ${0.08 * fade})`);
      core.addColorStop(1, "rgba(255, 245, 235, 0)");
      context.fillStyle = core;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.05, 0, Math.PI * 2);
      context.fill();

      // Points, back to front
      const projected: Array<{ px: number; py: number; zz: number; point: Point }> = [];
      for (const point of points) {
        const xr = point.x * cosY - point.z * sinY;
        const zr = point.x * sinY + point.z * cosY;
        const yr = point.y * cosX - zr * sinX;
        const zz = point.y * sinX + zr * cosX;
        const scale = focal / (focal + zz);
        const reach = radius * scale * (1 + burst * spread * point.burst);
        projected.push({ px: centerX + xr * reach, py: centerY + yr * reach, zz, point });
      }
      projected.sort((a, b) => b.zz - a.zz);
      for (const item of projected) {
        const depth = (1 - item.zz) / 2; // 0 far .. 1 near
        let alpha = 0.18 + depth * 0.72;
        let size = (0.7 + depth * 1.5) * item.point.size;
        const twinkle = 0.85 + 0.15 * Math.sin(t * 1.7 + item.point.twinkle);
        alpha *= twinkle;
        if (inside && fine) {
          const dx = item.px - pointerX, dy = item.py - pointerY;
          const dist = Math.hypot(dx, dy);
          if (dist < 90) {
            const k = 1 - dist / 90;
            size += k * 2.6;
            alpha = Math.min(1, alpha + k * 0.6);
          }
        }
        const sprite = sprites[HUES.indexOf(item.point.hue)] ?? sprites[0];
        if (burst > 0) {
          // Flying outward: a short radial tail behind each point, everything fading as it leaves.
          alpha *= Math.max(0, 1 - burst * 1.15);
          size *= 1 + burst * 0.8;
          const tail = burst * (1 - burst) * 4;
          // Tails on every other point are enough to read as motion and halve the stroke cost.
          if (tail > 0.05 && alpha > 0.02 && item.point.twinkle < Math.PI) {
            const dx = item.px - centerX, dy = item.py - centerY;
            const len = Math.hypot(dx, dy) || 1;
            const [r, g, b] = item.point.hue;
            context.globalAlpha = alpha * 0.7;
            context.strokeStyle = `rgb(${r} ${g} ${b})`;
            context.lineWidth = size * 0.8;
            context.beginPath();
            context.moveTo(item.px - (dx / len) * tail * size * 6, item.py - (dy / len) * tail * size * 6);
            context.lineTo(item.px, item.py);
            context.stroke();
          }
        }
        if (alpha <= 0.02) continue;
        const r2 = size * 1.35;
        context.globalAlpha = alpha;
        context.drawImage(sprite, item.px - r2, item.py - r2, r2 * 2, r2 * 2);
      }
      context.globalAlpha = 1;

      ringPass(true);

      // Shooting stars
      nextStar -= dt;
      if (nextStar <= 0 && !reduced) {
        nextStar = 3 + Math.random() * 4;
        const a = Math.random() * Math.PI * 2;
        const sx = centerX + Math.cos(a) * radius * 0.8;
        const sy = centerY + Math.sin(a) * radius * 0.5;
        const dir = a + Math.PI * 0.25;
        stars.push({ x: sx, y: sy, vx: Math.cos(dir) * 420, vy: Math.sin(dir) * 260, life: 0.9, hue: HUES[Math.floor(Math.random() * HUES.length)] });
      }
      for (let index = stars.length - 1; index >= 0; index -= 1) {
        const star = stars[index];
        star.life -= dt;
        if (star.life <= 0) { stars.splice(index, 1); continue; }
        const [r, g, b] = star.hue;
        const tailX = star.x - star.vx * 0.12, tailY = star.y - star.vy * 0.12;
        const grad = context.createLinearGradient(tailX, tailY, star.x, star.y);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${Math.min(1, star.life * 1.4).toFixed(3)})`);
        context.strokeStyle = grad;
        context.lineWidth = 1.4;
        context.beginPath();
        context.moveTo(tailX, tailY);
        context.lineTo(star.x, star.y);
        context.stroke();
        star.x += star.vx * dt;
        star.y += star.vy * dt;
      }

      if (running && visible && !reduced) frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (frame || !running || !visible) return;
      asleep = false;
      last = performance.now();
      frame = window.requestAnimationFrame(draw);
    };
    const onScroll = () => {
      if (asleep && window.scrollY < window.innerHeight) start();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      const rect = canvas.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      // Only steer while the pointer is over the hero area (generous margin).
      if (pointerX < -80 || pointerY < -80 || pointerX > rect.width + 80 || pointerY > rect.height + 80) {
        pointerX = -1e4;
        pointerY = -1e4;
      }
    };
    const onLeave = () => {
      pointerX = -1e4;
      pointerY = -1e4;
    };
    const onVisibility = () => {
      running = document.visibilityState === "visible";
      if (running) start();
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    // Stop drawing once the hero has scrolled away; resume when it comes back.
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
    }, { threshold: 0.25 });
    seen.observe(canvas);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    start();
    if (reduced) draw(performance.now());

    return () => {
      running = false;
      if (frame) window.cancelAnimationFrame(frame);
      observer.disconnect();
      seen.disconnect();
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="duomei-hero-orb" aria-hidden="true" />;
}
