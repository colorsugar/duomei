import * as THREE from 'three';
import {PARK_BUILDINGS} from './building-ownership.js';
import {extrudeRing} from './lib.js';
import {mergeStatic} from './mesh-utils.js';
// A park retains a low building fallback until its authored asset is resident.
// Temple fallback already belongs to expanded-landmarks and is not duplicated here.
export function createParkFallbacks(){
 const root=new THREE.Group(),regions=new Map();
 const wall=new THREE.MeshStandardMaterial({color:0xc9c5b8,roughness:.94});
 const roof=new THREE.MeshStandardMaterial({color:0x555e5c,roughness:.92});
 for(const b of PARK_BUILDINGS){
  if(b.name==='栖霞寺')continue;
  let g=regions.get(b.region);if(!g){g=new THREE.Group();regions.set(b.region,g);root.add(g);}
  const geo=extrudeRing(b.o,b.h),m=new THREE.Mesh(geo,wall);m.receiveShadow=true;g.add(m);
  const top=new THREE.Shape(b.o.map(([x,z])=>new THREE.Vector2(x,-z)));const cap=new THREE.ShapeGeometry(top);cap.rotateX(-Math.PI/2);cap.translate(0,b.h+.04,0);g.add(new THREE.Mesh(cap,roof));
 }
 for(const g of regions.values())mergeStatic(g);
 return {root,update:loaded=>{for(const [id,g] of regions)g.visible=!loaded.has(id);}};
}
