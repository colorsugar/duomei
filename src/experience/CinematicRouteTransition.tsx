import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, type Location } from 'react-router-dom';
import { shouldAnimateRoute } from './routeMotion';

type Phase = 'idle' | 'native' | 'closing' | 'covered' | 'opening';
type NativeTransition = {ready: Promise<void>; finished: Promise<void>; skipTransition: () => void};
type TransitionDocument = Document & {startViewTransition?: (update: () => Promise<void>) => NativeTransition};
type Run = {key: string; timers: number[]; resolve?: () => void; native?: NativeTransition; fallback: boolean; settled?: boolean};

export function routeChapter(path: string) {
  if (path.startsWith('/zaobao')) return '早报';
  if (path.startsWith('/note/')) return '小记';
  if (path.startsWith('/guyu')) return '故语';
  if (path.startsWith('/yunyou')) return '云游';
  if (path.startsWith('/skills')) return 'Skill';
  if (path.startsWith('/time')) return '快活';
  return '多美';
}

/** The router still owns links, history and modifier keys; only presentation waits. */
export function useCinematicRoute() {
  const target = useLocation();
  const [location, setLocation] = useState<Location>(target);
  const [phase, setPhase] = useState<Phase>('idle');
  const shown = useRef(target);
  const pending = useRef<Run | null>(null);

  const onReady = useCallback((key: string) => {
    const run = pending.current;
    if (!run || run.key !== key || run.settled) return;
    run.settled = true;
    run.timers.forEach(clearTimeout);
    run.timers = [];
    run.resolve?.();
    run.resolve = undefined;
    if (run.fallback) {
      setPhase('opening');
      run.timers.push(window.setTimeout(() => {
        if (pending.current === run) setPhase('idle');
      }, 760));
    }
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.cinematicNavigation = 'true';
    return () => { delete document.documentElement.dataset.cinematicNavigation; };
  }, []);

  useLayoutEffect(() => {
    const previous = shown.current;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const commit = () => { shown.current = target; setLocation(target); };
    // Hash navigation, editing and reduced motion keep their direct native behavior.
    if (!shouldAnimateRoute(previous.pathname, target.pathname, reduce.matches, document.hidden)) {
      commit(); setPhase('idle'); return;
    }

    document.documentElement.dataset.cinemaDirection = target.pathname === '/' ? 'return' : 'forward';
    const doc = document as TransitionDocument;
    const run: Run = {key:target.key, timers:[], fallback:!doc.startViewTransition};
    pending.current = run;

    if (doc.startViewTransition) {
      setPhase('native');
      try {
        run.native = doc.startViewTransition(() => {
          if (pending.current !== run) return Promise.resolve();
          // The incoming lazy route must mount before the browser takes its snapshot.
          const ready = new Promise<void>(resolve => {
            run.resolve = resolve;
            run.timers.push(window.setTimeout(resolve, 2200));
          });
          flushSync(commit);
          return ready;
        });
        run.native.ready.catch(() => {}); // Unsupported captures still commit navigation.
        const finish = () => { if (pending.current === run) setPhase('idle'); };
        void run.native.finished.then(finish, finish);
      } catch {
        run.fallback = true;
      }
    }
    if (run.fallback) {
      setPhase('closing');
      run.timers.push(window.setTimeout(() => {
        if (pending.current !== run) return;
        setPhase('covered'); commit();
      }, 250));
      // Network failures may reveal the existing loading UI, but never trap navigation.
      run.timers.push(window.setTimeout(() => onReady(run.key), 2500));
    }
    const stopMotion = () => {
      if (!reduce.matches) return;
      run.resolve?.(); run.native?.skipTransition();
      run.timers.forEach(clearTimeout); commit(); setPhase('idle');
    };
    reduce.addEventListener('change', stopMotion);
    return () => {
      if (pending.current === run) pending.current = null;
      run.timers.forEach(clearTimeout);
      run.resolve?.(); run.native?.skipTransition();
      reduce.removeEventListener('change', stopMotion);
    };
  }, [target, onReady]);

  return {location, phase, onReady, label:routeChapter(target.pathname)};
}

export function CinematicRouteReady({routeKey, onReady}: {routeKey:string; onReady:(key:string) => void}) {
  useLayoutEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {second = requestAnimationFrame(() => onReady(routeKey));});
    return () => {cancelAnimationFrame(first); cancelAnimationFrame(second);};
  }, [routeKey, onReady]);
  return null;
}

export function CinematicRouteCurtain({phase, label}: {phase:Phase; label:string}) {
  if (phase === 'idle' || phase === 'native') return null;
  return <div className="cinema-route-curtain" data-phase={phase} aria-hidden="true"><span>{label}</span></div>;
}
