// Continuous street frontage along the retained road network. Infill buildings
// represent Guilin's urban fabric; unrecorded individual shop footprints are not surveyed.
import * as THREE from 'three';
import { ROADS, BUILDINGS, WATER, FOOT } from '../data/geo.js';
import { pointInRing, ringBBox, hash } from './lib.js';
import { BINJIANG, ribbonGeometry } from './waterfront.js';
import { ZHENGYANG } from './heritage-streets.js';
import { mergeStatic } from './mesh-utils.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export function createStreetDistrict(){
 const root=new THREE.Group(),cells=new Map(),collision=[],night=[];
 const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.82,...extra});
 const walls=[mat(0xe4dfd3),mat(0xc8c9c2),mat(0xb9c1c0),mat(0xd0c7b8),mat(0xb9b5a9)],frame=mat(0xe5e4da),base=mat(0x95998f),roof=mat(0x555e5b),dark=mat(0x30424b,{roughness:.3,metalness:.22}),metal=mat(0x444c4b,{metalness:.55}),wood=mat(0x554231),paving=mat(0xc7c3b8),white=mat(0xdadcd4),yellow=mat(0xd4b75f),warm=mat(0xf1d09a,{emissive:0xffcf89,emissiveIntensity:0});night.push([warm,1.7],[dark,.3]);dark.emissive.setHex(0xffd38e);
 const signs=['桂林米粉','茶','书屋','山水小店'].map((word,i)=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d');g.fillStyle=['#3e493f','#63563f','#5e4135','#3a5051'][i];g.fillRect(0,0,512,128);g.fillStyle='#e4d6b5';g.font='bold 66px serif';g.textAlign='center';g.textBaseline='middle';g.fillText(word,256,65);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return mat(0xffffff,{map:t});});
 const cell=(x,z)=>{const key=Math.floor(x/180)+':'+Math.floor(z/180);if(!cells.has(key)){const g=new THREE.Group();cells.set(key,g);root.add(g);}return cells.get(key);};
 const add=(parent,g,m,x=0,y=0,z=0,ry=0)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.rotation.y=ry;parent.add(o);return o;};
 const box=(g,w,h,d,m,x,y,z,ry=0)=>add(g,new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
 const existing=BUILDINGS.map(b=>ringBBox(b.o));
 const isWater=(x,z)=>WATER.some(w=>pointInRing(x,z,w.o)&&!w.h.some(h=>pointInRing(x,z,h)));
 const core=(x,z)=>x>-530&&x<375&&z>150&&z<1280;
 const segments=[];
 for(const [kind,w] of [['primary',12],['secondary',9],['tertiary',7],['minor',5]])for(const p of ROADS[kind])for(let i=1;i<p.length;i++)segments.push({a:p[i-1],b:p[i],w,kind});
 for(const p of [ZHENGYANG])for(let i=1;i<p.length;i++)segments.push({a:p[i-1],b:p[i],w:12,kind:'walk'});
 for(let i=1;i<BINJIANG.length;i++)segments.push({a:BINJIANG[i-1],b:BINJIANG[i],w:10,kind:'river'});
 const nearRoad=(x,z)=>segments.some(({a,b,w})=>{const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;if(!l)return false;const t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l));return Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz)<w/2+1;});
 const reserved=(x,z)=>pointInRing(x,z,FOOT.wangcheng.o)||Math.hypot(x-378,z-187)<45||(x>40&&x<360&&z>105&&z<246)||Math.hypot(x-1,z-529)<9||Math.hypot(x+198,z-1450)<105;
 const overlaps=(a,b)=>a.x0<b.x1+2&&a.x1>b.x0-2&&a.z0<b.z1+2&&a.z1>b.z0-2;
 let count=0;
 for(const [si,{a,b,w,kind}] of segments.entries()){
  const dx=b[0]-a[0],dz=b[1]-a[1],L=Math.hypot(dx,dz);if(L<15)continue;const tx=dx/L,tz=dz/L,nx=-tz,nz=tx,ry=Math.atan2(-tz,tx);
  if(core((a[0]+b[0])/2,(a[1]+b[1])/2)&&kind!=='river'){
   const g=cell(a[0],a[1]);
   for(const side of [-1,1]){const path=[[a[0]+nx*(w/2+1.7)*side,a[1]+nz*(w/2+1.7)*side],[b[0]+nx*(w/2+1.7)*side,b[1]+nz*(w/2+1.7)*side]];add(g,ribbonGeometry(path,3.1,.90),paving);add(g,ribbonGeometry(path,.14,.93),base);}
   if(kind!=='walk')for(let t=5;t<L;t+=10)box(g,3,.02,.12,white,a[0]+tx*t,.73,a[1]+tz*t,ry);
  }
  for(let t=12;t<L-10;t+=19.5)for(const side of [-1,1]){
   const seed=si*997+Math.round(t)*13+(side+1),depth=9+hash(seed+'d')*5,width=14+hash(seed+'w')*3,off=w/2+3+depth/2,x=a[0]+tx*t+nx*off*side,z=a[1]+tz*t+nz*off*side;
   if(!core(x,z)||reserved(x,z)||isWater(x,z))continue;
   const localCorners=[[-width/2,-depth/2],[width/2,-depth/2],[width/2,depth/2],[-width/2,depth/2]].map(([u,v])=>[x+tx*u+nx*v,z+tz*u+nz*v]);
   if(localCorners.some(([x,z])=>isWater(x,z)||nearRoad(x,z)||reserved(x,z)))continue;
   const bb=ringBBox(localCorners);if(existing.some(b=>overlaps(bb,b))||collision.some(b=>overlaps(bb,b.box)))continue;
   collision.push({o:localCorners,box:bb});const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=ry;cell(x,z).add(g);
   const floors=kind==='river'?2:2+Math.floor(hash(seed+'h')*3),h=floors*3.3+.6,wall=walls[Math.floor(hash(seed+'c')*walls.length)],front=-side*depth/2;
   box(g,width,h,depth,wall,0,h/2,0);box(g,width+.3,.5,depth+.3,base,0,.3,0);box(g,width+.7,.3,depth+.7,frame,0,h,0);
   box(g,width-.3,.22,depth-.3,roof,0,h+.18,0);
   for(const s of [-1,1]){box(g,.24,.7,depth+.35,frame,s*width/2,h+.42,0);box(g,width+.35,.7,.24,frame,0,h+.42,s*depth/2);}
   // Shopfront bays with recess, mullions, signboard and a projecting canopy.
   for(let bx=-width/2+2;bx<width/2;bx+=3.4){box(g,2.75,2.5,.1,dark,bx,1.65,front-side*.04);box(g,.12,2.65,.18,frame,bx-1.42,1.65,front-side*.15);box(g,.09,2.55,.17,metal,bx,1.65,front-side*.18);}
   box(g,width-.6,.72,.20,signs[count%4],0,3.02,front-side*.2);box(g,width+.25,.13,1.1,metal,0,3.5,front-side*.35);box(g,width-.4,.06,.10,warm,0,3.42,front-side*.8);
   for(let floor=1;floor<floors;floor++){
    const y=floor*3.3+1.7;box(g,width+.14,.13,depth+.14,frame,0,floor*3.3+.35,0);
    for(const faceSide of [-1,1])for(let wx=-width/2+2;wx<width/2-1;wx+=3.5){const fz=faceSide*(depth/2+.03);
     box(g,2.1,1.95,.12,dark,wx,y,fz);box(g,2.35,.12,.32,frame,wx,y+1.02,fz);box(g,2.4,.15,.46,frame,wx,y-1.05,fz);
     for(const sx of [-1,1])box(g,.12,2,.20,frame,wx+sx*1.1,y,fz);box(g,.075,1.9,.2,frame,wx,y,fz+faceSide*.04);
     if((floor+count)%3===0&&faceSide===-side){box(g,2.7,.17,1.05,base,wx,y-1.13,fz+faceSide*.5);box(g,2.75,.06,.07,metal,wx,y-.25,fz+faceSide*.99);for(let k=-1;k<=1;k+=.4)box(g,.045,.83,.045,metal,wx+k,y-.68,fz+faceSide*.99);}
    }
   }
   // Small roof plant and condenser cases add useful scale from above.
   box(g,3.3,2.0,3.1,wall,-width*.25,h+1.1,0);box(g,3.6,.22,3.4,roof,-width*.25,h+2.2,0);
   for(let i=0;i<2;i++){box(g,.95,.7,.65,base,width*.2+i*1.4,h+.65,1);for(let line=0;line<4;line++)box(g,.8,.035,.025,metal,width*.2+i*1.4,h+.42+line*.12,1.34);}
   count++;
  }
 }
 // Street furniture and human-scale cues on the main pedestrian axis.
 for(let i=0;i<26;i++){
  const z=270+i*20,x=44-(z-237)*.145,g=cell(x,z);if(z>870)continue;
  for(const side of [-1,1]){box(g,.14,4.6,.14,metal,x+side*5.2,3,z);add(g,new THREE.SphereGeometry(.35,10,8),warm,x+side*5.2,5.45,z);box(g,1.7,.5,.7,wood,x+side*6.2,1.0,z+5);}
  if(i%3===0){const x2=x+(i%2?2:-2);add(g,new THREE.CapsuleGeometry(.19,.6,3,6),i%2?walls[2]:wood,x2,1.95,z+3);add(g,new THREE.SphereGeometry(.14,8,6),walls[3],x2,2.59,z+3);for(const side of [-1,1])box(g,.10,.7,.13,metal,x2+side*.1,1.15,z+3);}
 }
 for(const g of cells.values()){mergeStatic(g);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});}
 root.name='桂林中心连续街区';return {group:root,collision,count,setNight:t=>night.forEach(([m,k])=>m.emissiveIntensity=t*k)};
}
