import * as THREE from 'three';
import {EXPANSION as E} from '../data/expansion.js';
import {CITY_PLACES} from '../data/city-places.js';
import {ORIGIN} from '../data/geo.js';
import {karstHill,flatRing,ringBBox,hall,pagoda,roofGeom} from './lib.js';
const at=(o,x,y,z)=>{o.position.set(x,y,z);return o;};
const xy=l=>[(l.lon-ORIGIN.lon)*ORIGIN.mPerLon,-(l.lat-ORIGIN.lat)*ORIGIN.mPerLat];
const ellipse=(x,z,rx,rz)=>Array.from({length:40},(_,i)=>[x+Math.cos(i*Math.PI/20)*rx,z+Math.sin(i*Math.PI/20)*rz]);
function hill(id,h) {
 const p=E.peaks[id],g=new THREE.Group();
 for(const a of p.areas){const bb=ringBBox(a.o),r=Math.max(bb.x1-bb.x0,bb.z1-bb.z0)*.72;
  const peaks=id==='luotuoshan'?[{x:p.x-13,z:p.z,h:h*.87,r:37,k:.3},{x:p.x+13,z:p.z,h,r:34,k:.35},{x:p.x+34,z:p.z+13,h:h*.55,r:18,k:.3}]:[{x:p.x,z:p.z,h,r,k:.45}];
  g.add(karstHill({ring:a.o,peaks,res:id==='luotuoshan'?4:12,margin:12,rough:.18,seed:id.length*17}));}
 return g;
}
export function stoneBridge(M, detailed=false) {
 const g=new THREE.Group(),[a,b]=E.huaqiao,L=Math.hypot(b[0]-a[0],b[1]-a[1]),span=L/4;
 // Real water-crossing footprint; four open arches, raised stone deck, covered walk.
 const s=new THREE.Shape();s.moveTo(-L/2,0);
 // Open-bottom cutouts belong to the outer contour, not polygon holes that
 // cross the outer edge (those triangulate into blocked arch faces).
 for(let i=0;i<4;i++){const c=-L/2+span*(i+.5),r=span*.39;s.lineTo(c-r,0);s.lineTo(c-r,1.1);s.absellipse(c,1.1,r,3.7,Math.PI,0,true);s.lineTo(c+r,0);}
 s.lineTo(L/2,0);s.lineTo(L/2,6);s.lineTo(-L/2,6);s.closePath();
 const arch=new THREE.ExtrudeGeometry(s,{depth:6,bevelEnabled:detailed,bevelThickness:.08,bevelSize:.08,bevelSegments:1,curveSegments:detailed?20:8});arch.translate(0,0,-3);g.add(new THREE.Mesh(arch,M.stone));
 for(const side of [-1,1]){g.add(at(new THREE.Mesh(new THREE.BoxGeometry(L,.18,.22),M.marble),0,7.05,side*2.85));
  for(let x=-L/2;x<=L/2;x+=detailed?2:4)g.add(at(new THREE.Mesh(new THREE.BoxGeometry(.23,1.2,.23),M.marble),x,6.55,side*2.85));}
 const roof=new THREE.Mesh(roofGeom(L,6,1.8,{ridge:L*.87,over:.7,lift:.35}),M.tile);roof.position.y=9.1;g.add(roof);
 for(let x=-L/2+2;x<L/2;x+=5)for(const z of [-2.5,2.5])g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(.15,.2,3,6),M.column),x,7.5,z));
 g.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);g.position.set((a[0]+b[0])/2,.45,(a[1]+b[1])/2);g.userData.top=11;return g;
}
function temple(M) {
 const g=new THREE.Group();
 for(const a of E.qixiasi){const bb=ringBBox(a.o),w=Math.min(38,bb.x1-bb.x0),d=Math.min(26,bb.z1-bb.z0);
  const t=hall([{w,d,h:6,roof:{h:3.5}},{w:w*.8,d:d*.8,h:3.5,roof:{h:3}}],M.hallGray,{baseH:1});g.add(at(t,(bb.x0+bb.x1)/2,0,(bb.z0+bb.z1)/2));}
 return g;
}
export function createExpandedModels(M) {
 const models={};
 for(const lm of CITY_PLACES){const [x,z]=xy(lm);let g=new THREE.Group();
  if(E.peaks[lm.id])g=hill(lm.id,lm.id==='tashan'?44:lm.h);
  if(lm.id==='huaqiao')g=stoneBridge(M);
  if(lm.id==='qixiasi')g=temple(M);
  if(['qixing','yushan'].includes(lm.id)){for(const a of E.parks[lm.id].areas)g.add(new THREE.Mesh(flatRing(a.o,a.h,.26),M.leaf));}
  if(lm.id==='yushan')g.add(karstHill({ring:E.parks.yushan.areas[0].o,peaks:[{x,z,h:50,r:180,k:.6}],res:12,margin:15,rough:.14}));
  if(lm.id==='tashan'){const t=pagoda({h:13.3,tiers:7,r0:3.2,taper:.55,balcony:false,eave:.18,mats:{body:M.brick,roof:M.brick,trim:M.pale,dark:M.dark,spire:M.brick}});g.add(at(t,x,44,z));}
  if(lm.id==='qixingyan'){
   // Entrance only. No speculative underground layout.
   const rock=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),M.stoneBox);rock.scale.set(14,9,5);g.add(at(rock,x,6,z));
   const mouth=new THREE.Shape();mouth.moveTo(-3,0);mouth.lineTo(3,0);mouth.lineTo(3,3);mouth.absarc(0,3,3,0,Math.PI);mouth.closePath();g.add(at(new THREE.Mesh(new THREE.ShapeGeometry(mouth),M.dark),x,.3,z+5.05));
  }
  if(lm.id==='guihaibeilin'){g.add(at(hall([{w:18,d:10,h:4,roof:{h:2.4}}],M.hallGray),x,0,z));
   for(let i=0;i<6;i++)g.add(at(new THREE.Mesh(new THREE.BoxGeometry(1.2,2.5,.28),M.stoneBox),x-7+i*2.7,1.25,z+10));}
  g.userData.top=lm.h||0;models[lm.id]=g;
 }
 return models;
}
