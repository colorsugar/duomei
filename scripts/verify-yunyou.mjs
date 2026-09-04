// Meaningful geometry checks, independent of WebGL. Does not claim GPU/FPS QA.
// node --loader ./scripts/yunyou-node-loader.mjs scripts/verify-yunyou.mjs
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { FOOT, WATER } from '../public/yunyou/data/geo.js';
import { LANDMARKS } from '../public/yunyou/data/landmarks.js';
import { DETAIL } from '../public/yunyou/src/detail/index.js';
import { mergeStatic } from '../public/yunyou/src/mesh-utils.js';
import { XBS, makeMaterials } from '../public/yunyou/src/landmarks.js';
import { pointInRing, TEX } from '../public/yunyou/src/lib.js';
import { createStreetDistrict } from '../public/yunyou/src/street-district.js';
import { createWalkableSpace } from '../public/yunyou/src/street-walk.js';
import { createLeafyTrees } from '../public/yunyou/src/foliage.js';
import { createCityMaterial } from '../public/yunyou/src/city-material.js';
import { createHeritageStreets } from '../public/yunyou/src/heritage-streets.js';
import { createCruises, createWaterfront } from '../public/yunyou/src/waterfront.js';
// Canvas operations create texture data only; geometry/math is real vendored Three.
const ctx = new Proxy({}, { get: (_t,k) => k==='measureText'?()=>({width:100}):k==='createLinearGradient'?()=>({addColorStop(){}}):()=>{}, set:()=>true });
globalThis.document = { createElement: () => ({ width:1,height:1,getContext:()=>ctx }) };
for(const key of ['stone','tile','copper','glaze','brick','karst','ground','grass','water','leafColor','leafAlpha','leafNormal']) TEX[key]=new THREE.Texture();
const M=makeMaterials();
function checkObject(obj,name){let tris=0,meshes=0;obj.updateMatrixWorld(true);obj.traverse(o=>{
 if(!o.isMesh)return;meshes++;const g=o.geometry;assert(g.attributes.position, name+' positions');
 for(const attr of Object.values(g.attributes))for(const v of attr.array)assert(Number.isFinite(v),name+' nonfinite geometry');
 if(g.index)for(const v of g.index.array)assert(v<g.attributes.position.count,name+' invalid index');
 const count=o.isInstancedMesh?o.count:1;tris+=(g.index?.count||g.attributes.position.count)/3*count;
});assert(meshes>0,name+' missing');return {name,meshes,triangles:Math.round(tris)};}
const stats=[];
for(const lm of LANDMARKS){if(!DETAIL[lm.id])continue;const mod=await DETAIL[lm.id]();const obj=mod.build({F:FOOT,TEX,lm,M});mergeStatic(obj);stats.push(checkObject(obj,lm.id));mod.night?.(obj,true);mod.night?.(obj,false);
 if(['rita','yueta','mulongta','shelita','xiaoyaolou'].includes(lm.id)){const box=new THREE.Box3().setFromObject(obj);assert(Math.abs(box.max.y-box.min.y-lm.h)<.03,lm.id+' height');}
}
const heritage=createHeritageStreets(TEX);stats.push(checkObject(heritage.group,'heritage streets'));heritage.setNight(1);heritage.setNight(0);
const waterfront=createWaterfront(TEX);stats.push(checkObject(waterfront.group,'waterfront'));waterfront.setNight(1);waterfront.setNight(0);
const boats=createCruises();stats.push(checkObject(boats.group,'boats'));
const inWater=(x,z)=>WATER.some(w=>pointInRing(x,z,w.o)&&!w.h.some(h=>pointInRing(x,z,h)));
for(let t=0;t<680;t++){boats.update(1);for(const ship of boats.group.children){const {x,z}=ship.position;assert(inWater(x,z),'boat leaves river');}}
const district=createStreetDistrict();stats.push({...checkObject(district.group,'downtown streets'),buildings:district.count});assert(district.count>30,'street frontage missing');district.setNight(1);district.setNight(0);
const walking=createWalkableSpace(district.collision);
for(const [x,z] of [[1,529],[378,187],[-200,1450],[67,95]]){const start=walking.nearest(x,z);assert(start&&walking.allowed(start.x,start.z),'walk spawn obstructed');}
for(const b of district.collision)assert(!walking.allowed(b.o.reduce((a,p)=>a+p[0],0)/4,b.o.reduce((a,p)=>a+p[1],0)/4),'building collision absent');
stats.push(checkObject(createLeafyTrees([[0,0,1,4],[15,5,1,5]],TEX),'photographed foliage'));createCityMaterial();
// Restore the former silhouette and verify its north-south water-moon opening.
for(let z=1350;z<=1510;z++)assert(XBS.sdf(-148,6.5,z)>0,'blocked cave');
assert(XBS.sdf(-128,10,1388)<0,'trunk disconnected');assert(XBS.sdf(-148,30,1392)<0,'vault missing');
const bytes=await readFile(new URL('../public/yunyou/assets/models/xiangbishan.bin',import.meta.url));
const n=bytes.readUInt32LE(4),ni=bytes.readUInt32LE(8);assert.equal(bytes.readUInt32LE(0),0x47554c31);assert.equal(bytes.length,36+n*12+ni*4);
for(let i=0;i<ni;i++)assert(bytes.readUInt32LE(36+n*12+i*4)<n,'baked index');
// Ray through actual baked mesh verifies the geometric opening, not just SDF intent.
const b=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),bounds=new Float32Array(b,12,6),q=new Uint16Array(b,36,n*3),p=new Float32Array(n*3);
for(let i=0;i<p.length;i++)p[i]=bounds[i%3]+q[i]/65535*bounds[3+i%3];
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(p,3));geo.setIndex(new THREE.BufferAttribute(new Uint32Array(b,36+n*12,ni),1));
const mesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.updateMatrixWorld();
const ray=new THREE.Raycaster(new THREE.Vector3(-148,6.5,1300),new THREE.Vector3(0,0,1));assert.equal(ray.intersectObject(mesh).length,0,'baked cave blocked');
console.log(JSON.stringify({passed:true,modelBytes:bytes.length,stats},null,2));
