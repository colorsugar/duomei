import { useEffect, useRef, useState } from 'react';

/** Same-origin camera footage; decode only while its stage is on screen. */
export function CinematicVideo({scene, paused = false, hero = false, onBlocked}: {scene: number; paused?: boolean; hero?: boolean; onBlocked?: () => void}) {
  const root = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const blocked = useRef(onBlocked);
  blocked.current = onBlocked;
  const [mobile] = useState(() => matchMedia('(max-width: 768px)').matches);
  const base = `/experience/scene-${String(scene).padStart(2, '0')}${mobile ? '-mobile' : ''}`;
  useEffect(() => {
    const film = video.current, element = root.current;
    if (!film || !element) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = hero, disposed = false, fadingOut = false, raf = 0, timer = 0;
    const allowed = () => visible && !paused && !reduce.matches && !document.hidden && !disposed;
    const fade = (to: number) => {
      cancelAnimationFrame(raf);
      const from = Number(film.style.opacity || 0), start = performance.now();
      const step = (now: number) => {
        if (disposed) return;
        const p = Math.min(1, (now - start) / 500);
        film.style.opacity = String(from + (to - from) * p);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const play = () => {
      if (!allowed()) return;
      if (!film.getAttribute('src')) film.src = base + '.mp4';
      void film.play().catch(() => { if (allowed()) blocked.current?.(); });
    };
    const sync = () => {
      if (allowed()) play();
      else { film.pause(); clearTimeout(timer); cancelAnimationFrame(raf); }
    };
    const playing = () => {
      element.dataset.playing = 'true';
      fadingOut = false;
      fade(1);
    };
    const time = () => {
      if (!fadingOut && film.duration - film.currentTime <= .55) { fadingOut = true; fade(0); }
    };
    const end = () => {
      film.style.opacity = '0';
      timer = window.setTimeout(() => { film.currentTime = 0; fadingOut = false; play(); }, 100);
    };
    const failed = () => { delete element.dataset.playing; film.style.opacity = '0'; blocked.current?.(); };
    film.addEventListener('error', failed);
    film.addEventListener('canplay', play);
    film.addEventListener('playing', playing);
    film.addEventListener('timeupdate', time);
    film.addEventListener('ended', end);
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold: .01});
    io.observe(element);
    document.addEventListener('visibilitychange', sync);
    reduce.addEventListener('change', sync);
    sync();
    return () => {
      disposed = true; film.pause(); cancelAnimationFrame(raf); clearTimeout(timer); io.disconnect();
      film.removeEventListener('error', failed);
      film.removeEventListener('canplay', play); film.removeEventListener('playing', playing);
      film.removeEventListener('timeupdate', time); film.removeEventListener('ended', end);
      document.removeEventListener('visibilitychange', sync); reduce.removeEventListener('change', sync);
    };
  }, [base, paused, hero]);
  return <div ref={root} className="cinema-video" aria-hidden="true">
    <img src={base + '.webp'} alt="" fetchPriority={hero ? 'high' : 'auto'} loading={hero ? 'eager' : 'lazy'} />
    <video ref={video} muted playsInline preload={hero ? 'auto' : 'none'} style={{opacity: 0}} />
  </div>;
}
