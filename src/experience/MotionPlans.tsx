import { createContext, useContext, useEffect, useLayoutEffect, useState, type ReactNode } from 'react';

type SensorState = 'off' | 'requesting' | 'on' | 'unavailable';
type OrientationPermission = typeof DeviceOrientationEvent & {requestPermission?: () => Promise<string>};
const Context = createContext({paused:false, replay:0, sensor:'off' as SensorState, toggle:()=>{}, restart:()=>{}, enableSensor:async()=>{}});
export const useMotionPlan = () => useContext(Context);
export function MotionPlanProvider({children}:{children:ReactNode}) {
  const [paused,setPaused]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [replay,setReplay]=useState(0);
  const [sensor,setSensor]=useState<SensorState>('off');
  useLayoutEffect(()=>{
    document.documentElement.dataset.motionPaused=String(paused);
    return()=>{delete document.documentElement.dataset.motionPaused;};
  },[paused]);
  useEffect(()=>{
    const query=matchMedia('(prefers-reduced-motion: reduce)');
    const update=()=>setPaused(query.matches);
    query.addEventListener('change',update);
    return()=>query.removeEventListener('change',update);
  },[]);
  async function enableSensor(){
    if(sensor==='on'){setSensor('off');return;}
    if(sensor==='requesting')return;
    if(!window.isSecureContext||typeof DeviceOrientationEvent==='undefined'){setSensor('unavailable');return;}
    setSensor('requesting');
    try{
      const api=DeviceOrientationEvent as OrientationPermission;
      const result=api.requestPermission?await api.requestPermission():'granted';
      setSensor(result==='granted'?'on':'unavailable');
    }catch{setSensor('unavailable');}
  }
  return <Context.Provider value={{paused,replay,sensor,toggle:()=>setPaused(v=>!v),restart:()=>setReplay(v=>v+1),enableSensor}}>{children}</Context.Provider>;
}
