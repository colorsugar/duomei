import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useDuomeiEdit } from '../components/DuomeiEditProvider';
import { getHeroTextSettings, saveHeroTextSettings, HERO_TEXT_UPDATED_EVENT, type HeroTextSettings } from '../lib/heroSettings';

export function CinematicHero() {
  const root = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mobile] = useState(() => matchMedia('(max-width: 768px)').matches);
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
    const media = matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setPaused(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);

  useEffect(() => {
    const film = video.current, section = root.current;
    if (!film || !section) return;
    let visible = false, cancelled = false;
    const sync = () => {
      if (cancelled) return;
      if (paused || !visible || document.hidden) { film.pause(); return; }
      // Choose one rendition before loading: phones never fetch the desktop film.
      if (!film.getAttribute('src')) {
        film.src = '/experience/guilin-film' + (mobile ? '-mobile' : '') + '.mp4';
      }
      film.play().catch(() => { if (!cancelled && visible && !document.hidden) setPaused(true); });
    };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }, {threshold:0.01});
    observer.observe(section);
    document.addEventListener('visibilitychange', sync);
    return () => { cancelled = true; observer.disconnect(); document.removeEventListener('visibilitychange', sync); };
  }, [paused, mobile]);

  useEffect(() => {
    const film = video.current;
    return () => film?.pause();
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let frame = 0, visible = true, height = innerHeight;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const draw = () => {
      frame = 0;
      const progress = reduce.matches || paused ? 0 : Math.min(1, Math.max(0, scrollY / height));
      element.style.setProperty('--hero-progress', String(progress));
    };
    const request = () => { if (!frame && visible && !document.hidden) frame = requestAnimationFrame(draw); };
    const resize = () => { height = innerHeight; request(); };
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; request(); });
    observer.observe(element);
    window.addEventListener('scroll', request, {passive:true});
    window.addEventListener('resize', resize);
    draw();
    return () => { cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', request); window.removeEventListener('resize', resize); };
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

  const togglePlayback = () => {
    const film = video.current;
    if (paused && film) {
      if (!film.getAttribute('src')) film.src = '/experience/guilin-film' + (mobile ? '-mobile' : '') + '.mp4';
      // Keep the explicit retry inside the visitor's gesture for mobile playback policies.
      void film.play().catch(() => {});
    } else film?.pause();
    setPaused(!paused);
  };

  return (
    <section ref={root} className={'cinema-film' + (paused ? ' is-paused' : '')} id="home" aria-label="多美小记">
      <div className="cinema-film-stage">
        <div className="cinema-film-landscape" aria-hidden="true">
          <video ref={video} muted playsInline loop preload="none" poster={'/experience/guilin-film' + (mobile ? '-mobile' : '') + '-poster.webp'}
            onError={() => setPaused(true)} />
        </div>
        <div className="cinema-film-shade" aria-hidden="true" />
        <div className="cinema-film-aperture" aria-hidden="true" />
        <div className="cinema-film-top"><span>DUOMEI JOURNAL</span><span>生活 · 旅途 · 自己</span></div>
        <div className="cinema-film-title">
          <p className="cinema-film-subname" {...text('subname')}>{settings.subname}</p>
          <h1 aria-label="DUOMEI">{'DUOMEI'.split('').map((letter, i) => <span key={i} style={{'--letter':i} as CSSProperties}>{letter}</span>)}</h1>
          <p className="cinema-film-line" {...text('line')}>{settings.line}</p>
          {settings.scrollHint || editable ? <p className="cinema-film-hint" {...text('scrollHint')}>{settings.scrollHint}</p> : null}
        </div>
        <div className="cinema-film-bottom">
          <a href="#zaobao" className="cinema-film-explore"><span>向下探索</span><b aria-hidden="true">↓</b></a>
          <span className="cinema-film-location">桂林 · 漓江<span>GUILIN, CHINA</span></span>
          <button className="cinema-film-pause" onClick={togglePlayback} aria-pressed={paused} aria-label={paused ? '播放主视觉' : '暂停主视觉'}>
            <span className={'cinema-film-playmark' + (paused ? ' is-stopped' : '')} aria-hidden="true"><i /><i /><i /></span>
            {paused ? '播放' : '暂停'}
          </button>
        </div>
      </div>
    </section>
  );
}
