// Exercises the vendored OrbitControls and production gesture guard together.
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { OrbitControls } from '../public/yunyou/vendor/three/addons/controls/OrbitControls.js';
import { installMapGestures } from '../public/yunyou/src/map-gestures.js';
class Emitter {
  constructor(){this.listeners=new Map();this.style={};this.clientWidth=390;this.clientHeight=844;}
  addEventListener(type,fn,options){const a=this.listeners.get(type)??[];a.push({fn,capture:options===true||!!options?.capture});this.listeners.set(type,a);}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)??[]).filter(x=>x.fn!==fn));}
  dispatchEvent(e){e.preventDefault??=()=>{};e.stopImmediatePropagation=()=>e.stopped=true;for(const x of [...(this.listeners.get(e.type)??[])].sort((a,b)=>Number(b.capture)-Number(a.capture))){x.fn(e);if(e.stopped)break;}return true;}
  getRootNode(){return this;}setPointerCapture(){}releasePointerCapture(){}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:844};}
}
const canvas=new Emitter(),host=new Emitter();host.PointerEvent=class{constructor(type,props){Object.assign(this,{type},props);}};
const camera=new THREE.PerspectiveCamera(48,390/844,1,30000);camera.position.set(0,80,160);
const controls=new OrbitControls(camera,canvas),guard=installMapGestures(controls,canvas,host);
controls.minDistance=25;controls.maxDistance=12000;controls.update();
const send=(type,id,x,y)=>canvas.dispatchEvent({type,pointerId:id,pointerType:'touch',clientX:x,clientY:y,pageX:x,pageY:y,button:0});
const finite=()=>assert([...camera.position,...camera.quaternion,...controls.target].every(Number.isFinite));
send('pointerdown',1,140,400);send('pointerdown',2,240,400);
const angle=camera.quaternion.clone(),before=controls.getDistance();
send('pointermove',1,120,400);send('pointermove',2,260,400);
assert(controls.getDistance()<before,'spreading fingers must zoom in');
assert(camera.quaternion.angleTo(angle)<1e-6,'pinch unexpectedly rotates');
assert(Math.abs(controls.getDistance()/before-Math.pow(1/1.4,.55))<1e-6,'pinch must use a continuous, reduced ratio');
send('pointermove',1,140,420);send('pointermove',2,280,420);
assert(camera.quaternion.angleTo(angle)<1e-6,'two-finger translation rotates');
send('pointerup',2,280,420);const still=camera.position.clone();send('pointermove',1,190,480);
assert(camera.position.distanceTo(still)<1e-8,'remaining finger rotated after pinch');
send('pointerup',1,190,480);send('pointerdown',3,190,480);send('pointermove',3,240,480);
assert(camera.quaternion.angleTo(angle)>.01,'fresh single finger cannot rotate');
send('pointercancel',3,240,480);
send('pointerdown',4,150,400);send('pointerdown',5,250,400);send('pointercancel',5,250,400);
const cancelled=camera.position.clone();send('pointermove',4,100,420);assert(camera.position.distanceTo(cancelled)<1e-8);
send('pointerup',4,100,420);
send('pointerdown',6,190,400);send('pointerdown',7,190,400);send('pointermove',7,230,400);finite();host.dispatchEvent({type:'blur'});
assert.equal(guard.active,false);assert.equal(controls._pointers.length,0);
send('pointerdown',8,190,400);send('pointerdown',9,250,400);send('lostpointercapture',8,190,400);send('pointerup',9,250,400);finite();
send('pointerdown',10,140,400);send('pointerdown',11,240,400);send('pointerdown',12,300,400);send('pointerup',12,300,400);send('pointermove',11,270,400);finite();host.dispatchEvent({type:'blur'});
const wheelBefore=controls.getDistance();canvas.dispatchEvent({type:'wheel',deltaY:-100,deltaMode:0,clientX:190,clientY:400});assert(controls.getDistance()<wheelBefore);finite();
guard.dispose();controls.dispose();
console.log('PASS: pinch direction/ratio, no rotation, two-finger pan, lift latch, fresh drag, cancel, capture loss, blur, coincident/extra contacts, wheel.');
