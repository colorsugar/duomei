import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useMotionPlan } from './MotionPlans';
import { clamp01, smooth } from './xianyouTimeline';

type Chapter={id:string;label:string};
type Mount={chapter:Chapter;host:HTMLDivElement};
const scenes:Record<string,string>={notes:'journey',kuaihuo:'sleeve',guyu:'reading',yunyou:'cloud',color:'pigment',weiyan:'letters',skills:'desk'};
function Scene({chapter}:{chapter:Chapter}){
 const ref=useRef<HTMLElement>(null);const {paused}=useMotionPlan();const kind=scenes[chapter.id];
 useEffect(()=>{
  const node=ref.current;if(!node)return;let frame=0,visible=false,dirty=true,top=0,height=1,view=innerHeight,current=0;
  function draw(){frame=0;if(dirty){const r=node!.getBoundingClientRect();top=r.top+scrollY;height=r.height;view=innerHeight;dirty=false;}
   const target=paused?1:clamp01((scrollY-top+view*.36)/Math.max(1,height-view*.64));
   current+=(target-current)*.16;if(Math.abs(target-current)<.001)current=target;
   node!.style.setProperty('--scene-progress',String(current));node!.style.setProperty('--scene-open',String(smooth(.54,.98,current)));
   if(!paused&&Math.abs(target-current)>.001)request();
  }
  const request=()=>{if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);};
  const measure=()=>{dirty=true;request();};
  const io=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;node.dataset.sceneVisible=String(visible);if(visible)measure();else{cancelAnimationFrame(frame);frame=0;}},{rootMargin:'100px'});io.observe(node);
  const ro=new ResizeObserver(measure);ro.observe(node);const contentObserver=new ResizeObserver(measure);contentObserver.observe(document.body);
  window.addEventListener('scroll',request,{passive:true});window.addEventListener('resize',measure);document.addEventListener('visibilitychange',request);
  return()=>{cancelAnimationFrame(frame);io.disconnect();ro.disconnect();contentObserver.disconnect();window.removeEventListener('scroll',request);window.removeEventListener('resize',measure);document.removeEventListener('visibilitychange',request);};
 },[paused]);
 return <section ref={ref} className={`xianyou-scene scene-${kind}`} aria-label={`${chapter.label}过场`}>
  <div className="xianyou-scene-stage">
   <div className="xianyou-scene-camera" aria-hidden="true">
    {kind==='journey'||kind==='reading'||kind==='cloud'||kind==='sleeve'?<img src={`/experience/${kind==='journey'?'journey':kind==='reading'?'reading':'mountains'}-v4.webp`} alt="" loading="lazy" width="1672" height="941"/>:null}
    <div className="xianyou-mist"/><div className="xianyou-mist mist-near"/>
    {kind==='journey'&&<div className="flight-qi"><i/><i/><i/></div>}
    {kind==='sleeve'&&<div className="silk-sweep"/>}
    {kind==='pigment'&&<div className="pigment-garden">{Array.from({length:7},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}/>)}</div>}
    {kind==='letters'&&<div className="paper-slips">{Array.from({length:7},(_,i)=><i key={i} style={{'--i':i} as CSSProperties}><b/><b/><b/></i>)}</div>}
    {kind==='desk'&&<div className="scholar-desk"><i className="desk-brush"/><i className="desk-ink"/><i className="desk-paper"/></div>}
   </div>
   {kind==='reading'&&<div className="book-gateway" aria-hidden="true"><i className="book-page page-left"/><i className="book-page page-right"/><i className="book-page page-turn"/></div>}
   <div className="xianyou-scene-caption"><h2>{chapter.label}</h2><a href={`#${chapter.id}`}>进入{chapter.label} <span aria-hidden="true">↗</span></a></div>
   <div className="xianyou-scene-paper" aria-hidden="true"/>
  </div>
 </section>;
}
/** Presentation-only siblings: existing sticky tracks, gesture owners and text are untouched. */
export function MotionChapters({chapters}:{chapters:readonly Chapter[]}){
 const [mounts,setMounts]=useState<Mount[]>([]);const {paused}=useMotionPlan();
 useLayoutEffect(()=>{
  if(paused)return;const created:Mount[]=[];let raf=0;
  const scan=()=>{raf=0;const previousCount=created.length;for(const chapter of chapters){if(!scenes[chapter.id]||created.some(m=>m.chapter.id===chapter.id))continue;const target=document.getElementById(chapter.id);if(!target)continue;const host=document.createElement('div');host.className='xianyou-scene-host';host.dataset.forChapter=chapter.id;target.before(host);created.push({chapter,host});}if(created.length!==previousCount)setMounts([...created]);};
  // Some original sections are mounted by their own lazy components.
  const observer=new MutationObserver(()=>{if(!raf)raf=requestAnimationFrame(scan);});observer.observe(document.querySelector('.motion-home')??document.body,{childList:true,subtree:true});scan();
  return()=>{observer.disconnect();cancelAnimationFrame(raf);created.forEach(({host})=>host.remove());setMounts([]);};
 },[chapters,paused]);
 return <>{!paused&&mounts.map(({chapter,host})=>createPortal(<Scene chapter={chapter}/>,host,chapter.id))}</>;
}
