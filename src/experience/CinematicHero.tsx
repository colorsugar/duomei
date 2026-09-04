import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDuomeiEdit } from '../components/DuomeiEditProvider';
import { getHeroTextSettings, saveHeroTextSettings, HERO_TEXT_UPDATED_EVENT, type HeroTextSettings } from '../lib/heroSettings';

type Sculpture = { update: (state: {x:number;y:number;progress:number}) => void; pause: (paused:boolean) => void; dispose: () => void };

export function CinematicHero() {
  const root = useRef<HTMLElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const scene = useRef<Sculpture | null>(null);
  const [ready, setReady] = useState(false);
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [settings, setSettings] = useState(getHeroTextSettings);
  const { isLoggedIn, editMode } = useDuomeiEdit();
  const editable = isLoggedIn && editMode;

  useEffect(() => {
    const refresh = () => setSettings(getHeroTextSettings());
    window.addEventListener(HERO_TEXT_UPDATED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(HERO_TEXT_UPDATED_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = () => setPaused(media.matches);
    media.addEventListener('change', updatePreference);
    const script = document.createElement('script');
    script.type = 'module';
    script.src = '/experience/sculpture.js';
    script.onload = () => {
      if (cancelled || !canvas.current) return;
      try {
        const runtime = (window as typeof window & {duomeiSculpture?: {mountSculpture: (canvas: HTMLCanvasElement, options: {reduced: boolean; onReady: () => void; onFailure: () => void}) => Sculpture}}).duomeiSculpture;
        scene.current = runtime?.mountSculpture(canvas.current, {reduced:media.matches, onReady:() => setReady(true), onFailure:() => setReady(false)}) ?? null;
      } catch { setReady(false); }
    };
    script.onerror = () => { if (!cancelled) setReady(false); };
    document.head.append(script);
    return () => { cancelled = true; script.remove(); media.removeEventListener('change', updatePreference); scene.current?.dispose(); scene.current = null; };
  }, []);
  useEffect(() => { scene.current?.pause(paused); }, [paused, ready]);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0, x = 0, y = 0, height = window.innerHeight;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const draw = () => {
      frame = 0;
      const progress = reduce.matches ? 0 : Math.min(1, Math.max(0, window.scrollY / height));
      element.style.setProperty('--hero-progress', String(progress));
      scene.current?.update({x, y, progress});
    };
    const request = () => { if (!frame) frame = requestAnimationFrame(draw); };
    const pointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || paused) return;
      x = event.clientX / innerWidth * 2 - 1; y = event.clientY / height * 2 - 1; request();
    };
    const resize = () => { height = innerHeight; request(); };
    window.addEventListener('scroll', request, {passive:true});
    window.addEventListener('resize', resize);
    element.addEventListener('pointermove', pointer, {passive:true});
    draw();
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', request); window.removeEventListener('resize', resize); element.removeEventListener('pointermove', pointer); };
  }, [paused]);

  const text = (field: keyof HeroTextSettings) => ({
    contentEditable: editable,
    suppressContentEditableWarning: true,
    onBlur: (event: React.FocusEvent<HTMLElement>) => {
      if (!editable) return;
      const value = event.currentTarget.textContent?.trim() ?? '';
      saveHeroTextSettings({...settings, [field]: field === 'scrollHint' ? value : value || settings[field]});
    },
  });
  return (
    <section ref={root} className="cinema-hero" id="home" aria-label="多美小记">
      <div className="cinema-hero-stage">
        <div className="cinema-hero-meta"><span>DUOMEI JOURNAL</span><span>生活 · 旅途 · 自己</span></div>
        <h1 className="cinema-wordmark" aria-label="DUOMEI">{'DUOMEI'.split('').map((letter, i) => <span key={i} style={{'--letter':i} as CSSProperties}>{letter}</span>)}</h1>
        <div className={`cinema-sculpture${ready ? ' is-ready' : ''}`} aria-hidden="true">
          <img src="/experience/sculpture-poster.webp" alt="" width="1200" height="1200" fetchPriority="high" />
          <canvas ref={canvas} />
        </div>
        <div className="cinema-hero-copy">
          <p className="cinema-subname" {...text('subname')}>{settings.subname}</p>
          <p className="cinema-line" {...text('line')}>{settings.line}</p>
          {settings.scrollHint || editable ? <p {...text('scrollHint')}>{settings.scrollHint}</p> : null}
        </div>
        <div className="cinema-hero-bottom">
          <a href="#zaobao" className="cinema-explore"><span>向下探索</span><b aria-hidden="true">↘</b></a>
          <span className="cinema-edition">01 — 09<span>一段关于多美的旅程</span></span>
          {ready ? <button className="cinema-pause" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? '播放主视觉' : '暂停主视觉'}<span aria-hidden="true">{paused ? '▷' : 'Ⅱ'}</span></button> : null}
        </div>
      </div>
    </section>
  );
}
