import * as THREE from 'three';
import {DetailStream} from './detail-stream.js';
import {SECTORS} from '../data/city-places.js';
import {ORIGIN} from '../data/geo.js';
export function createSectorStream({scene,materials,invalidate,paused,mobile,visibility=()=>({})}) {
 let worker=null,pending=null;
 const boxes=SECTORS.map(s=>({...s,x0:(s.bbox[0]-ORIGIN.lon)*ORIGIN.mPerLon,x1:(s.bbox[2]-ORIGIN.lon)*ORIGIN.mPerLon,z0:-(s.bbox[3]-ORIGIN.lat)*ORIGIN.mPerLat,z1:-(s.bbox[1]-ORIGIN.lat)*ORIGIN.mPerLat}));
 function fail(error){if(pending){clearTimeout(pending.timer);pending.reject(error);pending=null;}worker?.terminate();worker=null;}
 function getBuffers(id){
  if(typeof Worker==='undefined')return import('./sector-worker.js').then(async m=>{const r=await fetch(new URL('../data/sectors/'+id+'.json',import.meta.url));if(!r.ok)throw Error('Sector HTTP '+r.status);return m.buildSectorBuffers(await r.json());});
  return new Promise((resolve,reject)=>{
   if(!worker){worker=new Worker(new URL('./sector-worker.js',import.meta.url),{type:'module'});
    worker.onerror=e=>fail(Error(e.message||'Map worker failed'));
    worker.onmessage=({data})=>{if(!pending||data.id!==pending.id)return;const p=pending;clearTimeout(p.timer);pending=null;data.error?p.reject(Error(data.error)):p.resolve(data.buffers);};}
   pending={id,resolve,reject,timer:setTimeout(()=>fail(Error('Map sector timed out')),20000)};worker.postMessage({id});
  });
 }
 const stream=new DetailStream({limit:mobile()?2:3,paused,load:async(id,wanted)=>{
   const buffers=await getBuffers(id);if(!wanted())return null;
   const g=new THREE.Group();g.name='sector-'+id;
   for(const [kind,attrs] of Object.entries(buffers))if(attrs.position.length){const geo=new THREE.BufferGeometry();for(const [name,array] of Object.entries(attrs))geo.setAttribute(name,new THREE.BufferAttribute(array,name==='uv'?2:3));geo.computeBoundingSphere();const m=new THREE.Mesh(geo,materials[kind]);m.receiveShadow=true;m.name=kind;m.visible=visibility()[kind]!==false;g.add(m);}
   scene.add(g);invalidate(true);return g;
  },dispose:(_id,g)=>{g.removeFromParent();g.traverse(o=>o.geometry?.dispose());invalidate(true);}});
 return {stream,update(camera,active){
  stream.limit=mobile()?2:3;
  const near=boxes.map(b=>({id:b.id,d:Math.hypot(Math.max(b.x0-camera.position.x,0,camera.position.x-b.x1),Math.max(b.z0-camera.position.z,0,camera.position.z-b.z1),camera.position.y*.65)}))
   .filter(b=>b.d<(mobile()?1450:2000)).sort((a,b)=>(a.id===active?.region?-1e4:a.d)-(b.id===active?.region?-1e4:b.d)).slice(0,mobile()?2:3).map(b=>b.id);
  stream.update(near);
  for(const e of stream.cache.values())for(const m of e.value.children){const v=visibility()[m.name]!==false;if(m.visible!==v){m.visible=v;invalidate(true);}}
  for(const [id,e] of stream.cache){const visible=near.includes(id);if(e.value.visible!==visible){e.value.visible=visible;invalidate(true);}}
 }};
}
