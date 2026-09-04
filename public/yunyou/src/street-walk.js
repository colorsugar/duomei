import * as THREE from 'three';
import { BUILDINGS, WATER, ROADS } from '../data/geo.js';
import { pointInRing, ringBBox } from './lib.js';
import { BINJIANG } from './waterfront.js';
import { ZHENGYANG } from './heritage-streets.js';

export function createWalkableSpace(extra=[]){
 const blocks=[...BUILDINGS.map(b=>({o:b.o,box:ringBBox(b.o)})),...extra];
 const allowed=(x,z)=>x>-650&&x<650&&z>100&&z<1550&&!WATER.some(w=>pointInRing(x,z,w.o)&&!w.h.some(h=>pointInRing(x,z,h)))&&!blocks.some(b=>x>b.box.x0-.4&&x<b.box.x1+.4&&z>b.box.z0-.4&&z<b.box.z1+.4&&pointInRing(x,z,b.o));
 const paths=[ZHENGYANG,BINJIANG,...ROADS.pedestrian,...ROADS.secondary,...ROADS.tertiary];
 function nearest(x,z){let best=null,dist=Infinity;for(const p of paths)for(let i=1;i<p.length;i++){const a=p[i-1],b=p[i],dx=b[0]-a[0],dz=b[1]-a[1],len=dx*dx+dz*dz;if(!len)continue;const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/len)),px=a[0]+dx*t,pz=a[1]+dz*t,d=Math.hypot(x-px,z-pz);if(d<dist&&allowed(px,pz)){dist=d;best={x:px,z:pz,yaw:Math.atan2(-dx,-dz)};}}return best;}
 return {allowed,nearest};
}
export function createStreetWalk({camera,controls,canvas,collision,onEnter,onExit,onMove}){
 const space=createWalkableSpace(collision),keys=new Set(),held=new Map(),rotation=new THREE.Euler(0,0,0,'YXZ');
 const button=document.getElementById('walk-toggle'),pad=document.getElementById('walk-pad');
 let active=false,saved=null,drag=null,yaw=0,pitch=0;
 const clear=()=>{keys.clear();held.clear();drag=null;};
 function exit(){if(!active)return;active=false;clear();camera.position.copy(saved.position);camera.quaternion.copy(saved.quaternion);camera.near=saved.near;camera.updateProjectionMatrix();controls.target.copy(saved.target);controls.enabled=true;document.body.classList.remove('walking');button.textContent='街面漫游';button.setAttribute('aria-pressed','false');pad.hidden=true;controls.update();onExit();}
 function enter(target){const start=space.nearest(target.x,target.z);if(!start)return; saved={position:camera.position.clone(),quaternion:camera.quaternion.clone(),target:controls.target.clone(),near:camera.near};active=true;controls.enabled=false;controls.autoRotate=false;camera.near=.15;camera.updateProjectionMatrix();camera.position.set(start.x,2.65,start.z);yaw=start.yaw;pitch=.015;document.body.classList.add('walking');button.textContent='返回鸟瞰';button.setAttribute('aria-pressed','true');pad.hidden=false;onEnter();update(0);}
 const editable=e=>e.target.closest?.('input,select,textarea,[contenteditable="true"]');
 addEventListener('keydown',e=>{if(!active||editable(e)||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='Escape'){exit();return;}if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code)){e.preventDefault();keys.add(e.code);}});
 addEventListener('keyup',e=>keys.delete(e.code));addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
 canvas.addEventListener('pointerdown',e=>{if(!active||drag)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!active||!drag||e.pointerId!==drag.id)return;yaw-=(e.clientX-drag.x)*.003;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-drag.y)*.003,-1.1,1.1);drag.x=e.clientX;drag.y=e.clientY;onMove();});
 const release=e=>{if(drag?.id===e.pointerId)drag=null;};for(const name of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(name,release);
 pad.querySelectorAll('button').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();held.set(e.pointerId,b.dataset.move);b.setPointerCapture(e.pointerId);});for(const name of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(name,e=>held.delete(e.pointerId));});
 function update(dt){if(!active)return false;const has=(...names)=>names.some(n=>keys.has(n)||[...held.values()].includes(n));let forward=Number(has('KeyW','ArrowUp'))-Number(has('KeyS','ArrowDown')),side=Number(has('KeyD','ArrowRight'))-Number(has('KeyA','ArrowLeft'));const len=Math.hypot(forward,side)||1,speed=(has('ShiftLeft','ShiftRight')?8:4.5)*Math.min(dt,.05)/len;
 const dx=(-Math.sin(yaw)*forward+Math.cos(yaw)*side)*speed,dz=(-Math.cos(yaw)*forward-Math.sin(yaw)*side)*speed,p=camera.position;
 if(space.allowed(p.x+dx,p.z))p.x+=dx;if(space.allowed(p.x,p.z+dz))p.z+=dz;rotation.set(pitch,yaw,0);camera.quaternion.setFromEuler(rotation);controls.target.copy(p).add(new THREE.Vector3(0,0,-25).applyQuaternion(camera.quaternion));if(forward||side)onMove();return !!(forward||side||drag);}
 return {get active(){return active;},enter,exit,update,button};
}
