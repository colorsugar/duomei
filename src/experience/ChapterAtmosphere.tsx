import { useEffect, useRef, useState } from 'react';

type Chapter = {id: string; label: string};

export function ChapterAtmosphere({chapters, paused, setPaused}: {chapters: readonly Chapter[]; paused: boolean; setPaused: (value: boolean) => void}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [active, setActive] = useState('首页');
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.cinema-home');
    if (!root) return;
    const nodes = chapters.map(({id, label}, index) => ({element:document.getElementById(id), id, label, index, top:0, height:1})).filter(row => row.element !== null);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0, dirty = true, lastLabel = '';
    const visible = new Set<HTMLElement>();
    const update = () => {
      frame = 0;
      const scroll = window.scrollY, viewport = window.innerHeight;
      if (dirty) {
        // Layout reads are batched on size changes, never in the continuous scroll path.
        nodes.forEach(row => {const rect = row.element!.getBoundingClientRect(); row.top = rect.top + scroll; row.height = rect.height;});
        dirty = false;
      }
      let current: string = '首页';
      for (const row of nodes) {
        if (scroll + viewport * .35 >= row.top) current = row.label;
        if (!visible.has(row.element!)) continue;
        const enter = Math.max(0, Math.min(1, (scroll + viewport - row.top) / (viewport * .75)));
        const progress = Math.max(0, Math.min(1, (scroll - row.top) / Math.max(1, row.height - viewport)));
        const reveal = reduce.matches ? 1 : Math.max(0, Math.min(1, (progress - .06) / .25));
        row.element!.style.setProperty('--scene-reveal', String(reveal));
        row.element!.style.setProperty('--scene-intro', String(reduce.matches ? 0 : Math.max(0, 1 - progress / .18)));
        row.element!.style.setProperty('--chapter-enter', String(reduce.matches ? 1 : enter));
        row.element!.style.setProperty('--chapter-progress', String(reduce.matches ? .5 : progress));
      }
      if (current !== lastLabel) { lastLabel = current; setActive(current); }
    };
    const request = () => {if (!frame) frame = requestAnimationFrame(update);};
    const resize = () => {dirty = true; request();};
    const ro = new ResizeObserver(resize);
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {const el = entry.target as HTMLElement; if(entry.isIntersecting) {visible.add(el); el.classList.add('cinema-entered');} else visible.delete(el);});
      request();
    }, {rootMargin:'100px'});
    // Each chapter owns a different shot. Re-entry replays it, without listeners on cards.
    const shots = new IntersectionObserver(entries => {
      entries.forEach(entry => entry.target.classList.toggle('cinema-shot-live', entry.isIntersecting));
    }, {rootMargin:'0px 0px -15% 0px'});
    nodes.forEach(row => {row.element!.dataset.chapter = String(row.index + 1).padStart(2,'0'); ro.observe(row.element!); io.observe(row.element!); shots.observe(row.element!);});
    window.addEventListener('scroll', request, {passive:true}); window.addEventListener('resize', resize); reduce.addEventListener('change', request);
    update();
    return () => {cancelAnimationFrame(frame); ro.disconnect(); io.disconnect(); shots.disconnect(); window.removeEventListener('scroll',request); window.removeEventListener('resize',resize); reduce.removeEventListener('change',request);};
  }, [chapters]);
  return <>
    <button className="cinema-index-trigger liquid-glass" onClick={() => dialog.current?.showModal()} aria-haspopup="dialog"><span>{active}</span><i aria-hidden="true">☷</i><span className="cinema-index-label">章节</span></button>
    <dialog className="cinema-index" ref={dialog} aria-labelledby="cinema-index-title" onClick={event => {if(event.target === event.currentTarget) dialog.current?.close();}}>
      <div className="cinema-index-inner">
        <header><span id="cinema-index-title">多美 · 章节索引</span><button autoFocus onClick={() => dialog.current?.close()} aria-label="关闭章节索引">×</button></header>
        <nav>{chapters.map(({id,label},i) => <a key={id} href={`#${id}`} onClick={() => dialog.current?.close()} aria-current={active === label ? 'location' : undefined}><small>{String(i + 1).padStart(2,'0')}</small><span>{label}</span><b aria-hidden="true">↗</b></a>)}</nav>
        <footer>DUOMEI JOURNAL <button className="liquid-glass cinema-motion-control" onClick={() => setPaused(!paused)} aria-pressed={paused}>{paused ? "播放场景" : "暂停场景"}</button></footer>
      </div>
    </dialog>
  </>;
}
