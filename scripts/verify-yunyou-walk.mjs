// Event-level navigation verification, without a browser or GPU claim.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createStreetWalk } from '../public/yunyou/src/street-walk.js';
class Element extends EventTarget {
 constructor(){super();this.dataset={};this.classList={add(){},remove(){}};this.hidden=true;}
 setAttribute(){} setPointerCapture(){} closest(){return null;}
}
const windowEvents=new EventTarget(),documentEvents=new EventTarget(),button=new Element(),pad=new Element(),canvas=new Element(),forwardButton=new Element();forwardButton.dataset.move='KeyW';pad.querySelectorAll=()=>[forwardButton];
globalThis.addEventListener=windowEvents.addEventListener.bind(windowEvents);
globalThis.document={getElementById:id=>id==='walk-toggle'?button:pad,body:new Element(),addEventListener:documentEvents.addEventListener.bind(documentEvents)};
const camera=new THREE.PerspectiveCamera();camera.position.set(50,100,500);const controls={enabled:true,autoRotate:false,target:new THREE.Vector3(1,0,529),update(){}};
let enters=0,exits=0;const walk=createStreetWalk({camera,controls,canvas,collision:[],onEnter:()=>enters++,onExit:()=>exits++,onMove(){}});
const send=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);};
const saved=camera.position.clone();walk.enter({x:1,z:529});assert(walk.active&&!controls.enabled&&!pad.hidden);assert.equal(enters,1);const start=camera.position.clone();
send(windowEvents,'keydown',{code:'KeyW'});for(let i=0;i<20;i++)walk.update(.05);assert(camera.position.distanceTo(start)>4,'keyboard walking failed');
send(windowEvents,'blur');const stopped=camera.position.clone();walk.update(.05);assert(camera.position.equals(stopped),'blur leaves stuck movement');
send(forwardButton,'pointerdown',{pointerId:7});walk.update(.05);assert(camera.position.distanceTo(stopped)>.15,'touch-pad walking failed');send(forwardButton,'pointercancel',{pointerId:7});const touchStopped=camera.position.clone();walk.update(.05);assert(camera.position.equals(touchStopped),'cancel leaves stuck movement');
const q=camera.quaternion.clone();send(canvas,'pointerdown',{pointerId:1,clientX:100,clientY:100});send(canvas,'pointermove',{pointerId:1,clientX:160,clientY:105});walk.update(0);assert(q.angleTo(camera.quaternion)>.1,'drag looking failed');send(canvas,'pointerup',{pointerId:1});
send(windowEvents,'keydown',{code:'Escape'});assert(!walk.active&&controls.enabled&&pad.hidden);assert(camera.position.equals(saved),'orbit position was not restored');assert.equal(exits,1);
console.log('PASS: keyboard, touch movement, drag looking, cancellation, blur, and return to orbit.');
