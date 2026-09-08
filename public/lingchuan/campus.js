import * as T from './vendor/three.module.js';
import { createTreeBuilder } from './tree-natural.js';
import {planetarium as photoPlanetarium,laboratory as photoLaboratory,office as photoOffice,library as photoLibrary,pingpong as photoPingpong} from './photo-details.js';
import { buildGate,buildSculpture } from './historic-entry.js';

// Dimensions are proportional estimates from archived school photographs, 2007–2016.
// Local +Z points toward the photographer; no survey or geographic north is asserted.
export function createCampus({detail=1,region='courtyard'}={}) {
 let seed=201607;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const root=new T.Group();root.name='lingchuan_'+region;root.userData={historicalTarget:'2014–2017',evidence:'Official school photo archive 2007–2016; Esri Wayback release 2017-07-14',accuracy:'photo-based proportional study; not surveyed',units:'metres, estimated',region};
 const materials={};
 const mat=(name,color,roughness=.84,texture=null,metalness=0)=>{const m=new T.MeshStandardMaterial({color,roughness,metalness});m.name=name;if(texture)m.userData.texture=texture;materials[name]=m;return m;};
 const white=mat('aged_ceramic','#e9e9dd',.67,'tile'),cream=mat('plaster','#e5e4d9'),red=mat('red_horizontal_trim','#a84d4b'),roof=mat('roof_concrete','#adafa7',.96,'stone'),dark=mat('interior_shadow','#24332e'),glass=mat('old_blue_glass','#527a88',.27,null,.34),glassDark=mat('dark_window_glass','#304c58',.33,null,.22),frame=mat('aluminium_frames','#c0c7bc',.44,null,.3),soil=mat('earth','#5e5944',1,'stone'),grass=mat('garden_grass','#abc181',1,'grass'),paving=mat('concrete_paving','#dedcd0',.96,'paving'),stone=mat('weathered_stone','#b3b4a4',1,'stone'),wood=mat('timber','#8a7351',.93,'bark'),bark=mat('tree_bark','#aaa68c',.95,'bark'),metal=mat('painted_metal','#557165',.55,null,.25),pink=mat('terracotta_ceramic','#edb1a0',.75,'pink'),trackmat=mat('red_track','#c09382',.95,'track');
 const leaf=[mat('leaf_dark','#284e32'),mat('leaf_mid','#3d6036'),mat('leaf_light','#557443'),mat('leaf_sun','#6f8651')];
 const hedgeM=mat('clipped_hedge','#657a34'); const flowerM=mat('bougainvillea','#b06583'); const flowerY=mat('flower_yellow','#d6c95b'); const globe=mat('lamp_glass','#f7eed6',.35);globe.emissive.set('#efcf87');globe.emissiveIntensity=.04;
 const buckets=new Map();let scope='site';
 const keyFor=m=>scope+'::'+m.name;
 function add(geo,m,pos=[0,0,0],scale=[1,1,1],rot=[0,0,0]){if(geo.index)geo=geo.toNonIndexed();const q=new T.Quaternion().setFromEuler(new T.Euler(...rot));const mx=new T.Matrix4().compose(new T.Vector3(...pos),q,new T.Vector3(...scale));geo.applyMatrix4(mx);if(!geo.attributes.uv)geo.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(geo.attributes.position.count*2),2));const key=keyFor(m);if(!buckets.has(key))buckets.set(key,{m,geos:[],scope});buckets.get(key).geos.push(geo);}
 function box(x,y,z,w,h,d,m){const g=new T.BoxGeometry(w,h,d);if(m.userData.texture){const p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;const size=m.userData.tileScale??(m===white||m===pink?4:8);for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i));uv.setXY(i,(nx>.5?p.getZ(i)+z:p.getX(i)+x)/size,(ny>.5?p.getZ(i)+z:p.getY(i)+y)/size);}}add(g,m,[x,y,z]);}
 function foundation(x,y,z,w,h,d,m){const g=new T.BoxGeometry(w,h,d).toNonIndexed();const pos=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv,pp=[],nn=[],tt=[];for(let i=0;i<pos.count;i++){if(Math.abs(normal.getY(i))>.5)continue;pp.push(pos.getX(i),pos.getY(i),pos.getZ(i));nn.push(normal.getX(i),normal.getY(i),normal.getZ(i));tt.push(uv.getX(i),uv.getY(i));}const side=new T.BufferGeometry();side.setAttribute('position',new T.Float32BufferAttribute(pp,3));side.setAttribute('normal',new T.Float32BufferAttribute(nn,3));side.setAttribute('uv',new T.Float32BufferAttribute(tt,2));g.dispose();add(side,m,[x,y,z]);}
 function cyl(x,y,z,r,h,m,rTop=r,segments=12){add(new T.CylinderGeometry(rTop,r,h,segments),m,[x,y,z]);}
 function sphere(x,y,z,r,m,s=[1,1,1],res=10){add(new T.SphereGeometry(r,res,Math.max(6,res/2)),m,[x,y,z],s);}
 function beam(a,b,r,m){const av=new T.Vector3(...a),bv=new T.Vector3(...b),mid=av.clone().add(bv).multiplyScalar(.5);const g=new T.CylinderGeometry(r*.8,r,av.distanceTo(bv),6);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),bv.sub(av).normalize()));add(g,m,mid.toArray());}
 function ribbon(points,width,m,y=.12){const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(p[0],y,p[1])));const p=[],uv=[],count=96;for(let i=0;i<=count;i++){const t=i/count,v=curve.getPoint(t),tan=curve.getTangent(t),normal=new T.Vector3(-tan.z,0,tan.x).multiplyScalar(width/2);for(const sign of [-1,1]){const q=v.clone().addScaledVector(normal,sign);p.push(q.x,q.y,q.z);uv.push(q.x/7,q.z/7);}}const idx=[];for(let i=0;i<count;i++){let k=i*2;idx.push(k,k+1,k+2,k+1,k+3,k+2);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();add(g,m);return curve;}
 function window(x,y,z,w=1.65,h=2.05){box(x,y,z,w,h,.1,random()>.55?glass:glassDark);box(x-w/2,y,z+.07,.07,h+.1,.1,frame);box(x+w/2,y,z+.07,.07,h+.1,.1,frame);box(x,y-h/2,z+.09,w,.08,.14,frame);box(x,y+h/2,z+.08,w,.08,.1,frame);box(x,y,z+.11,.055,h,.08,frame);box(x,y+.37,z+.11,w,.05,.08,frame);box(x,y-h/2-.08,z+.18,w+.24,.1,.38,cream);}
 const tree=createTreeBuilder({T,add,beam,bark,leaf,random,detail});
 function palm(x,z,h=3.5){beam([x,0,z],[x+.13,h,z],.24,bark);for(let j=0;j<12;j++){const a=j*Math.PI/6,begin=new T.Vector3(x,h,z),end=new T.Vector3(x+Math.cos(a)*2.8,h-.35+random(),z+Math.sin(a)*2.8);beam(begin.toArray(),end.toArray(),.035,leaf[1]);for(let k=2;k<10;k++){const mid=begin.clone().lerp(end,k/10),len=1.15*Math.sin(k/10*Math.PI);for(const s of [-1,1]){const tip=mid.clone().add(new T.Vector3(Math.cos(a+.95*s)*len,-.35,Math.sin(a+.95*s)*len));const side=mid.clone().add(new T.Vector3(Math.cos(a)*.13,0,Math.sin(a)*.13));const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute([...mid.toArray(),...tip.toArray(),...side.toArray(),...side.toArray(),...tip.toArray(),...mid.toArray()],3));g.computeVertexNormals();add(g,leaf[(j+k)%4]);}}}}
 function lamp(x,z){cyl(x,2.45,z,.065,4.9,metal,.045);cyl(x,.32,z,.18,.64,stone);for(const s of [-1,1]){beam([x,4.45,z],[x+s*.6,4.8,z],.045,metal);sphere(x+s*.6,5.02,z,.26,globe,[1,1.12,1],12);}sphere(x,5.32,z,.27,globe,[1,1.12,1],12);}
 function bench(x,z,rot=0){const c=Math.cos(rot),s=Math.sin(rot),point=(a,b)=>[x+a*c+b*s,z-a*s+b*c];for(const a of [-.75,.75]){let p=point(a,0);box(p[0],.3,p[1],.2,.6,.6,stone);}for(let b=-.26;b<.3;b+=.13){let p=point(0,b);add(new T.BoxGeometry(2.15,.08,.11),wood,[p[0],.63,p[1]],[1,1,1],[0,rot,0]);}}
 function shrub(x,z,s=1,m=hedgeM){sphere(x,.55*s,z,1,m,[s,.52*s,.8*s],8);}
 function hedgeLine(a,b){const dx=b[0]-a[0],dz=b[1]-a[1],n=Math.ceil(Math.hypot(dx,dz)/1.2);for(let i=0;i<=n;i++){const f=i/n;shrub(a[0]+dx*f,a[1]+dz*f,.8+random()*.12);}}
 function border(x,z,w,d){box(x,.12,z,w,.22,d,stone);box(x,.25,z,w-.45,.08,d-.45,soil);}
 function label(name,x,y,z,w,h){const m=mat(name,'#ffffff',.78,name);m.alphaTest=.45;const g=new T.PlaneGeometry(w,h);const uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setY(i,1-uv.getY(i));add(g,m,[x,y,z]);}
 const photoAPI={T,box,cyl,sphere,add,beam,label,mat,window,tree,shrub,white,cream,roof,stone,frame,glass,glassDark,red,paving};
 function mainBuilding(){scope='Main_building_2015_photo';
  box(0,.28,0,78,.55,17,stone);
  // Real open corridors: rear rooms, floor slabs, free columns and low parapets.
  for(let f=0;f<4;f++){const y=.6+f*3.55;box(0,y+1.65,-2.15,74,3.3,10.6,white);box(0,y+1.38,3.19,73,2.65,.06,dark);box(0,y,1,77,.22,17,cream);for(let i=0;i<25;i++){let x=-36+i*3;window(x,y+1.64,3.25,1.8,2.05);}
   // Eight piers across each wing, with slightly projecting centre portico.
   for(let x=-36;x<=36;x+=3){if(f===0&&Math.abs(x)<7)continue;box(x,y+1.72,7.7,.27,3.45,.4,white);}
   for(const side of [-1,1]){box(side*23.5,y+.63,7.62,29,1.02,.24,white);box(side*23.5,y+1.16,7.63,29,.095,.38,cream);box(side*23.5,y+.12,7.84,29,.08,.08,red);box(side*23.5,y+.28,7.84,29,.08,.08,red);}
   if(f>0){box(0,y+.65,9.8,19,1.04,.24,white);box(0,y+1.21,9.82,19.4,.1,.4,cream);box(0,y+.1,9.95,19.4,.1,.1,red);box(0,y,8.6,20,.24,3.2,cream);for(const x of [-9,9])box(x,y+1.73,9.68,.36,3.45,.46,white);}
  }
  for(const x of [-8,-4,4,8]){box(x,2.24,9.65,.35,3.35,.42,white);box(x,.62,9.65,.56,.17,.65,stone);}
  box(0,3.73,9.76,19.6,.22,1.4,red);label('yuying-label',0,4.86,10.03,6.3,1.25);
  box(0,14.75,-.5,77,.75,17.7,white);box(0,15.2,-.5,77.5,.15,18.1,cream);box(0,14.3,8.4,77,.08,.1,red);
  // Central top room, distinctive long dark glazed band in the archive.
  box(0,16.7,0,20,3.6,14.9,white);box(0,16.65,7.51,18.5,2.16,.06,glassDark);
  for(let x=-9;x<=9;x+=1.13)box(x,16.65,7.6,.07,2.18,.12,frame);
  box(0,16.45,7.62,18.5,.06,.12,frame);box(0,18.64,0,20.6,.18,15.6,cream);
  // Roof parapets and drains; hidden rear elevations remain an explicit inference.
  box(0,14.8,-8.9,77,.7,.25,white);for(const x of [-38,38])box(x,14.8,-.4,.25,.7,17.2,white);
  for(const x of [-37.4,-9.4,9.4,37.4])cyl(x,7.2,7.83,.065,13.8,frame);
  for(let i=0;i<3;i++)box(0,.18+i*.14,11.5-i*.55,19-i*.1,.16,1.2,stone);
  // Recessed left/right lower wings appear in the front overview; dimensions estimated.
  for(const side of [-1,1]){const x=side*45;box(x,5.5,-5,13,10.4,13,white);for(let f=0;f<3;f++){box(x,.9+f*3.3,1.62,13,.12,.18,red);for(let i=0;i<5;i++)window(x-5+i*2.5,2.1+f*3.3,1.6,1.6,2.1);}box(x,11,-5,13.5,.3,13.5,cream);}
 }
 function pergola(){scope='Garden_pergola';
  function span(x,z,length,angle){const c=Math.cos(angle),s=Math.sin(angle),p=(a,b,y)=>[x+a*c+b*s,y,z-a*s+b*c];for(let a=0;a<=length;a+=5){for(const b of [-1.5,1.5]){const v=p(a,b,1.9);box(v[0],v[1],v[2],.25,3.7,.25,cream);const k=p(a,b,.15);box(k[0],k[1],k[2],.6,.25,.6,stone);}}
   for(const b of [-1.5,1.5]){const v=p(length/2,b,3.68);add(new T.BoxGeometry(length+.8,.24,.22),cream,v,[1,1,1],[0,angle,0]);}
   for(let a=0;a<length;a+=1.18){const pts=[p(a,-2.1,4.17),p(a,-1.5,3.91),p(a,0,3.86),p(a,1.5,3.91),p(a,2.1,4.17)];for(let i=0;i<4;i++)beam(pts[i],pts[i+1],.082,cream);}
   for(let a=2;a<length-1;a+=5){let v=p(a,1.1,0);bench(v[0],v[2],angle);}
  }
  span(-34,32,51,-Math.PI/2);span(-34,83,34,0);
  // Documented bougainvillea integrated sparingly; density is a landscape estimate.
  for(let i=0;i<34;i++){let z=34+random()*48;sphere(-35+random()*1.2,3.75+random()*.35,z,.65,leaf[i%4],[1.2,.6,1.2],7);if(i%3===0)sphere(-34.8,3.9,z,.34,flowerM,[1.2,.65,1.3],8);}
 }
 function courtyard(){
  mainBuilding();scope='Garden_paths';foundation(0,-.35,49,122,.7,156,soil);box(0,.015,49,120,.08,154,grass);
  box(0,.08,19,119,.13,8,paving);box(44,.08,62,9,.13,82,paving);box(0,.08,104,119,.13,8,paving);box(44,.08,111,11,.13,20,paving);box(-47,.08,61,8,.13,79,paving);
  for(let x=-58;x<59;x+=2)box(x,.2,23.05,1.94,.28,.2,stone);
  ribbon([[-31,32],[-19,31],[-7,33],[3,34],[14,30],[22,32],[21,43],[17,50],[22,59],[30,68],[33,82],[31,100]],2.1,paving);
  ribbon([[-32,84],[-17,72],[-15,60],[-10,51],[-7,46]],2.6,paving);
  ribbon([[-3,48],[6,50],[17,53],[22,59]],2.1,paving);
  cyl(-7,.25,43,9.6,.32,paving,9.6,72);cyl(-7,.44,43,8.9,.12,paving,8.9,72);
  for(const r of [2.8,4.2,6.2,8.4])add(new T.TorusGeometry(r,.032,4,96),red,[-7,.508,43],[1,1,1],[Math.PI/2,0,0]);
  scope='White_sphere_sculpture';cyl(-7,.58,41,1.65,.2,cream,1.65,40);cyl(-7,.86,41,1.25,.38,stone,.95,32);cyl(-7,1.25,41,.48,.62,cream,.34,24);sphere(-7,2.15,41,.76,cream,[1,1,1],24);
  for(let i=0;i<5;i++){const a=.1+i*.34;cyl(-7+Math.cos(a)*7,.68,43+Math.sin(a)*7,.36,.5,cream,.4,16);}cyl(-.7,.84,44,.72,.1,cream,.72,24);cyl(-.7,.52,44,.15,.58,cream);
  pergola();scope='Historic_garden_shelters';
  function gardenShelter(x,z){box(x,.24,z,4.8,.35,4.8,paving);for(const a of [-1.7,1.7])for(const b of [-1.7,1.7])box(x+a,1.85,z+b,.17,3.2,.17,cream);
   const p=[],uv=[],faces=[],res=8;for(let i=0;i<=res;i++)for(let j=0;j<=res;j++){const a=(i/res-.5)*5,b=(j/res-.5)*5,t=Math.max(Math.abs(a),Math.abs(b))/2.5,y=3.7+1.8*(1-t)**2+.16*t*t;p.push(x+a,y,z+b);uv.push(i/res,j/res);}for(let i=0;i<res;i++)for(let j=0;j<res;j++){const k=i*(res+1)+j;faces.push(k,k+1,k+res+1,k+1,k+res+2,k+res+1);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(faces);g.computeVertexNormals();const canopy=mat('shelter_canvas_'+x,'#e4e5da',.9);canopy.side=T.DoubleSide;add(g,canopy);cyl(x,5.55,z,.035,.45,cream,.01,8);bench(x,z);}
  gardenShelter(-29,35);gardenShelter(-29,44);
  scope='Garden_planting';
  for(const x of [-31,-21,-11,11,22,32]){border(x,12.8,5.7,3.2);tree(x,12.8,10.6+random()*4.6,'pine');}
  for(const x of [-44,50])for(let z=-8;z<=91;z+=14)tree(x+(random()-.5)*4,z,11+random()*4,'broad');
  for(const p of [[-22,49],[-27,64],[9,67],[23,81],[-13,86],[4,88],[32,40]])palm(...p,2.6+random());
  for(const p of [[-23,41,2],[-24,55,2.4],[8,36,1.3],[12,63,2.5],[27,73,1.8],[4,79,2]])shrub(...p);
  hedgeLine([-37,27],[-10,27]);hedgeLine([0,27],[33,27]);hedgeLine([37,27],[37,99]);hedgeLine([-41,31],[-41,96]);
  for(let i=0;i<70;i++){const x=-37+random()*76,z=27+random()*70;if((x+7)**2+(z-43)**2<150)continue;if(x>14&&x<35)continue;shrub(x,z,.18+random()*.28,i%4===0?flowerY:leaf[i%4]);}
  for(const x of [-20,20]){border(x,24.7,7,1.8);for(let i=0;i<20;i++)sphere(x-3+random()*6,.51,24.7+(random()-.5),.23,i%3?flowerY:flowerM,[1,.6,1],6);}
  scope='Garden_furniture';for(let z=29;z<=101;z+=18)lamp(38,z);for(const x of [-38,-22,-6,10,26])lamp(x,18);
  for(const x of [-32,-18,10,23])bench(x,28);
  // Stone with documented inscription; exact stone contour is a mesh approximation.
  scope='Qiusuo_stone';const geo=new T.SphereGeometry(1,14,12),pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i),k=1+Math.sin(pos.getX(i)*7+y*4)*.065;pos.setXYZ(i,pos.getX(i)*k,pos.getY(i)*k,pos.getZ(i)*k);}geo.computeVertexNormals();add(geo,stone,[-28,1.62,58],[1.12,1.65,.62]);label('qiusuo-label',-28,1.66,58.66,.82,1.75);sphere(-25.9,.55,58.3,.85,stone,[1.2,.7,.8],10);palm(-30.5,56,3.2);
  const gate=buildGate({T,mat,materials});gate.position.set(44,.16,113);gate.rotation.y=Math.PI;root.add(gate);
  const sculpture=buildSculpture({T,mat,materials});sculpture.position.set(30,.18,95);root.add(sculpture);
  root.userData.features=['historical gate and silver sculpture','four-level open corridors','central fifth level','red bands','garden with sinuous paths','white pergola','spherical sculpture','qiusuo stone'];
 }
 function academic(){
  scope='Qiushi_laboratory';photoLaboratory(photoAPI);
  scope='Zonghe_office';const offsets=new Map([...buckets].map(([k,b])=>[k,b.geos.length]));photoOffice(photoAPI);
  for(const [key,b] of buckets)for(let i=offsets.get(key)||0;i<b.geos.length;i++)b.geos[i].translate(-31,0,1.5);
  scope='Academic_courtyard';box(-7,.12,15,80,.18,27,paving);
  for(const x of [-30,-17,12,24])tree(x,15,11,'broad');
  root.userData.note='2017-07-19 Tieba captions identify Zonghe office wing and Qiushi laboratory; facade dimensions estimated.';
 }
 function athletics(){scope='Athletics_ground';foundation(0,-.5,0,174,1,124,soil);box(0,.02,0,172,.09,122,grass);scope='Athletics_2015_photo';
  const stadium=(r,y,m)=>{const sh=new T.Shape();sh.moveTo(-42,-r);sh.lineTo(42,-r);sh.absarc(42,0,r,-Math.PI/2,Math.PI/2,false);sh.lineTo(-42,r);sh.absarc(-42,0,r,Math.PI/2,Math.PI*1.5,false);const g=new T.ShapeGeometry(sh,56);g.rotateX(-Math.PI/2);add(g,m,[0,y,0]);};
  stadium(44,.09,trackmat);stadium(36,.13,grass);
  for(let lane=0;lane<=6;lane++){let r=36+lane*1.22;const points=[];for(let i=0;i<=60;i++){const a=-Math.PI/2+i*Math.PI/60;points.push([42+Math.cos(a)*r,Math.sin(a)*r]);}for(let i=0;i<=60;i++){const a=Math.PI/2+i*Math.PI/60;points.push([-42+Math.cos(a)*r,Math.sin(a)*r]);}points.push(points[0]);ribbon(points,.055,cream,.16);}
  // Grass ground is photographed, field line dimensions remain proportion estimates.
  for(const z of [-30,30])box(0,.2,z,95,.03,.07,cream);for(const x of [-47.5,0,47.5])box(x,.2,0,.07,.03,60,cream);
  const ring=new T.TorusGeometry(9.15,.04,4,64);add(ring,cream,[0,.22,0],[1,1,1],[Math.PI/2,0,0]);
  for(const x of [-47.5,47.5]){for(const z of [-3.66,3.66])cyl(x,1.32,z,.06,2.44,cream);box(x,2.54,0,.1,.1,7.32,cream);const back=x+Math.sign(x)*1.7;for(const z of [-3.66,3.66]){beam([x,2.54,z],[back,.15,z],.04,cream);beam([x,.15,z],[back,.15,z],.035,cream);}for(let z=-3.6;z<=3.65;z+=.36)beam([x,2.49,z],[back,.2,z],.012,frame);for(let y=.2;y<=2.5;y+=.3){const xx=back-(back-x)*(y-.2)/2.3;beam([xx,y,-3.66],[xx,y,3.66],.012,frame);}}
  for(const side of [-1,1]){const x=side*31;box(x,.205,0,.07,.03,40.3,cream);for(const z of [-20.15,20.15])box(side*39.25,.205,z,16.5,.03,.07,cream);}
  scope='Stone_stands';for(let row=0;row<7;row++)box(0,.25+row*.38,49+row*.82,111,.5+row*.76,.84,stone);
  for(let x=-55;x<=55;x+=3){box(x,3.7,55,.25,1.4,.25,cream);sphere(x,4.4,55,.17,cream,[1,1,1],8);}box(0,4.05,55,111,.13,.16,cream);box(0,3.42,55,111,.12,.14,cream);
  scope='Athletics_vegetation';for(let x=-76;x<=76;x+=14)tree(x,-52,9+random()*4,'broad');
  root.userData.note='Sports-ground study from 2015 portal thumbnail. Precise 2014–2017 dimensions, surrounds and dimensions and exact original court markings estimated; location aligned to 2017 archive.';
 }
 function campusOverview(){
  root.userData.layoutSource='Esri Wayback release 2017-07-14, archive 3319';root.userData.layoutAccuracy='Approximate traced footprints; roof heights and several facades inferred; campus perimeter provisional';
  const unit=1.079,origin=[382,264],at=(x,z)=>[(x-origin[0])*unit,(z-origin[1])*unit];
  function placed(model,px,pz,angle,scale=1){const [x,z]=at(px,pz);model.position.set(x,0,z);model.rotation.y=angle*Math.PI/180;model.scale.setScalar(scale);root.add(model);}
  const main=createCampus({region:'courtyard',detail:0});
  const mainGroup=main.root.getObjectByName('Main_building_2015_photo');mainGroup.removeFromParent();placed(mainGroup,382,264,24,.72);mainGroup.scale.y=1;
  // Restore photographed garden structures in the overview too, instead of dropping
  // them when extracting the teaching block. The depth warp aligns the circular
  // garden feature and the gate end with the historical image trace.
  for(const name of ['Garden_pergola','Historic_garden_shelters','Garden_furniture','Qiusuo_stone']){
   const group=main.root.getObjectByName(name);if(!group)continue;group.removeFromParent();group.name='Overview_'+name;
   group.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i),t=T.MathUtils.clamp((z-43)/70,0,1),kx=.308-.096*t,kz=1.207-.215*t;p.setXYZ(i,.657*x+kx*z,p.getY(i)*.85,-.293*x+kz*z);}o.geometry.computeVertexNormals();o.geometry.computeBoundingSphere();scope='Overview_garden_structures';const key=keyFor(o.material);if(!buckets.has(key))buckets.set(key,{m:o.material,geos:[],scope});buckets.get(key).geos.push(o.geometry);});
  }
  main.root.traverse(o=>o.geometry?.dispose());
  // Recreate the garden in its historical footprint; round objects keep circular sections.
  scope='Garden_2017_layout';
  const gardenPoint=(x,z)=>at(x,z);
  ribbon([[365,289],[378,300],[385,310],[384,325],[398,342],[407,352]].map(p=>at(...p)),1.5,paving,.18);
  ribbon([[409,283],[400,297],[398,310],[405,325],[414,342]].map(p=>at(...p)),1.5,paving,.18);
  const [sx,sz]=gardenPoint(390,314);cyl(sx,.25,sz,6.5,.32,paving,6.5,64);cyl(sx,.5,sz,1.2,.22,cream,1.2,32);cyl(sx,.95,sz,.3,.8,cream,.24,18);sphere(sx,1.8,sz,.58,cream,[1,1,1],20);
  for(let i=0;i<4;i++){const a=i*.7+.1;cyl(sx+Math.cos(a)*4.8,.53,sz+Math.sin(a)*4.8,.27,.65,cream,.3,12);}
  for(const p of [[360,282],[369,279],[398,266],[408,262],[392,338],[417,321],[388,298],[373,318]]){const [x,z]=at(...p);tree(x,z,8+random()*3,'pine');}
  for(const p of [[406,283],[414,302],[418,324],[420,341]]){const [x,z]=at(...p);lamp(x,z);}

  for(const p of [[377,315],[390,337],[405,304]]){const[x,z]=at(...p);palm(x,z,2.8);}
  // Ground plan is hand-traced from the 2017 archive; photographs are not embedded textures.
  scope='Campus_terrain';foundation(15,-.65,22,470,1.3,410,soil);box(15,-.14,22,468,.12,408,grass);
  const river=mat('Gantang_river','#456f70',.28,null,.15);ribbon([[-195,-235],[-216,-100],[-213,30],[-198,125],[-160,235]],54,river,.08);
  function route(points,width){ribbon(points.map(p=>at(...p)),width,paving,.17);}
  // Paved teaching and residential courts traced around the historical roofs.
  scope='2017_campus_paths';
  function pavedPolygon(points){const shape=new T.Shape();points.forEach((p,i)=>{const q=at(...p);if(i)shape.lineTo(q[0],-q[1]);else shape.moveTo(q[0],-q[1]);});shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);const pp=g.attributes.position,uv=g.attributes.uv;for(let i=0;i<pp.count;i++)uv.setXY(i,pp.getX(i)/12,pp.getZ(i)/12);add(g,paving,[0,.09,0]);}
  pavedPolygon([[270,193],[346,153],[387,183],[394,219],[362,241],[279,261],[258,238]]);
  pavedPolygon([[260,251],[351,232],[367,284],[344,309],[279,324],[238,311]]);
  pavedPolygon([[211,325],[253,311],[278,334],[270,371],[233,386],[210,361]]);
  pavedPolygon([[267,388],[367,359],[400,383],[364,429],[270,441]]);

  // The entrance lane is WEST of Lingxi Road. The public road continues
  // north beside the field and passes BELOW the pedestrian connection.
  route([[356,147],[394,218],[419,273],[426,290],[427,307],[432,335],[439,372],[447,414]],7.5);
  route([[413,355],[409,340],[405,319],[404,302],[410,289]],10);route([[413,355],[417,367],[438,382]],9);
  route([[279,324],[363,293],[410,289]],6);route([[255,388],[360,363],[413,355]],6);route([[289,245],[358,223],[397,224]],5);route([[231,460],[387,430],[447,414]],6);
  const pitch=createCampus({region:'athletics',detail:0});pitch.root.getObjectByName('Athletics_ground')?.removeFromParent();pitch.root.getObjectByName('Athletics_vegetation')?.removeFromParent();placed(pitch.root,516,330,15,1.0);pitch.root.position.y=.2;
  scope='Basketball_courts';const courtRoot=new T.Group();courtRoot.name='Basketball_footprints_2017';
  // Video 017 shows two columns and four rows; early school text lists nine in total. The ninth is not placed without a clear location.
  const [cx,cz]=at(330,337);box(cx,.13,cz,68,.19,78,paving);
  const courtSurface=mat('aged_court_concrete','#7d7e77',1,'paving'),courtPaint=mat('court_red_keys','#b97576',1),hoopBlue=mat('court_blue_hoops','#8e8d80',.7);
  for(let row=0;row<4;row++)for(let col=0;col<2;col++){
   const x=cx-15+col*30,z=cz-28.5+row*19;box(x,.27,z,28,.07,15,courtSurface);

   for(const sx of [-14,14])box(x+sx,.36,z,.075,.035,15,cream);for(const sz of [-7.5,7.5])box(x,.36,z+sz,28,.035,.075,cream);box(x,.36,z,.07,.035,15,cream);
   add(new T.TorusGeometry(1.8,.038,4,48),cream,[x,.38,z],[1,1,1],[Math.PI/2,0,0]);
   for(const side of [-1,1]){
    const base=x+side*14.35,board=x+side*12.4,rim=board-side*.46;
    box(base,.25,z,1.15,.36,1.55,stone);beam([base,.4,z],[base,3.15,z],.15,hoopBlue);beam([base,3.15,z],[board,3.52,z],.14,hoopBlue);
    box(board,3.65,z,.12,1.05,1.85,cream);const face=board-side*.071;
    for(const zz of [-.89,.89])box(face,3.65,z+zz,.025,1.02,.035,metal);for(const yy of [3.14,4.16])box(face,yy,z,.025,.035,1.81,metal);
    for(const zz of [-.29,.29])box(face,3.42,z+zz,.028,.45,.035,red);for(const yy of [3.2,3.65])box(face,yy,z,.028,.035,.6,red);
    add(new T.TorusGeometry(.225,.021,6,24),red,[rim,3.23,z],[1,1,1],[Math.PI/2,0,0]);beam([face,3.23,z],[rim,3.23,z],.025,red);
    for(let a=0;a<Math.PI*2;a+=Math.PI/6)beam([rim+Math.cos(a)*.22,3.22,z+Math.sin(a)*.22],[rim+Math.cos(a+.25)*.14,2.78,z+Math.sin(a+.25)*.14],.009,cream);
    const free=x+side*8.2;box(free,.36,z,.07,.035,4.9,cream);for(const zz of [-2.45,2.45])box(x+side*11.1,.36,z+zz,5.8,.035,.07,cream);
    const arc=[];for(let i=0;i<=48;i++){const a=-Math.PI/2+i*Math.PI/48;arc.push([board-side*Math.cos(a)*6.25,z+Math.sin(a)*6.25]);}ribbon(arc,.075,cream,.385);
   }
  }
  const courtTransform=new T.Matrix4().makeTranslation(cx,0,cz).multiply(new T.Matrix4().makeRotationY(110*Math.PI/180)).multiply(new T.Matrix4().makeTranslation(-cx,0,-cz));for(const b of buckets.values())if(b.scope==='Basketball_courts')for(const g of b.geos)g.applyMatrix4(courtTransform);
  // 2022 user video: user confirms all shown buildings except Yuying retain
  // their historic form. Old image footprints set placement; video sets facades.
  // Every local building is transformed after construction; shared materials merge.
  function localBuilding(name,px,pz,ang,build){
   scope=name;const offsets=new Map([...buckets].map(([k,b])=>[k,b.geos.length]));build();
   const [x,z]=at(px,pz),m=new T.Matrix4().makeRotationY(ang*Math.PI/180);m.setPosition(x,0,z);
   for(const [key,b]of buckets)for(let i=offsets.get(key)||0;i<b.geos.length;i++)b.geos[i].applyMatrix4(m);
  }
  const fadedPink=mat('video_faded_pink','#d6b5ae',.94,'pink'),roofBlue=mat('historic_gym_roof_blue','#6b9daa',.7),brick=mat('video_brick_red','#ab6e66',.93),courtGreen=mat('video_court_green','#677b6e',1);
  function corridor(w,d,floors,tone=white,step=3.3){
   box(0,.2,0,w+.6,.4,d+.6,stone);
   for(let f=0;f<floors;f++){
    const y=.4+f*step;box(0,y+step/2,-1.4,w,step-.16,d-3,tone);box(0,y,0,w+.4,.18,d+.5,cream);
    for(let x=-w/2+1.6;x<w/2;x+=3.2)window(x,y+1.6,d/2-2.84,1.55,1.9);
    for(let x=-w/2+.15;x<=w/2;x+=3.2)box(x,y+1.64,d/2,.25,step,.27,white);
    if(f>0){box(0,y+.59,d/2,w,1.0,.2,tone);box(0,y+1.15,d/2,w,.12,.3,cream);}
   }
   box(0,.45+floors*step,0,w+.6,.22,d+.7,roof);box(0,.88+floors*step,-d/2,w+.6,.68,.2,white);
   for(const x of [-w/2,w/2]){box(x,.85+floors*step,0,.2,.6,d+.6,white);cyl(x,.4+floors*step/2,d/2+.2,.045,floors*step,frame,.045,8);}
  }
  // User identifies this as 新星楼 behind 育英楼. Street photographs show
  // the six-storey window facade, curved glazed stair and stone arched portal.
  const xinxingWall=mat('xinxing_warm_plaster','#d6d2c7',.92),xinxingStone=mat('xinxing_portal_stone','#a09086',.93,'stone');
  localBuilding('Xinxing_building',362,228,24,()=>{
   box(-1,10.3,-1,57,20.6,13,xinxingWall);box(-1,20.73,-1,57.7,.3,13.7,roof);
   for(let f=0;f<6;f++){
    const y=2.0+f*3.3;
    for(let x=-26;x<20;x+=3.7){window(x,y,5.57,2.24,2.35);if(f>0){box(x,y-.77,6.06,2.55,.1,.8,cream);for(let k=0;k<=8;k++)cyl(x-1.18+k*.295,y-.18,6.41,.012,1.12,frame,.012,5);beam([x-1.25,y+.4,6.41],[x+1.25,y+.4,6.41],.025,frame);}if(f>0&&Math.round(x)%2===0)box(x+1.4,y-1,6.05,.62,.55,.53,cream);}
    box(-1,y-1.58,5.68,57,.085,.12,stone);
    // Rear external corridor seen in the 2022 aerial.
    box(-1,.4+f*3.3,-9,57.5,.18,3.8,cream);
    if(f>0)box(-1,1.0+f*3.3,-10.82,57,1.0,.17,white);
    for(let x=-28;x<=27;x+=3.7)box(x,1.98+f*3.3,-10.78,.24,3.28,.26,white);
   }
   const endOffsets=new Map([...buckets].map(([k,b])=>[k,b.geos.length]));
   const tx=23.2;
   for(const x of [tx-4.05,tx+4.05]){box(x,10.78,7.55,1.4,21.55,4.4,xinxingWall);box(x,22.04,6.7,1.55,1,5.8,xinxingWall);}
   // Segmented cylindrical curtain wall; each pane is a real mesh surface.
   const radius=3.48,cz=7.08;
   for(let f=0;f<11;f++)for(let j=0;j<12;j++){
    const aa=-Math.PI/2+j*Math.PI/12,bb=aa+Math.PI/12,yy=4.5+f*1.43;
    const positions=[tx+radius*Math.sin(aa),yy,cz+radius*Math.cos(aa),tx+radius*Math.sin(bb),yy,cz+radius*Math.cos(bb),tx+radius*Math.sin(aa),yy+1.4,cz+radius*Math.cos(aa),tx+radius*Math.sin(bb),yy+1.4,cz+radius*Math.cos(bb)];
    const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex([0,1,2,1,3,2]);g.computeVertexNormals();add(g,(f+j)%7===0?glassDark:glass);
   }
   for(let j=0;j<=12;j++){const a=-Math.PI/2+j*Math.PI/12;beam([tx+radius*Math.sin(a),4.47,cz+radius*Math.cos(a)],[tx+radius*Math.sin(a),20.3,cz+radius*Math.cos(a)],.035,frame);}
   for(let k=0;k<=11;k++){const pts=[];for(let j=0;j<=24;j++){const a=-Math.PI/2+j*Math.PI/24;pts.push([tx+(radius+.04)*Math.sin(a),4.48+k*1.43,cz+(radius+.04)*Math.cos(a)]);}for(let j=0;j<24;j++)beam(pts[j],pts[j+1],.024,frame);}
   // Projecting curved roof grid above the glazed stair.
   for(const r of [3.8,4.65])for(let j=0;j<24;j++){const a=-Math.PI/2+j*Math.PI/24,b=a+Math.PI/24;beam([tx+r*Math.sin(a),21.15,cz+r*Math.cos(a)],[tx+r*Math.sin(b),21.15,cz+r*Math.cos(b)],.09,frame);}
   for(let j=0;j<=12;j++){const a=-Math.PI/2+j*Math.PI/12;beam([tx+3.25*Math.sin(a),21.12,cz+3.25*Math.cos(a)],[tx+4.65*Math.sin(a),21.12,cz+4.65*Math.cos(a)],.065,frame);}
   // The entrance opening is an arch cut through stonework, not a solid box.
   const portal=new T.Shape();portal.moveTo(-4.4,0);portal.lineTo(4.4,0);portal.lineTo(4.4,5.35);portal.lineTo(-4.4,5.35);portal.closePath();
   const hole=new T.Path();hole.moveTo(-3.55,0);hole.lineTo(-3.55,3.43);hole.quadraticCurveTo(0,5.05,3.55,3.43);hole.lineTo(3.55,0);hole.closePath();portal.holes.push(hole);
   add(new T.ExtrudeGeometry(portal,{depth:1.1,bevelEnabled:false,curveSegments:32}),xinxingStone,[tx,.5,10.54]);
   box(tx,2.55,8.99,8.5,4.2,.16,xinxingWall);box(tx,.2,11.5,9.5,.4,5.5,stone);
   box(tx,1.9,9.24,2.6,3.05,.09,dark);for(const x of [tx-1.4,tx+1.4])box(x,1.95,9.39,.13,3.15,.25,frame);box(tx,3.6,9.38,2.95,.2,.25,frame);
   label('xinxing-label',tx,4.18,9.37,2.9,.7);
   for(let i=0;i<4;i++)box(tx,.1+i*.125,14.05-i*.44,10.0,.18+i*.25,.55,stone);
   for(const [key,b]of buckets)for(let i=endOffsets.get(key)||0;i<b.geos.length;i++){
    const g=b.geos[i],p=g.attributes.position;for(let j=0;j<p.count;j++){const x=p.getX(j),z=p.getZ(j);p.setXYZ(j,28.65+(z-7.1)*.76,p.getY(j),1.2-(x-23.2)*.8);}g.computeVertexNormals();
   }
   for(let i=0;i<4;i++)cyl(-23+i*14,21.22,-3,.9,1.1,roof,.9,12);
  });
  // The three-storey front block is separate from the planetarium behind it.
  localBuilding('Peixian_building',309,302,20,()=>{
   corridor(62,10,3);box(0,3.17,7.1,11,.3,4.3,red);label('peixian-label',0,4.45,5.31,5.0,.8);
   for(const x of [-5,5])box(x,1.75,8.7,.23,2.9,.23,cream);
   const g=new T.Shape();g.moveTo(-2.6,0);g.lineTo(2.6,0);g.lineTo(2.6,1.8);g.lineTo(0,3.0);g.lineTo(-2.6,1.8);g.closePath();add(new T.ExtrudeGeometry(g,{depth:.2,bevelEnabled:false}),red,[0,9.95,5.18]);add(new T.CylinderGeometry(.24,.24,.06,24),cream,[0,11.5,5.44],[1,1,1],[Math.PI/2,0,0]);
   box(-31.07,5.25,.2,.15,10.2,10.3,white);
   for(let f=0;f<3;f++)box(-31.17,2.1+f*3.3,-3.5,.08,1.65,1.75,glassDark);
   box(-32.4,2.9,-2.8,2.6,.2,4.2,red);
   // Raised flag platform and balustrade appear in both old images and video.
   box(0,.54,10,16,1.08,5,paving);for(let i=0;i<5;i++)box(10-i*.28,.12+i*.1,9.5,.6,.2+i*.2,4,stone);
   cyl(-2,6.7,11.8,.055,12,frame,.045,12);box(-1.05,11.95,11.8,1.8,1.2,.025,red);
  });
  localBuilding('Planetarium_2022_video',323,270,114,()=>photoPlanetarium(photoAPI));
  // Gym / dining hall block: blue roof on 2017 image, massing from video 005.
  localBuilding('Dining_sports_hall_video',245,283,43,()=>{
   box(0,4.6,0,39,9.2,22,white);box(0,1.8,12,32,3.6,5,white);
   for(let f=0;f<2;f++)for(let x=-17;x<18;x+=3.1)window(x,2+f*3.7,11.06,2.1,2.6);
   for(const side of [-1,1])add(new T.BoxGeometry(40,.18,12.4),roofBlue,[0,10.7,side*5.8],[1,1,1],[side*-.19,0,0]);
   for(let x=-19;x<=19;x+=1.1)for(const side of [-1,1])beam([x,11.83,0],[x,9.57,side*11.7],.023,frame);
   for(const x of [-18,18])box(x,5,11.2,.8,10,.5,cream);
   for(let x=-12;x<=12;x+=4)window(x,1.8,14.55,2.8,2.3);
   for(let i=0;i<4;i++)box(0,.1+i*.12,16-i*.4,21,.18+i*.24,.6,stone);
  });
  // User confirms a separate meal-card recharge building between dining and dorms.
  // Footprint follows the intervening narrow roof; facade and floor count provisional.
  localBuilding('Meal_card_recharge_building',242,316,20,()=>{
   corridor(29,8,3,white);box(0,2.9,6,12,.22,3.1,roof);
   for(const x of [-4,0,4])window(x,1.6,4.11,2.8,1.8);
  });
  localBuilding('Peixian_pingpong_court_2017',265,313,290,()=>photoPingpong(photoAPI));
  // User photo confirms TWO facing dormitory wings beside the courts.
  const dormTile=mat('dormitory_small_pink_tiles','#d7c5c0',.86,'pink');
  for(const [name,px,pz,angle,floors]of [['Courtside_dormitory_A',238,343,20,6],['Courtside_dormitory_B',249,368,200,7]]){
   localBuilding(name,px,pz,angle,()=>{
    corridor(44,13,floors,dormTile);
    for(let f=0;f<floors;f++){
     const yy=.4+f*3.3;
     box(0,yy+1.14,6.54,44,.105,.3,red);box(0,yy+.12,6.56,44,.085,.09,red);
     for(let x=-19;x<21;x+=3.7){box(x,1.95+f*3.3,-6.65,1.85,1.9,.08,glassDark);if(f>0)box(x+1.15,1.3+f*3.3,-6.92,.6,.6,.5,cream);}
     for(const side of [-1,1]){box(side*22.08,1.85+f*3.3,1.7,.09,1.55,1.4,glassDark);box(side*22.15,yy+1.16,3.8,.08,.1,5.3,red);}
    }
    // Narrow drainage pipes and electric service risers on the court end.
    for(const z of [-4.8,-3.8])beam([-22.13,.4,z],[-22.13,floors*3.3,z],.045,frame);
   });
  }
  localBuilding('Courtside_dormitory_entrance',272,352,110,()=>{
   for(const side of [-1,1]){box(side*6.7,1.18,0,8.2,2.36,.35,dormTile);box(side*6.7,2.42,0,8.5,.15,.62,roofBlue);box(side*2.6,1.5,0,.48,3,.52,dormTile);box(side*2.6,3.04,0,.6,.14,.66,red);}
  });
  localBuilding('Qiushi_laboratory',323,210,43,()=>photoLaboratory(photoAPI));
  localBuilding('Zonghe_office',302.935,230.603,43,()=>photoOffice(photoAPI));
  localBuilding('Library_building',338,174,-28,()=>photoLibrary(photoAPI));
  localBuilding('Rear_long_corridor_block_video',369,160,-28,()=>corridor(62,14,6));
  // Pink-ended residential wings visible along the far side of the courts.
  for(const [px,pz]of [[283,403],[315,394],[349,386]])localBuilding('South_residential_wings_video',px,pz,107,()=>{
   corridor(49,13,6,white);for(const x of [-24.55,24.55]){box(x,10,0,.13,18.7,12.6,white);box(x+(x>0?.09:-.09),10,0,.08,16.8,7.2,fadedPink);}for(let f=0;f<6;f++)for(let x=-21;x<22;x+=3.2){box(x,1.7+f*3.3,-6.61,2,1.8,.08,glassDark);box(x+1.2,1.3+f*3.3,-6.9,.6,.6,.5,cream);}
  });
  // Field-side older residential block, prominent in video 007–008.
  localBuilding('Fieldside_residential_block_video',482,285,15,()=>{corridor(52,13,5);box(0,17.1,0,53,.5,14,roofBlue);});
  // Video 005 / 006 / 020: short campus stair -> cross-road bridge ->
  // short field-side stair. The long blue-railed strip is a ROAD beneath it.
  // Pixel footprints use the 2017 satellite and the user's Amap screenshot.
  scope='Football_pedestrian_connection';
  const railBlue=mat('access_blue_railings','#729ca3',.75);
  function segment(a,b,width,height,material,y){const A=at(...a),B=at(...b),length=Math.hypot(B[0]-A[0],B[1]-A[1]),angle=Math.atan2(B[0]-A[0],B[1]-A[1]);add(new T.BoxGeometry(width,height,length+.02),material,[(A[0]+B[0])/2,y,(A[1]+B[1])/2],[1,1,1],[0,angle,0]);return {A,B,length,angle};}
  function rails(a,b,width,ya,yb){const {A,B,length,angle}=segment(a,b,width,.01,paving,-.16),n=Math.ceil(length/1.5);for(const side of [-1,1]){const ox=Math.cos(angle)*width/2*side,oz=-Math.sin(angle)*width/2*side;for(let i=0;i<=n;i++){const t=i/n;box(A[0]+(B[0]-A[0])*t+ox,ya+(yb-ya)*t+.57,A[1]+(B[1]-A[1])*t+oz,.11,1.12,.11,railBlue);}for(const h of [.45,1.13])beam([A[0]+ox,ya+h,A[1]+oz],[B[0]+ox,yb+h,B[1]+oz],.045,railBlue);}}
  function stoneRails(a,b,width,ya,yb){
   const A=at(...a),B=at(...b),len=Math.hypot(B[0]-A[0],B[1]-A[1]),ang=Math.atan2(B[0]-A[0],B[1]-A[1]),n=Math.ceil(len/2.3);
   for(const side of [-1,1]){const ox=Math.cos(ang)*width/2*side,oz=-Math.sin(ang)*width/2*side;
    const point=(t,h)=>[A[0]+(B[0]-A[0])*t+ox,ya+(yb-ya)*t+h,A[1]+(B[1]-A[1])*t+oz];
    for(let i=0;i<=n;i++){const p=point(i/n,.64);box(p[0],p[1],p[2],.28,1.28,.28,stone);cyl(p[0],p[1]+.77,p[2],.19,.3,stone,.19,12);}
    beam(point(0,1.16),point(1,1.16),.115,stone);
    for(let i=0;i<n;i++){const p=point((i+.5)/n,.39);add(new T.BoxGeometry(.16,.59,len/n-.3),stone,p,[1,1,1],[0,ang,0]);for(const off of [-.25,.25]){const q=point((i+.5+off)/n,.88);box(q[0],q[1],q[2],.12,.4,.12,stone);}}
   }
  }
  function stair(a,b,width,low,high,count){const A=at(...a),B=at(...b),len=Math.hypot(B[0]-A[0],B[1]-A[1]),ang=Math.atan2(B[0]-A[0],B[1]-A[1]);for(let i=0;i<count;i++){const t=(i+.5)/count,y=low+(high-low)*(i+1)/count;add(new T.BoxGeometry(width,y+.1,len/count+.008),stone,[A[0]+(B[0]-A[0])*t,(y-.1)/2,A[1]+(B[1]-A[1])*t],[1,1,1],[0,ang,0]);}stoneRails(a,b,width+.08,low,high);}
  // The cross-road span is further inside the gate, near the garden's north end.
  stair([404,316],[416,308],5.0,.2,4.65,26);
  segment([416,308],[435,303],5.0,.48,stone,4.43);
  stoneRails([416,308],[435,303],5.08,4.67,4.67);
  // Both ends are supported; there is clear road space below the central span.
  for(const q of [[418,307.5],[433,303.5]]){const [x,z]=at(...q);box(x,2.17,z,.75,4.3,5.0,stone);}
  stair([445,319],[435,303],5.0,.4,4.65,26);
  // Roadside retaining walls and blue rails seen running past the entrance.
  for(const [a,b]of [[[422,314],[439,375]],[[431,312],[448,373]]]){
   segment(a,b,.42,1.2,stone,.6);rails(a,b,.44,1.2,1.2);
  }
  // Paved corner connects the field-side stair foot to the running-track apron.
  segment([445,319],[453,323],5.1,.18,paving,.23);
  const gate=buildGate({T,mat,materials});placed(gate,413,355,200,.82);gate.position.y=.19;
  const sculpture=buildSculpture({T,mat,materials});placed(sculpture,409,339,20,.72);sculpture.position.y=.19;
  // Broad crowns must not grow through the photo-identified building envelopes.
  const buildingBoxes=[];
  for(const b of buckets.values())if(/building|laboratory|office|hall_video|dormitory|residential|corridor_block/i.test(b.scope)&&!b.scope.includes('entrance'))for(const g of b.geos){g.computeBoundingBox();buildingBoxes.push(g.boundingBox);}
  function clearTree(x,z,h){const radius=h*.48;return !buildingBoxes.some(b=>x+radius>b.min.x&&x-radius<b.max.x&&z+radius>b.min.z&&z-radius<b.max.z);}
  function campusTree(x,z,h){if(clearTree(x,z,h))tree(x,z,h,'broad');}
  scope='2017_tree_belts';for(let z=-160;z<=177;z+=24){campusTree(-158+(random()-.5)*15,z,12+random()*5);if(z>0)campusTree(-70+z*.7,174+(random()-.5)*8,10+random()*5);}

  for(const p of [[267,320],[278,355],[387,349],[393,301],[278,226],[339,205],[283,195],[241,402],[360,449],[251,459],[288,273],[310,261],[344,252],[358,280],[294,229],[319,216],[371,205],[347,330],[378,345],[399,331],[414,312],[446,301],[369,312],[252,327]]){const [x,z]=at(...p);campusTree(x,z,10+random()*4);}
  root.userData.excluded=['Modern northeast teaching block absent in 2017 archive','Southern separate small athletics ground','Buildings completed after 2017'];
 }
 if(region==='whole')campusOverview();else if(region==='academic')academic();else if(region==='athletics')athletics();else courtyard();
 // Merge by material and documented zone, keeping export/edit boundaries and low draw calls.
 const groups=new Map();for(const {m,geos,scope:s} of buckets.values()){if(!groups.has(s)){const g=new T.Group();g.name=s;root.add(g);groups.set(s,g);}const count=geos.reduce((n,g)=>n+g.attributes.position.count,0),p=new Float32Array(count*3),n=new Float32Array(count*3),uv=new Float32Array(count*2);let off=0;for(const g of geos){p.set(g.attributes.position.array,off*3);n.set(g.attributes.normal.array,off*3);uv.set(g.attributes.uv.array,off*2);off+=g.attributes.position.count;g.dispose();}const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(p,3));geo.setAttribute('normal',new T.BufferAttribute(n,3));geo.setAttribute('uv',new T.BufferAttribute(uv,2));geo.computeBoundingSphere();const mesh=new T.Mesh(geo,m);mesh.name=s+'_'+m.name;mesh.castShadow=true;mesh.receiveShadow=true;groups.get(s).add(mesh);}
 root.traverse(o=>{if(o.isMesh)materials[o.material.uuid]=o.material;});
 return {root,materials};
}
