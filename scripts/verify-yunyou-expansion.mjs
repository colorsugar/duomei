import assert from 'node:assert/strict';
import {readFile,stat} from 'node:fs/promises';
import * as THREE from 'three';
import {CITY_PLACES,SECTORS} from '../public/yunyou/data/city-places.js';
import {LANDMARKS} from '../public/yunyou/data/landmarks.js';
import {EXPANSION} from '../public/yunyou/data/expansion.js';
import {BOUNDS,ORIGIN} from '../public/yunyou/data/geo.js';
import {TEX} from '../public/yunyou/src/lib.js';
import {makeMaterials} from '../public/yunyou/src/landmarks.js';
import {createExpandedModels} from '../public/yunyou/src/expanded-landmarks.js';
import {buildSectorBuffers} from '../public/yunyou/src/sector-worker.js';
import {mergeStatic} from '../public/yunyou/src/mesh-utils.js';
for(const key of ['stone','tile','copper','glaze','brick','karst','ground','grass','water'])TEX[key]=new THREE.Texture();
const models=createExpandedModels(makeMaterials());let triangles=0;
for(const lm of CITY_PLACES){const g=models[lm.id];mergeStatic(g);g.updateMatrixWorld(true);assert(g.children.length>0,lm.id+' missing');const box=new THREE.Box3().setFromObject(g);const x=(lm.lon-ORIGIN.lon)*ORIGIN.mPerLon,z=-(lm.lat-ORIGIN.lat)*ORIGIN.mPerLat;
 assert(box.min.x<x+150&&box.max.x>x-150&&box.min.z<z+150&&box.max.z>z-150,lm.id+' misplaced');
 g.traverse(o=>{if(!o.isMesh)return;for(const a of Object.values(o.geometry.attributes))for(const v of a.array)assert(Number.isFinite(v),lm.id+' NaN');triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);});}
assert(triangles<180000,'overview geometry budget exceeded');
// Each bridge opening must remain open through the actual extruded mesh.
const bridge=models.huaqiao,[a,b]=EXPANSION.huaqiao,L=Math.hypot(b[0]-a[0],b[1]-a[1]);
for(let i=0;i<4;i++){const origin=bridge.localToWorld(new THREE.Vector3(-L/2+L/4*(i+.5),2,-10)),direction=new THREE.Vector3(0,0,1).transformDirection(bridge.matrixWorld);const ray=new THREE.Raycaster(origin,direction,0,20);assert.equal(ray.intersectObject(bridge,true).length,0,'bridge arch filled');}
const counts={};
for(const sector of SECTORS){const data=JSON.parse(await readFile(new URL('../public/yunyou/data/sectors/'+sector.id+'.json',import.meta.url)));for(const b of data.buildings){assert(Array.isArray(b.h),'polygon holes overwritten by height');assert(b.height>0);}
 const buffers=buildSectorBuffers(data);let n=0;
 for(const attrs of Object.values(buffers)){assert.equal(attrs.position.length,attrs.normal.length);for(const v of attrs.position)assert(Number.isFinite(v));assert.equal(attrs.uv.length,attrs.position.length/3*2);n+=attrs.position.length/9;}
 assert(n>0&&n<150000,'sector budget');counts[sector.id]=Math.round(n);
}
assert.equal(new Set(LANDMARKS.map(l=>l.id)).size,37);
for(const lm of LANDMARKS){assert(lm.photo?.source?.startsWith('https://'),lm.id+' source missing');assert(lm.photo.caption,lm.id+' caption missing');const p=new URL('../public/yunyou/'+lm.photo.src.replace(/^\.\//,''),import.meta.url);assert((await stat(p)).size>1000,lm.id+' photo empty');}
console.log(JSON.stringify({passed:true,places:LANDMARKS.length,overviewTriangles:Math.round(triangles),sectors:counts,photos:37}));
