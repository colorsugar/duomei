import { useEffect, useRef, useState, type FocusEvent } from 'react';
import { useDuomeiEdit } from '../components/DuomeiEditProvider';
import { getHeroTextSettings, saveHeroTextSettings, HERO_TEXT_UPDATED_EVENT, type HeroTextSettings } from '../lib/heroSettings';
import { useMotionPlan } from './MotionPlans';
import { createMotionRenderer, type MotionRenderer } from './motionRenderer';
import { clamp01, orientationOffset, swordTimeline } from './xianyouTimeline';

export function MotionHero(){
 const root=useRef<HTMLElement>(null),art=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const {paused,replay,toggle,restart,sensor,enableSensor}=useMotionPlan();
 const [settings,setSettings]=useState(getHeroTextSettings);
 const {isLoggedIn,editMode}=useDuomeiEdit(),editable=isLoggedIn&&editMode;
 useEffect(()=>{const refresh=()=>setSettings(getHeroTextSettings());window.addEventListener(HERO_TEXT_UPDATED_EVENT,refresh);window.addEventListener('storage',refresh);return()=>{window.removeEventListener(HERO_TEXT_UPDATED_EVENT,refresh);window.removeEventListener('storage',refresh);};},[]);
 useEffect(()=>{
  const section=root.current,surface=art.current,target=canvas.current;if(!section||!surface||!target)return;
  let frame=0,renderer:MotionRenderer|null=null,disposed=false,visible=true,dirty=true,last=0,time=0;
  let top=0,height=1,view=innerHeight,rect=surface.getBoundingClientRect();
  let x=0,y=0,aimX=0,aimY=0,progress=0,baseBeta:number|null=null,baseGamma=0;
  const request=()=>{if(!frame&&visible&&!document.hidden&&!disposed)frame=requestAnimationFrame(draw);};
  function draw(now:number){
   frame=0;if(disposed)return;
   if(dirty){const bounds=section!.getBoundingClientRect();top=bounds.top+scrollY;height=bounds.height;view=innerHeight;rect=surface!.getBoundingClientRect();renderer?.resize(surface!.clientWidth,surface!.clientHeight,Math.min(devicePixelRatio,innerWidth<769?1.5:2));dirty=false;}
   const dt=Math.min(40,now-(last||now-16));last=now;if(!paused)time+=dt/1000;
   const ease=1-Math.exp(-dt/120);x+=(aimX-x)*ease;y+=(aimY-y)*ease;
   const wanted=paused?0:clamp01((scrollY-top)/Math.max(1,height-view));progress+=(wanted-progress)*ease;
   const timeline=swordTimeline(progress);
   section!.style.setProperty('--hero-reveal',String(timeline.reveal));section!.style.setProperty('--hero-progress',String(progress));
   section!.style.setProperty('--hero-flash',String(timeline.flash));
   renderer?.draw({progress,x:paused?0:x,y:paused?0:y,time});
   if(!paused)request();
  }
  const measure=()=>{dirty=true;request();};
  const move=(event:PointerEvent)=>{if(event.pointerType==='touch'||paused)return;aimX=Math.max(-1,Math.min(1,(event.clientX-rect.left)/rect.width*2-1));aimY=Math.max(-1,Math.min(1,(event.clientY-rect.top)/rect.height*2-1));request();};
  const leave=()=>{aimX=0;aimY=0;request();};
  const orientation=(event:DeviceOrientationEvent)=>{
   if(paused||sensor!=='on'||event.beta===null||event.gamma===null)return;
   if(baseBeta===null){baseBeta=event.beta;baseGamma=event.gamma;}
   const offset=orientationOffset(event.beta,event.gamma,baseBeta,baseGamma,screen.orientation?.angle??0);aimX=offset.x;aimY=offset.y;request();
  };
  const recalibrate=()=>{baseBeta=null;measure();};
  const visibility=()=>{last=0;if(document.hidden){cancelAnimationFrame(frame);frame=0;}else request();};
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;section.dataset.sceneVisible=String(visible);last=0;if(visible){dirty=true;request();}else{cancelAnimationFrame(frame);frame=0;}});io.observe(section);
  const ro=new ResizeObserver(measure);ro.observe(section);ro.observe(surface);
  section.addEventListener('pointermove',move,{passive:true});section.addEventListener('pointerleave',leave);
  window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',recalibrate);document.addEventListener('visibilitychange',visibility);
  if(sensor==='on')window.addEventListener('deviceorientation',orientation,{passive:true});
  const foreground=new Image(),background=new Image();let loaded=0;
  const ready=()=>{if(++loaded!==2||disposed)return;renderer=createMotionRenderer(target,foreground,background);if(renderer){dirty=true;section.dataset.canvasReady='true';request();}};
  foreground.onload=ready;background.onload=ready;foreground.src='/experience/sword-key-v4.webp';background.src='/experience/mountains-v4.webp';
  const lost=(event:Event)=>{event.preventDefault();section.dataset.canvasReady='false';renderer?.dispose();renderer=null;};target.addEventListener('webglcontextlost',lost);
  section.dataset.canvasReady='false';request();
  return()=>{disposed=true;cancelAnimationFrame(frame);foreground.onload=null;background.onload=null;renderer?.dispose();io.disconnect();ro.disconnect();section.removeEventListener('pointermove',move);section.removeEventListener('pointerleave',leave);window.removeEventListener('scroll',request);window.removeEventListener('resize',recalibrate);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('deviceorientation',orientation);target.removeEventListener('webglcontextlost',lost);};
 },[paused,replay,sensor]);
 const text=(field:keyof HeroTextSettings)=>({contentEditable:editable,suppressContentEditableWarning:true,onBlur:(event:FocusEvent<HTMLElement>)=>{if(!editable)return;const value=event.currentTarget.textContent?.trim()??'';saveHeroTextSettings({...settings,[field]:field==='scrollHint'?value:value||settings[field]});}});
 return <section ref={root} id="home" className="motion-hero" aria-label="多美小记">
  <div className="motion-hero-stage">
   <div className="motion-hero-art" ref={art} aria-hidden="true"><img className="motion-hero-fallback" src="/experience/sword-v4.webp" alt="" width="1672" height="941" fetchPriority="high"/><canvas ref={canvas}/><div className="xianyou-mist"/><div className="xianyou-mist mist-near"/></div>
   <div className="motion-hero-paper" aria-hidden="true"/>
   <div className="motion-hero-copy"><p className="motion-hero-subname" {...text('subname')}>{settings.subname}</p><h1>DUOMEI</h1><p className="motion-hero-line" {...text('line')}>{settings.line}</p>{(settings.scrollHint||editable)&&<p className="motion-hero-hint" {...text('scrollHint')}>{settings.scrollHint}</p>}</div>
   <div className="motion-hero-bottom"><a href="#zaobao">向下探索 <b aria-hidden="true">↓</b></a><div className="motion-controls"><button onClick={restart} aria-label="重置镜头与体感基准">重置视角 ↻</button><button onClick={toggle} aria-pressed={paused}>{paused?'开启动效':'暂停动效'}</button><button className="motion-sensor" onClick={()=>void enableSensor()} disabled={sensor==='requesting'} aria-pressed={sensor==='on'}>{sensor==='on'?'关闭体感':sensor==='requesting'?'请求中…':'开启体感'}</button></div></div>
   {sensor==='unavailable'&&<p className="motion-sensor-note" role="status">体感未开启，仍可滚动探索；电脑可移动指针。</p>}
   <div className="motion-hero-reveal" aria-hidden="true"><span>早报</span></div>
  </div>
 </section>;
}
