// Urban infill for blocks that OSM leaves empty. Mid-rise walk-ups with flat
// parapet roofs and a share of grey pitched roofs, aligned to the nearest street.
// Illustrative fabric only: these footprints are not surveyed buildings.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {ROADS, BUILDINGS, WATER, GREEN, FOOT} from '../data/geo.js';
import {pointInRing, ringBBox, hash} from './lib.js';
import {cityUV} from './city-material.js';
const BUCKET=60;
export function createCityFill({material,blocked=()=>false,oldTown=()=>false,taken=[],area={x0:-1150,x1:900,z0:-900,z1:1900},step=21}={}){
 const segs=new Map(),put=(k,v)=>{if(!segs.has(k))segs.set(k,[]);segs.get(k).push(v);};
 for(const [kind,w] of [['trunk',16],['primary',12],['secondary',9],['tertiary',7],['minor',5],['pedestrian',3.5],['rail',4]])for(const p of ROADS[kind]||[])for(let i=1;i<p.length;i++){
  const a=p[i-1],b=p[i],s={a,b,w};const x0=Math.floor((Math.min(a[0],b[0])-150)/BUCKET),x1=Math.floor((Math.max(a[0],b[0])+150)/BUCKET),z0=Math.floor((Math.min(a[1],b[1])-150)/BUCKET),z1=Math.floor((Math.max(a[1],b[1])+150)/BUCKET);
  for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++)put(x+':'+z,s);
 }
 // Distance and direction of the closest street, from the bucket around a point.
 const nearest=(x,z)=>{let best=Infinity,dir=0,width=0;for(const s of segs.get(Math.floor(x/BUCKET)+':'+Math.floor(z/BUCKET))||[]){const {a,b,w}=s,dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)continue;const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)),d=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)-w/2;if(d<best){best=d;dir=Math.atan2(dz,dx);width=w;}}return {d:best,dir,width};};
 const boxes=[...BUILDINGS.map(b=>Object.assign(ringBBox(b.o),{ring:b.o})),...taken];
 const grid=new Map();for(const b of boxes)for(let x=Math.floor(b.x0/BUCKET);x<=Math.floor(b.x1/BUCKET);x++)for(let z=Math.floor(b.z0/BUCKET);z<=Math.floor(b.z1/BUCKET);z++){const k=x+':'+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(b);}
 // Broad phase on boxes, narrow phase on the real outline so rotated slabs do not reserve their whole bounding square.
 const touches=(corners,ring)=>corners.some(([x,z])=>pointInRing(x,z,ring))||ring.some(([x,z])=>pointInRing(x,z,corners))||pointInRing((corners[0][0]+corners[2][0])/2,(corners[0][1]+corners[2][1])/2,ring);
 const hitBox=(bb,corners)=>{for(let x=Math.floor(bb.x0/BUCKET);x<=Math.floor(bb.x1/BUCKET);x++)for(let z=Math.floor(bb.z0/BUCKET);z<=Math.floor(bb.z1/BUCKET);z++)for(const b of grid.get(x+':'+z)||[])if(bb.x0<b.x1+3&&bb.x1>b.x0-3&&bb.z0<b.z1+3&&bb.z1>b.z0-3&&(!b.ring||touches(corners,b.ring)))return true;return false;};
 const addBox=bb=>{for(let x=Math.floor(bb.x0/BUCKET);x<=Math.floor(bb.x1/BUCKET);x++)for(let z=Math.floor(bb.z0/BUCKET);z<=Math.floor(bb.z1/BUCKET);z++){const k=x+':'+z;if(!grid.has(k))grid.set(k,[]);grid.get(k).push(bb);}};
 const inPoly=(list,x,z)=>list.some(p=>pointInRing(x,z,p.o)&&!p.h.some(h=>pointInRing(x,z,h)));
 const wet=(x,z)=>inPoly(WATER,x,z),park=(x,z)=>inPoly(GREEN,x,z);
 const cells=new Map();let count=0;
 const push=(g,cx,cz)=>{const k=Math.floor(cx/250)+':'+Math.floor(cz/250);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(g);};
 const col=new THREE.Color();
 // Wall palettes seen across central Guilin: white/cream tile, pale grey render, weathered beige, the odd pink or pale yellow.
 const WALLS=[[0xe8e4da,5],[0xd8d6ce,4],[0xcfcbc0,3],[0xe0d3bd,3],[0xc2c3bd,2],[0xe3d0c4,1],[0xe6dcb0,1],[0xb9bdb9,2]];
 const pickWall=seed=>{let r=hash(seed+'c')*WALLS.reduce((a,[,w])=>a+w,0);for(const [c,w] of WALLS){if((r-=w)<0){col.setHex(c);break;}}
  col.offsetHSL((hash(seed+'h')-.5)*.02,(hash(seed+'s')-.5)*.05,(hash(seed+'l')-.5)*.08);return col.clone();};
 const ROOF_FLAT=[0x7d807b,0x8a8b84,0x6f7470,0x94918a].map(c=>new THREE.Color(c)),TILE=new THREE.Color(0x4a5153),SHED=new THREE.Color(0x5f87a6),DARK=new THREE.Color(0x3a3e3f);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),Y=new THREE.Vector3(0,1,0),ONE=new THREE.Vector3(1,1,1);
 // Every part carries colour, facade parameters and world-space UVs so all parts merge into one draw per cell.
 const part=(g,x,y,z,ry,wall,roof,fac)=>{g.deleteAttribute('uv');g.applyMatrix4(m.compose(new THREE.Vector3(x,y,z),q.setFromAxisAngle(Y,ry),ONE));
  const n=g.attributes.normal,c=new Float32Array(n.count*3),f=new Float32Array(n.count*4);
  for(let i=0;i<n.count;i++){const v=n.getY(i)>.5?roof:wall;c.set([v.r,v.g,v.b],i*3);f.set(fac,i*4);}
  g.setAttribute('color',new THREE.BufferAttribute(c,3));g.setAttribute('facade',new THREE.BufferAttribute(f,4));cityUV(g);return g;};
 const gable=(w,d,h)=>{const s=new THREE.Shape([new THREE.Vector2(-d/2-.6,0),new THREE.Vector2(d/2+.6,0),new THREE.Vector2(0,h)]);const g=new THREE.ExtrudeGeometry(s,{depth:w+1.0,bevelEnabled:false});g.translate(0,0,-(w+1)/2);g.rotateY(Math.PI/2);return g.toNonIndexed();};
 const box=(w,h,d)=>new THREE.BoxGeometry(w,h,d).toNonIndexed();
 for(let z=area.z0;z<area.z1;z+=step)for(let x=area.x0;x<area.x1;x+=step){
  const seed=`${x}:${z}`,px=x+(hash(seed+'x')-.5)*step*.5,pz=z+(hash(seed+'z')-.5)*step*.5;
  const heritage=oldTown(px,pz),road=nearest(px,pz);if(road.d<5||(road.d>140&&!heritage))continue; // street-facing blocks only; stay off the carriageway
  if(wet(px,pz)||park(px,pz)||blocked(px,pz))continue;
  const main=road.width>=9,roll=hash(seed+'a');
  const type=heritage?'oldtown':main?(roll<.45?'slab':roll<.8?'walkup':'lshape'):(roll<.42?'oldtown':roll<.85?'walkup':'lshape');
  const w=type==='slab'?18+hash(seed+'w')*12:type==='oldtown'?8+hash(seed+'w')*7:11+hash(seed+'w')*8;
  const d=type==='slab'?12+hash(seed+'d')*5:type==='oldtown'?8+hash(seed+'d')*5:10+hash(seed+'d')*6;
  const ry=(heritage?-.15:-road.dir)+(hash(seed+'j')-.5)*.06;
  const c=Math.cos(ry),s=Math.sin(ry),corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>[px+u*c+v*s,pz-u*s+v*c]);
  if(corners.some(([cx,cz])=>wet(cx,cz)||park(cx,cz)||blocked(cx,cz)||nearest(cx,cz).d<3))continue;
  const pad=[[-w/2-3,-d/2-3],[w/2+3,-d/2-3],[w/2+3,d/2+3],[-w/2-3,d/2+3]].map(([u,v])=>[px+u*c+v*s,pz-u*s+v*c]);
  const bb=ringBBox(corners);if(hitBox(bb,pad))continue;addBox(Object.assign(bb,{ring:corners}));
  const wall=pickWall(seed),roof=ROOF_FLAT[Math.floor(hash(seed+'r')*ROOF_FLAT.length)];
  const storey=type==='oldtown'?3.3+hash(seed+'y')*.4:2.9+hash(seed+'y')*.35;
  const floors=type==='slab'?8+Math.floor(hash(seed+'f')*6):type==='oldtown'?2+Math.floor(hash(seed+'f')*3):4+Math.floor(hash(seed+'f')*4);
  const h=floors*storey+.4,bay=2.6+hash(seed+'b')*1.6,win=.45+hash(seed+'v')*.3;
  const style=(type==='walkup'&&hash(seed+'k')<.7?1:0)|((main||type==='oldtown')&&hash(seed+'p')<.8?2:0)|(type==='slab'&&hash(seed+'o')<.4?4:0)|(hash(seed+'t')<.45?8:0);
  const fac=[bay,storey,win,style],at=(u,v)=>[px+u*c+v*s,pz-u*s+v*c];
  const add=(g,u,y,v,rot=0,wl=wall,rf=roof,f=fac)=>{const [ax,az]=at(u,v);push(part(g,ax,y,az,ry+rot,wl,rf,f),px,pz);};
  if(type==='slab'){
   const podium=storey*(1+Math.floor(hash(seed+'q')*2)),pw=w+2+hash(seed+'pw')*4,pd=d+3;
   add(box(pw,podium,pd),0,podium/2,0,0,wall.clone().multiplyScalar(.9),roof,[bay,storey,.8,2]);
   add(box(w,h-podium,d),0,podium+(h-podium)/2,0);
   add(box(w+.3,.8,d+.3),0,h+.4,0);add(box(4,3,4),w*.25,h+1.5,0,0,wall,roof);
  }else if(type==='oldtown'){
   add(box(w,h,d),0,h/2,0);
   const rh=2.2+hash(seed+'rh')*1.4;add(gable(w,d,rh),0,h,0,0,TILE,TILE,[0,0,0,0]);
  }else{
   add(box(w,h,d),0,h/2,0);
   if(type==='lshape'){const w2=6+hash(seed+'w2')*5,d2=8+hash(seed+'d2')*8,h2=h-storey*Math.floor(hash(seed+'h2')*3);add(box(w2,h2,d2),w/2-w2/2,h2/2,-(d/2+d2/2-1));}
   add(box(w+.35,.75,d+.35),0,h+.37,0);
   add(box(3.2,2.6,3.6),(hash(seed+'sx')-.5)*w*.5,h+1.3,0);                                     // stair head
   if(hash(seed+'wt')<.6)add(new THREE.CylinderGeometry(.9,.9,1.8,10).toNonIndexed(),(hash(seed+'tx')-.5)*w*.6,h+.9+.4,(hash(seed+'tz')-.5)*d*.4,0,DARK,DARK,[0,0,0,0]);
   if(hash(seed+'sh')<.28){const sw=w*.45,sd=d*.5;add(box(sw,2.3,sd),-w*.2,h+1.15,d*.1,0,wall,wall);add(gable(sw,sd,1),-w*.2,h+2.3,d*.1,0,SHED,SHED,[0,0,0,0]);} // rooftop tin shed
  }
  count++;
 }
 const group=new THREE.Group();group.name='city-infill';
 for(const geos of cells.values()){const mesh=new THREE.Mesh(mergeGeometries(geos),material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);geos.forEach(g=>g.dispose());}
 group.userData.count=count; 
 return group;
}
