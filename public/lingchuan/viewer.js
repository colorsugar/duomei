import * as T from './vendor/three.module.js';
import { OrbitControls } from './vendor/addons/controls/OrbitControls.js';
import { loadCampusGLB } from './load-glb.js?v=20260906-academic-join';

const REGIONS=['whole','courtyard','academic','athletics'];
const VIEWS={
 courtyard:{overview:[[0,2,49],[123,24,157],[.78,.63,1]],front:[[0,8,3],[106,21,25],[0,.035,1]],garden:[[-12,3,53],[42,14,41],[-.38,.2,1]]},
 academic:{overview:[[0,4,8],[85,25,52],[.75,.55,1]],front:[[-2,9,5],[84,22,24],[0,.07,1]],garden:[[-24,6,11],[33,18,24],[-.5,.22,1]]},
 athletics:{overview:[[0,0,0],[177,20,127],[.8,.78,1]],front:[[0,3,0],[177,17,100],[0,.24,1]],garden:[[-45,3,20],[52,14,50],[-.5,.18,1]]},
 whole:{overview:[[13,6,43],[340,45,310],[.6,.95,1]],front:[[0,7,0],[85,23,28],[.4,.14,1]],garden:[[26,3,75],[95,20,90],[.2,.38,1]]}
};
export function fitView(spec,aspect,fov=43){
 const [center,size,direction]=spec,target=new T.Vector3(...center),dir=new T.Vector3(...direction).normalize(),right=new T.Vector3().crossVectors(new T.Vector3(0,1,0),dir).normalize(),up=new T.Vector3().crossVectors(dir,right).normalize();
 const tanY=Math.tan(fov*Math.PI/360),tanX=tanY*aspect;let distance=0;
 for(const x of [-1,1])for(const y of [-1,1])for(const z of [-1,1]){const p=new T.Vector3(x*size[0]/2,y*size[1]/2,z*size[2]/2),depth=p.dot(dir);distance=Math.max(distance,depth+Math.abs(p.dot(right))/tanX,depth+Math.abs(p.dot(up))/tanY);}
 return {position:target.clone().addScaledVector(dir,distance*1.12),target};
}
export function mountCampus(canvas,{region='courtyard',onReady=()=>{},onError=()=>{},onProgress=()=>{},onFrame=()=>{}}={}){
 const mobile=matchMedia('(max-width: 650px)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 let renderer;
 try{renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'high-performance',logarithmicDepthBuffer:true});}catch(cause){onError(Object.assign(new Error('当前浏览器未开启三维加速，已为你展示模型实景预览。'),{code:'WEBGL_UNAVAILABLE',cause}));return null;}
 renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.35:1.75));renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 const scene=new T.Scene();scene.background=new T.Color('#d1dfd9');scene.fog=new T.Fog('#d1dfd9',230,900);
 // Original sky irradiance for believable glass/steel reflections, with no external HDRI.
 let environmentTarget=null;
 function refreshEnvironment(){const skyPixels=new Uint8Array(256*128*4),sky=new T.Color('#aacbdc'),horizon=new T.Color('#e3e6d8'),earth=new T.Color('#7c8b67'),pixel=new T.Color();
 for(let y=0;y<128;y++)for(let x=0;x<256;x++){const latitude=y/127,t=Math.abs(latitude-.5)*2;pixel.copy(horizon).lerp(latitude<.5?sky:earth,Math.sqrt(t));const i=(y*256+x)*4;skyPixels[i]=Math.round(pixel.r*255);skyPixels[i+1]=Math.round(pixel.g*255);skyPixels[i+2]=Math.round(pixel.b*255);skyPixels[i+3]=255;}
 const skyTexture=new T.DataTexture(skyPixels,256,128,T.RGBAFormat);skyTexture.mapping=T.EquirectangularReflectionMapping;skyTexture.needsUpdate=true;
 const environmentGenerator=new T.PMREMGenerator(renderer);
 try{const previous=environmentTarget;environmentTarget=environmentGenerator.fromEquirectangular(skyTexture);previous?.dispose();scene.environment=environmentTarget.texture;scene.environmentIntensity=.65;}catch{scene.environment=null;}finally{skyTexture.dispose();environmentGenerator.dispose();}}
 refreshEnvironment();
 const camera=new T.PerspectiveCamera(43,1,.3,4000),controls=new OrbitControls(camera,canvas);
 controls.enableDamping=true;controls.dampingFactor=.1;controls.minDistance=8;controls.maxDistance=2900;controls.maxPolarAngle=Math.PI*.455;controls.minPolarAngle=.08;controls.panSpeed=.6;
 canvas.tabIndex=0;controls.listenToKeyEvents(canvas);
 const hemi=new T.HemisphereLight('#e5f3ff','#637553',1.8);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff3d9',3.0);sun.position.set(-108,155,114);sun.target.position.set(0,0,22);sun.castShadow=true;sun.shadow.mapSize.set(mobile?1024:2048,mobile?1024:2048);Object.assign(sun.shadow.camera,{left:-125,right:125,top:125,bottom:-125,near:5,far:650});sun.shadow.normalBias=.065;sun.shadow.bias=-.00006;sun.shadow.radius=3;scene.add(sun,sun.target);
 const ground=new T.Mesh(new T.PlaneGeometry(2800,2800),new T.MeshStandardMaterial({color:'#a5b8a0',roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.y=-2.2;ground.receiveShadow=true;scene.add(ground);
 const models=new Map();let activeRegion=region,activeView='overview',current=null,frameId=0,tween=null,disposed=false,evening=false,contextUnavailable=false,pending=null,generation=0;
 function updateClipping(){const distance=camera.position.distanceTo(controls.target);const near=Math.max(.1,Math.min(distance*.04,camera.position.y*.25));const far=Math.max(800,distance+1100);if(Math.abs(camera.near-near)>.01||Math.abs(camera.far-far)>1){camera.near=near;camera.far=far;camera.updateProjectionMatrix();}}
 function requestRender(){if(!disposed&&!contextUnavailable&&!document.hidden&&!frameId)frameId=requestAnimationFrame(draw);}
 function draw(time){frameId=0;if(disposed||contextUnavailable)return;const start=performance.now();if(tween){const t=Math.min(1,(time-tween.start)/tween.duration),e=t*t*(3-2*t);camera.position.lerpVectors(tween.from,tween.to,e);controls.target.lerpVectors(tween.targetFrom,tween.targetTo,e);if(t===1)tween=null;else requestRender();}controls.update();updateClipping();renderer.render(scene,camera);onFrame({camera,region:activeRegion});Object.assign(canvas.dataset,{state:'ready',region:activeRegion,drawCalls:String(renderer.info.render.calls),triangles:String(renderer.info.render.triangles),lastRenderMs:(performance.now()-start).toFixed(1)});}
 function setView(view='overview',instant=false){activeView=VIEWS[activeRegion]?.[view]?view:'overview';const {position:to,target:targetTo}=fitView(VIEWS[activeRegion][activeView],camera.aspect,camera.fov);const distance=to.distanceTo(targetTo);scene.fog.near=Math.max(activeRegion==='whole'?900:230,distance*1.35);scene.fog.far=scene.fog.near*2.2;if(instant||reduced){camera.position.copy(to);controls.target.copy(targetTo);tween=null;}else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo,start:performance.now(),duration:900};requestRender();}
 function lightModel(model){for(const m of model.materials){if(m.name==='lamp_glass'){m.emissive.set('#efcf87');m.emissiveIntensity=evening?.8:.04;}}}
 function activate(value,model,instant){for(const m of models.values())m.root.visible=false;current=model;activeRegion=value;current.root.visible=true;lightModel(model);models.delete(value);models.set(value,model);while(models.size>(mobile?1:2)){const [key,old]=models.entries().next().value;scene.remove(old.root);old.dispose();models.delete(key);}const a=value==='whole'?340:125;Object.assign(sun.shadow.camera,{left:-a,right:a,top:a,bottom:-a});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;scene.fog.near=value==='whole'?1000:300;scene.fog.far=value==='whole'?2600:1700;setView('overview',instant);canvas.dataset.state='ready';if(!contextUnavailable)onReady({region:value});requestRender();}
 async function setRegion(value,instant=false){if(disposed||!REGIONS.includes(value))return;if(pending?.region===value)return pending.promise;
  const token=++generation;pending?.controller.abort();pending=null;const model=models.get(value);if(model){activate(value,model,instant);return;}
  canvas.dataset.state='loading';const controller=new AbortController();onProgress({region:value,progress:0});
  const promise=loadCampusGLB(new URL('./models/lingchuan-'+value+(typeof DecompressionStream==='undefined'?'.glb':'.glb.gz')+'?v=20260906-academic-join',import.meta.url),{signal:controller.signal,onProgress:p=>{if(token===generation)onProgress({...p,region:value});}}).then(asset=>{if(disposed||token!==generation){asset.dispose();return;}asset.root.visible=false;scene.add(asset.root);asset.root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms)if(m.map)m.map.anisotropy=Math.min(mobile?2:4,renderer.capabilities.getMaxAnisotropy());}});models.set(value,asset);activate(value,asset,instant);}).catch(error=>{if(error.name==='AbortError'||token!==generation||disposed)return;canvas.dataset.state='error';onError(Object.assign(new Error('模型加载中断，请检查网络后重试。'),{code:'LOAD_FAILED',cause:error}));}).finally(()=>{if(token===generation)pending=null;});
  pending={region:value,promise,controller};return promise;
 }
 function setLighting(mode){evening=mode==='evening';sun.color.set(evening?'#ffd5a6':'#fff3d9');sun.intensity=evening?2.45:3;sun.position.set(evening?-165:-108,evening?83:155,114);hemi.intensity=evening?1.45:1.8;scene.background.set(evening?'#d6dbd2':'#d1dfd9');scene.fog.color.copy(scene.background);for(const model of models.values())lightModel(model);renderer.shadowMap.needsUpdate=true;requestRender();}
 let sized=false;
 function resize(){const {width,height}=canvas.parentElement.getBoundingClientRect();if(width<1||height<1)return;renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();if(!sized){sized=true;setView(activeView,true);}else requestRender();}
 const resizeObs=new ResizeObserver(resize);resizeObs.observe(canvas.parentElement);controls.addEventListener('change',requestRender);controls.addEventListener('start',()=>{tween=null;});
 const visibility=()=>{if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else requestRender();};document.addEventListener('visibilitychange',visibility);
 const contextLost=e=>{e.preventDefault();contextUnavailable=true;cancelAnimationFrame(frameId);frameId=0;onError(Object.assign(new Error('三维画面暂时暂停，正在等待恢复。'),{code:'CONTEXT_LOST'}));};
 const contextRestored=()=>{contextUnavailable=false;refreshEnvironment();renderer.shadowMap.needsUpdate=true;requestRender();if(current&&!pending)onReady({region:activeRegion});};canvas.addEventListener('webglcontextlost',contextLost);canvas.addEventListener('webglcontextrestored',contextRestored);
 resize();setRegion(region,true);
 return {setRegion,setView,setLighting,focus(point,size=[55,22,55],direction=[.35,.7,1]){if(activeRegion!=='whole')return;const {position:to,target:targetTo}=fitView([point,size,direction],camera.aspect,camera.fov);scene.fog.near=500;scene.fog.far=1800;if(reduced){camera.position.copy(to);controls.target.copy(targetTo);tween=null;}else tween={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo,start:performance.now(),duration:700};requestRender();},north(){const distance=camera.position.distanceTo(controls.target),height=camera.position.y-controls.target.y;camera.position.set(controls.target.x,controls.target.y+height,controls.target.z+Math.sqrt(Math.max(1,distance*distance-height*height)));tween=null;requestRender();},zoom(factor){const offset=camera.position.clone().sub(controls.target);offset.setLength(T.MathUtils.clamp(offset.length()*factor,controls.minDistance,controls.maxDistance));camera.position.copy(controls.target).add(offset);tween=null;requestRender();},setShadows(enabled){renderer.shadowMap.enabled=enabled;renderer.shadowMap.needsUpdate=true;scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});requestRender();},render:requestRender,getStats:()=>({drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,cachedRegions:[...models.keys()]}),dispose(){if(disposed)return;disposed=true;++generation;pending?.controller.abort();cancelAnimationFrame(frameId);resizeObs.disconnect();controls.dispose();document.removeEventListener('visibilitychange',visibility);canvas.removeEventListener('webglcontextlost',contextLost);canvas.removeEventListener('webglcontextrestored',contextRestored);for(const model of models.values()){scene.remove(model.root);model.dispose();}models.clear();ground.geometry.dispose();ground.material.dispose();environmentTarget?.dispose();renderer.dispose();}};
}
