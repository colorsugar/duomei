// Direct relative import: workers do not inherit the page import map.
import {parkBuildingOwner} from './building-ownership.js';
import * as THREE from '../vendor/three/three.module.js';
export function buildSectorBuffers(data) {
  const buckets={water:[],green:[],road:[],building:[]};
  const shape=p=>{
    const s=new THREE.Shape(p.o.map(([x,z])=>new THREE.Vector2(x,-z)));
    for(const ring of p.h||[])s.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));return s;
  };
  const flat=(p,y)=>{const g=new THREE.ShapeGeometry(shape(p));g.rotateX(-Math.PI/2);g.translate(0,y,0);return g;};
  for(const p of data.water)buckets.water.push(flat(p,.3));
  for(const p of data.green)buckets.green.push(flat(p,.22));
  for(const p of data.buildings){if(parkBuildingOwner(p.o))continue;const g=new THREE.ExtrudeGeometry(shape(p),{depth:p.height??12,bevelEnabled:false,steps:1,curveSegments:1});g.rotateX(-Math.PI/2);buckets.building.push(g);}
  for(const {p,w,bridge} of data.roads){
    const pos=[],ix=[];
    p.forEach(([x,z],i)=>{const a=p[Math.max(0,i-1)],b=p[Math.min(p.length-1,i+1)],d=Math.hypot(b[0]-a[0],b[1]-a[1])||1,nx=-(b[1]-a[1])/d,nz=(b[0]-a[0])/d;
      pos.push(x+nx*w/2,bridge?1.2:.62,z+nz*w/2,x-nx*w/2,bridge?1.2:.62,z-nz*w/2);if(i){const k=i*2;ix.push(k-2,k,k-1,k-1,k,k+1);}});
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();buckets.road.push(g);
  }
  const result={};
  for(const [kind,geos] of Object.entries(buckets)) {
    let size=0;const parts=[];
    for(let g of geos){if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}size+=g.attributes.position.array.length;parts.push(g);}
    const position=new Float32Array(size),normal=new Float32Array(size),uv=new Float32Array(size/3*2);let off=0;
    for(const g of parts){position.set(g.attributes.position.array,off);normal.set(g.attributes.normal.array,off);off+=g.attributes.position.array.length;g.dispose();}
    for(let i=0;i<size/3;i++){uv[i*2]=position[i*3]/20;uv[i*2+1]=position[i*3+2]/20;}
    if(kind==='building'){
      const color=new Float32Array(size);for(let i=0;i<size/3;i++){
        uv[i*2]=(Math.abs(normal[i*3])>.5?position[i*3+2]:position[i*3])/9;uv[i*2+1]=position[i*3+1]/6.4;
        const roof=normal[i*3+1]>.5;const c=new THREE.Color(roof?0x7a817f:0xc8c6bd);color.set([c.r,c.g,c.b],i*3);
      }result[kind]={position,normal,uv,color};
    }else result[kind]={position,normal,uv};
  }
  return result;
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=async({data:{id}})=>{
  try {
    if(!['qixing','chuanshan','xishan','yushan'].includes(id))throw Error('Unknown map sector');
    const response=await fetch(new URL('../data/sectors/'+id+'.json',import.meta.url));if(!response.ok)throw Error('Sector HTTP '+response.status);
    const buffers=buildSectorBuffers(await response.json());self.postMessage({id,buffers},Object.values(buffers).flatMap(b=>Object.values(b).map(a=>a.buffer)));
  }catch(e){self.postMessage({id,error:e.message});}
};
