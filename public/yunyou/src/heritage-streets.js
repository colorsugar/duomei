// Streets follow the retained OSM footpath network. Shop modules / tree positions
// are photo-guided approximations, not surveyed individual commercial premises.
import * as THREE from 'three';
import { hash } from './lib.js';
import { ribbonGeometry } from './waterfront.js';
import { mergeStatic } from './mesh-utils.js';
import { kitMats, polyRoof, plaque } from './detail/kit.js';
const V=(x,y,z)=>new THREE.Vector3(x,y,z);
export const CLOCK=[1,529]; // OSM circular plaza, Zhengyang / Yiren intersection.
export const ALLEYS=[[[62,128],[228,152]],[[55,169],[175,184],[176,176],[221,182],[232,131]],[[118,177],[111,225],[48,211]],[[111,225],[230,261]],[[311,148],[279,141],[275,157],[290,163],[274,217],[263,222],[242,223],[225,278]],[[352,157],[311,148]],[[359,159],[349,188],[354,208],[353,216],[327,223],[311,202],[282,193]],[[124,137],[118,177]],[[46,227],[66,105]]];
export const ZHENGYANG=[[44,237],[2,521],[-2,539],[-127,874]];
export function createHeritageStreets(TEX){
 const group=new THREE.Group(),K=kitMats(TEX),night=[];
 const mat=(c,extra={})=>new THREE.MeshStandardMaterial({color:c,roughness:.82,...extra});
 const paving=mat(0xb8b4aa),trim=mat(0x7e827c),wall=mat(0xdad4c6),brick=mat(0x999c96,{map:TEX.brick}),wood=mat(0x47382c),red=mat(0x96392e,{metalness:.35}),white=mat(0xe4e3d5),blue=mat(0x236988),bark=mat(0x635e4c),leaves=[mat(0x365b3b),mat(0x4c7046),mat(0x52794c)];
 const warm=mat(0xe7bc77,{emissive:0xffc983,emissiveIntensity:0}),lantern=mat(0xa42f24,{emissive:0xe96629,emissiveIntensity:0});night.push([warm,1.8],[lantern,.8]);
 const add=(geo,m,x=0,y=0,z=0,ry=0,parent=group)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.rotation.y=ry;parent.add(o);return o;};
 const box=(w,h,d,m,x,y,z,ry=0,parent=group)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry,parent);
 const beam=(a,b,r,m,parent=group)=>{const d=b.clone().sub(a),o=add(new THREE.CylinderGeometry(r,r,d.length(),6),m,...a.clone().add(b).multiplyScalar(.5),0,parent);o.quaternion.setFromUnitVectors(V(0,1,0),d.normalize());return o;};
 for(const path of ALLEYS){add(ribbonGeometry(path,6,.96),paving);add(ribbonGeometry(path,.25,.98),trim);}
 add(ribbonGeometry(ZHENGYANG,12,.97),paving);add(ribbonGeometry([[352,157],[365,175],[378,187]],10,.97),paving);
 // Crossing continues the walking axis over Jiefang East Road.
 const a=V(46,0,226),b=V(41,0,266),d=b.clone().sub(a).normalize();
 for(let t=0;t<40;t+=3.5)box(7,.025,1.55,white,a.x+d.x*t,1.0,a.z+d.z*t,.12);
 const shops=new THREE.Group();group.add(shops);
 // Tile-roofed courtyard rows, kept clear of every mapped lane junction.
 const rows=[[[72,141],[220,163]],[[65,155],[112,162]],[[140,166],[211,175]],[[146,204],[211,217]],[[295,166],[331,178]],[[289,213],[312,219]]];
 const laneDistance=(x,z)=>Math.min(...ALLEYS.flatMap(p=>p.slice(1).map((b,i)=>{const a=p[i],dx=b[0]-a[0],dz=b[1]-a[1],t=Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz)));return Math.hypot(x-a[0]-dx*t,z-a[1]-dz*t);}))); 
 let shopIndex=0;
 for(const [a,b] of rows){const len=Math.hypot(b[0]-a[0],b[1]-a[1]),dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,angle=Math.atan2(-dz,dx);
  for(let s=6;s<len-4;s+=12){const x=a[0]+dx*s,z=a[1]+dz*s;if(laneDistance(x,z)<6)continue;const local=new THREE.Group(),h=6.3+hash(shopIndex++)*1.8;local.position.set(x,0,z);local.rotation.y=angle;shops.add(local);
   box(10.5,h,8.5,shopIndex%3?wall:brick,0,h/2,0,0,local);box(10.8,.35,9,wood,0,3.3,0,0,local);
   const roof=polyRoof({sides:4,rx:5.3,rz:4.3,h:1.7,ridge:8,over:.65,curl:.25,y:h,rows:3,segs:5,mats:{roof:K.tile,ridge:K.ridge,eaveWood:wood}});local.add(roof);
   for(const side of [-1,1]){for(const wx of [-3.5,0,3.5]){box(2.6,2.3,.1,wood,wx,1.8,side*4.29,0,local);box(2.2,1.4,.12,K.lattice,wx,h-1.7,side*4.3,0,local);box(.1,1.45,.15,wood,wx,h-1.7,side*4.36,0,local);}
    box(8.5,.65,.2,wood,0,3.5,side*4.4,0,local);box(8.6,.07,.15,warm,0,3.9,side*4.5,0,local);
    for(const wx of [-4,4]){add(new THREE.SphereGeometry(.35,8,6),lantern,wx,3.25,side*4.8,0,local);box(.05,.6,.05,wood,wx,3.7,side*4.8,0,local);}
   }
  }
 }
 // Small traditional entry frame on the eastern alley, leaving the footpath open.
 const portal=new THREE.Group();portal.position.set(311,0,148);portal.rotation.y=.22;group.add(portal);
 for(const x of [-4,4]){box(.6,5.3,.6,wood,x,2.65,0,0,portal);box(1,.6,1,trim,x,.3,0,0,portal);}
 box(9,.8,.65,wood,0,4.6,0,0,portal);const sign=plaque('东西巷',3.4,.85);sign.position.set(0,4.6,.36);portal.add(sign);
 portal.add(polyRoof({sides:4,rx:4.4,rz:.65,h:1,ridge:7,over:.6,curl:.3,y:5.1,rows:3,segs:5,mats:{roof:K.tile,ridge:K.ridge,eaveWood:wood}}));
 // Plane-tree-sized banyans outside Zhengyang Gate: fused roots and broad branches.
 const banyan=(cx,cz,seed)=>{const g=new THREE.Group();g.position.set(cx,0,cz);group.add(g);
  box(9,.42,8,trim,0,.21,0,0,g);
  for(let i=0;i<7;i++){const a=i*2.4,r=.8+hash(seed+i);beam(V(Math.cos(a)*r,0,Math.sin(a)*r),V(Math.cos(a)*.6,7,Math.sin(a)*.6),.45,bark,g);beam(V(Math.cos(a)*r,.1,Math.sin(a)*r),V(Math.cos(a)*r,.95,Math.sin(a)*r),.46,white,g);}
  for(let i=0;i<11;i++){const a=i*2.4+seed,r=7+hash(seed+'b'+i)*6,x=Math.cos(a)*r,z=Math.sin(a)*r,y=8+hash(seed+'y'+i)*6;beam(V(0,4.5,0),V(x,y-1,z),.25,bark,g);
   const crown=new THREE.IcosahedronGeometry(5+hash(seed+'r'+i)*2,2);crown.scale(1.15,.63,1);add(crown,leaves[i%3],x,y,z,0,g);
   for(let j=0;j<2;j++)beam(V(x+j*.3,y-1,z),V(x+j*.3,2+hash(seed+i+j)*3,z+.3),.035,bark,g);
  }
 };
 banyan(40,123,11);banyan(90,132,29);
 // Zhengyang street: paving seams, shop awnings, planters and pedestrian lamps.
 for(let i=0;i<31;i++){const s=17+i*19;const seg=s<286?[ZHENGYANG[0],ZHENGYANG[1],s]:[ZHENGYANG[2],ZHENGYANG[3],s-286],a=seg[0],b=seg[1],L=Math.hypot(b[0]-a[0],b[1]-a[1]),t=seg[2]/L;if(t>1)continue;const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
  for(const side of [-1,1]){box(.12,4.2,.12,wood,x+side*5.5,2.4,z);box(.6,.7,.6,warm,x+side*5.5,4.5,z);box(2.5,.6,1.4,trim,x+side*7,.3,z+5);add(new THREE.IcosahedronGeometry(1.25,1),leaves[i%3],x+side*7,1.6,z+5);}
 }
 // Open red lattice clock tower, four blue-rimmed clock faces and a suspended bell.
 const clock=new THREE.Group();clock.name='正阳街钟楼';clock.position.set(...[CLOCK[0],0,CLOCK[1]]);group.add(clock);
 const foot=2.35;
 for(const x of [-1,1])for(const z of [-1,1]){box(1.05,1.8,1.05,brick,x*foot,.9,z*foot,0,clock);box(1.2,.18,1.2,trim,x*foot,1.86,z*foot,0,clock);
  const start=V(x*foot,1.9,z*foot),end=V(-x*.62,17.5,-z*.62);
  for(const off of [-.16,.16])beam(start.clone().add(V(off,0,0)),end.clone().add(V(off,0,0)),.10,red,clock);
  for(let y=2;y<17;y+=.48){const t=(y-1.9)/15.6,c=start.clone().lerp(end,t);beam(c.clone().add(V(-.17,0,0)),c.clone().add(V(.17,.3,0)),.035,red,clock);}
 }
 for(const side of [-1,1])for(let y=5;y<13;y+=3){const r=foot*(1-(y-1.9)/13.4),rn=foot*(1-(y+3-1.9)/13.4);beam(V(-r,y,side*r),V(rn,y+3,side*rn),.085,red,clock);beam(V(r,y,side*r),V(-rn,y+3,side*rn),.085,red,clock);}
 const faceCanvas=document.createElement('canvas');faceCanvas.width=faceCanvas.height=256;const ctx=faceCanvas.getContext('2d');ctx.fillStyle='#e7e7d8';ctx.beginPath();ctx.arc(128,128,126,0,Math.PI*2);ctx.fill();ctx.fillStyle='#283034';ctx.font='bold 25px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';for(let n=1;n<=12;n++){const a=n*Math.PI/6;ctx.fillText(String(n),128+Math.sin(a)*91,128-Math.cos(a)*91);}ctx.strokeStyle='#283034';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(128,128);ctx.lineTo(82,96);ctx.moveTo(128,128);ctx.lineTo(185,115);ctx.stroke();
 const tex=new THREE.CanvasTexture(faceCanvas);tex.colorSpace=THREE.SRGBColorSpace;const dial=mat(0xffffff,{map:tex,emissive:0xffde9b,emissiveMap:tex,emissiveIntensity:0});night.push([dial,.7]);
 for(let i=0;i<4;i++){const f=new THREE.Group();f.rotation.y=i*Math.PI/2;clock.add(f);add(new THREE.TorusGeometry(1,.12,8,40),blue,0,10.6,1.25,0,f);add(new THREE.CircleGeometry(.94,40),dial,0,10.6,1.27,0,f);}
 const bellProfile=[[0,0],[.65,0],[.72,.15],[.54,.3],[.42,.9],[.22,1.1],[0,1.1]].map(p=>new THREE.Vector2(...p));add(new THREE.LatheGeometry(bellProfile,20),K.gold,0,8.4,0,0,clock);beam(V(0,9.5,0),V(0,12,0),.08,red,clock);
 const panel=new THREE.Shape();panel.moveTo(-1.15,0);panel.lineTo(1.15,0);panel.lineTo(0,3.1);panel.closePath();const panelMat=mat(0xd8ddd6,{side:THREE.DoubleSide});add(new THREE.ShapeGeometry(panel),panelMat,0,12,-.05,0,clock);
 mergeStatic(group);group.name='东西巷 · 正阳街 · 王城古榕';
 return {group,clock,setNight:t=>{for(const [m,k] of night)m.emissiveIntensity=k*t;}};
}
