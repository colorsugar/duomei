import { useEffect, useRef } from "react";

// A thin layer of coloured motes over the whole first screen (fixed, behind the content): they drift
// slowly, shift with the pointer by depth, and blow outward as the sphere bursts on scroll. Sleeps
// once the hero is covered (reads --duomei-hero-progress like HeroOrb).
const HUES = [
  [224, 137, 74], [230, 121, 138], [200, 85, 74], [217, 168, 74], [95, 154, 108],
  [92, 165, 139], [79, 163, 184], [90, 111, 200], [154, 107, 200], [208, 106, 168],
];

type Mote = { x: number; y: number; vx: number; vy: number; depth: number; size: number; hue: number; phase: number };

export function HeroDust() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const compact = window.matchMedia("(max-width: 48rem)").matches;
    const count = compact ? 34 : 72;
    const motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = 0;
    let lastDraw = 0;
    let asleep = false;
    let pointerX = 0.5;
    let pointerY = 0.5;
    let easedX = 0.5;
    let easedY = 0.5;
    const FRAME_MS = 1000 / 60 - 2;

    const SPRITE = 24;
    const sprites = HUES.map(([r, g, b]) => {
      const dot = document.createElement("canvas");
      dot.width = SPRITE;
      dot.height = SPRITE;
      const dctx = dot.getContext("2d");
      if (dctx) {
        const grad = dctx.createRadialGradient(SPRITE / 2, SPRITE / 2, 0, SPRITE / 2, SPRITE / 2, SPRITE / 2);
        grad.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.95)`);
        grad.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.35)`);
        grad.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        dctx.fillStyle = grad;
        dctx.fillRect(0, 0, SPRITE, SPRITE);
      }
      return dot;
    });

    const seed = () => {
      motes.length = 0;
      for (let index = 0; index < count; index += 1) {
        const depth = 0.3 + Math.random() * 0.7;
        motes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 6 * depth,
          vy: -(2 + Math.random() * 6) * depth,
          depth,
          size: (1.2 + Math.random() * 2.2) * depth,
          hue: Math.floor(Math.random() * HUES.length),
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!motes.length) seed();
    };

    const draw = (now: number) => {
      frame = 0;
      if (now - lastDraw < FRAME_MS - 1) {
        frame = window.requestAnimationFrame(draw);
        return;
      }
      lastDraw = now;
      const dt = Math.min(0.08, (now - last) / 1000);
      last = now;
      const progress = Number.parseFloat(document.documentElement.style.getPropertyValue("--duomei-hero-progress")) || 0;
      if (progress >= 0.99) {
        context.clearRect(0, 0, width, height);
        asleep = true;
        return;
      }
      const burst = Math.min(1, Math.max(0, (progress - 0.03) / 0.5));
      easedX += (pointerX - easedX) * 0.04;
      easedY += (pointerY - easedY) * 0.04;
      context.clearRect(0, 0, width, height);
      const t = now / 1000;
      for (const mote of motes) {
        mote.x += mote.vx * dt;
        mote.y += mote.vy * dt;
        if (mote.y < -20) { mote.y = height + 10; mote.x = Math.random() * width; }
        if (mote.x < -20) mote.x = width + 10;
        if (mote.x > width + 20) mote.x = -10;
        const sway = Math.sin(t * 0.6 + mote.phase) * 8 * mote.depth;
        const px = mote.x + sway + (easedX - 0.5) * -60 * mote.depth;
        const py = mote.y + (easedY - 0.5) * -40 * mote.depth;
        // On burst the motes blow outward from the centre and fade with the sphere.
        const ox = (px - width / 2) * burst * 1.6;
        const oy = (py - height / 2) * burst * 1.6;
        const alpha = (0.35 + mote.depth * 0.5) * (0.8 + 0.2 * Math.sin(t * 1.3 + mote.phase)) * (1 - burst);
        if (alpha < 0.02) continue;
        const r = mote.size * (1 + burst) * 3;
        context.globalAlpha = alpha;
        context.drawImage(sprites[mote.hue], px + ox - r, py + oy - r, r * 2, r * 2);
      }
      context.globalAlpha = 1;
      if (document.visibilityState === "visible") frame = window.requestAnimationFrame(draw);
    };

    const start = () => {
      if (frame) return;
      asleep = false;
      last = performance.now();
      frame = window.requestAnimationFrame(draw);
    };
    const onScroll = () => {
      if (asleep && window.scrollY < window.innerHeight) start();
    };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      pointerX = event.clientX / Math.max(1, width);
      pointerY = event.clientY / Math.max(1, height);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
    };

    resize();
    start();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} className="duomei-hero-dust" aria-hidden="true" />;
}
