// Photo-guided Binjiang Road / Xiaoyao waterfront. Coordinates inherit the
// existing OSM projection, metres, east X / south Z. See docs/yunyou-reference.md.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hash } from './lib.js';

export const BINJIANG = [[-225,1299],[-214,1213],[-65,903],[-12,922],[7,922],[21,915],[52,892],[323,424],[358,364]];
// Lamps and both terraces belong to the river side of the mapped road
// ([375,321] -> [524,-139]), opposite Xiaoyao Tower.
export const XIAOYAO_LIGHTS = [[448,162],[439,189],[430,216],[421,243],[412,270],[403,297]];
export const XIAOYAO_TERRACE = { upper:[[450,152],[399,309]], lower:[[461,156],[410,313]] };
const V = (x,y,z) => new THREE.Vector3(x,y,z);
export function ribbonGeometry(points, width, y) {
  const pos=[], uv=[], ix=[];
  points.forEach(([x,z],i)=>{
    const a=points[Math.max(i-1,0)], b=points[Math.min(i+1,points.length-1)];
    const len=Math.hypot(b[0]-a[0],b[1]-a[1])||1, nx=-(b[1]-a[1])/len, nz=(b[0]-a[0])/len;
    pos.push(x+nx*width/2,y,z+nz*width/2,x-nx*width/2,y,z-nz*width/2); uv.push(0,i,1,i);
    if(i){const k=i*2;ix.push(k-2,k,k-1,k-1,k,k+1);}
  });
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
function samples(points, pitch, offset=0) {
  const out=[];
  for(let i=1;i<points.length;i++){
    const [ax,az]=points[i-1],[bx,bz]=points[i],len=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/len,dz=(bz-az)/len;
    for(let s=pitch/2;s<len;s+=pitch)out.push([ax+dx*s-dz*offset,az+dz*s+dx*offset,Math.atan2(dx,dz)]);
  }return out;
}
function shifted(points, offset){return points.map(([x,z],i)=>{const a=points[Math.max(0,i-1)],b=points[Math.min(points.length-1,i+1)],L=Math.hypot(b[0]-a[0],b[1]-a[1]);return [x-(b[1]-a[1])/L*offset,z+(b[0]-a[0])/L*offset];});}
export function createWaterfront(TEX) {
  const group=new THREE.Group(), buckets=new Map(), nightMats=[];
  const mat=(color,extra={})=>new THREE.MeshStandardMaterial({color,roughness:.85,...extra});
  const stone=mat(0xa8aaa2,{map:TEX.stone}), paving=mat(0xd1cec3), road=mat(0x434b50), white=mat(0xe8e4d7), yellow=mat(0xd5af62), metal=mat(0x465157,{metalness:.5}), wood=mat(0x755137), trunk=mat(0x5d5645), leaf=mat(0x456348), leaf2=mat(0x54764c), flower=mat(0xac8b83);
  const glow=(color,intensity=2)=>{const m=mat(color,{emissive:color,emissiveIntensity:0,roughness:.45});nightMats.push([m,intensity]);return m;};
  const warm=glow(0xffcf83), cyan=glow(0x74ece2,2.8), blue=glow(0x5ab4fa,2.3);
  const add=(geo,m,x=0,y=0,z=0,ry=0)=>{geo.rotateY(ry);geo.translate(x,y,z); const key=m.uuid+':'+Math.floor(x/180)+':'+Math.floor(z/180); if(!buckets.has(key))buckets.set(key,{m,geos:[]});buckets.get(key).geos.push(geo);};
  const box=(w,h,d,m,x,y,z,ry=0)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
  const beam=(a,b,r,m)=>{const d=b.clone().sub(a),geo=new THREE.CylinderGeometry(r,r,d.length(),6);geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V(0,1,0),d.normalize()));add(geo,m,...a.clone().add(b).multiplyScalar(.5));};
  // Road follows existing vertices. Distinct raised walk, kerb and river rail.
  add(ribbonGeometry(BINJIANG,10,.82),road);
  const promenade=shifted(BINJIANG,9), railLine=shifted(BINJIANG,12.1);
  add(ribbonGeometry(promenade,5.8,1.03),paving);
  add(ribbonGeometry(shifted(BINJIANG,5.8),.35,1.15),stone);
  for(const [x,z,ry] of samples(BINJIANG,8))box(.13,.022,3,yellow,x,.85,z,ry);
  for(const [x,z,ry] of samples(railLine,3)){
    box(.18,1.05,.18,stone,x,1.53,z);box(.17,.14,3.1,stone,x,1.96,z,ry);box(.1,.1,3.1,stone,x,1.45,z,ry);
  }
  for(const [x,z,ry] of samples(shifted(BINJIANG,6.5),19)){
    box(.13,4.5,.13,metal,x,3.25,z);box(.85,.14,.85,warm,x,5.5,z);
    box(1.3,.18,1.3,metal,x,5.65,z);
    box(1.3,.45,2.6,stone,x-2.6,1.1,z,ry);box(1.25,.13,2.5,wood,x-2.6,1.4,z,ry);
  }
  // Mature camphor avenue: varied lobed crowns, visible trunks, no floating balls.
  for(const [i,[x,z]] of samples(shifted(BINJIANG,-7),20).entries()){
    add(new THREE.CylinderGeometry(.34,.65,6,7),trunk,x,3,z);
    for(let j=0;j<5;j++){
      const a=j*2.4+i, r=3.4+hash(i+'r'+j)*1.7;
      const geo=new THREE.IcosahedronGeometry(r,1);geo.scale(1,.8,1);
      add(geo,j%2?leaf:leaf2,x+Math.cos(a)*2.5,7.5+hash(i+'h'+j)*2,z+Math.sin(a)*2.5);
    }
    box(2.3,.25,2.3,stone,x,.9,z);
  }
  // Six visually confirmed pointed light frames by Xiaoyao Tower, north of bridge.
  // Placement and heights are photo estimates, not a surveyed 2026 asset inventory.
  const lights=XIAOYAO_LIGHTS;
  const angle=-.322;
  const world=(x,y,z,cx,cz)=>V(cx+Math.cos(angle)*x+Math.sin(angle)*z,y,cz-Math.sin(angle)*x+Math.cos(angle)*z);
  // Two-level waterfront terrace and a sloped embankment.
  add(ribbonGeometry(XIAOYAO_TERRACE.upper,12,2.6),paving);
  add(ribbonGeometry(XIAOYAO_TERRACE.lower,9,.9),stone);
  for(let i=0;i<10;i++) add(ribbonGeometry([[454+i*.55,159],[404+i*.55,309]],.7,2.5-i*.16),stone);
  for(const [cx,cz] of lights){
    box(3.2,1.1,2.2,stone,cx,3.15,cz,angle);
    for(const depth of [-.55,.55])for(const off of [0,.42]){
      const outline=[[-1.4-off,3.7],[-1.4-off,14.8],[0,16.9+off],[1.4+off,14.8],[1.4+off,3.7]];
      for(let i=1;i<outline.length;i++){
        const a=world(outline[i-1][0],outline[i-1][1],depth,cx,cz),b=world(outline[i][0],outline[i][1],depth,cx,cz);
        beam(a,b,.12,metal);beam(a.clone().add(V(0,0,.14)),b.clone().add(V(0,0,.14)),.064,off?blue:cyan);
      }
    }
    for(let h=5;h<13;h+=1.2)box(.38,.48,.38,warm,cx,h,cz,angle);
    box(.09,9,.09,metal,cx,9,cz);
  }
  for(const [x,z,ry] of samples(shifted(BINJIANG,-10),35)) {box(2,.5,4,stone,x,1,z,ry);box(1.6,.3,3.6,flower,x,1.4,z,ry);}
  for(const {m,geos} of buckets.values()){
    const g=mergeGeometries(geos);geos.forEach(g=>g.dispose());const mesh=new THREE.Mesh(g,m);mesh.receiveShadow=true;group.add(mesh);
  }
  group.name='滨江路与逍遥楼滨江灯柱';
  return {group,setNight:(t)=>{for(const [m,k] of nightMats)m.emissiveIntensity=k*t;}};
}

export function createCruises() {
  const group=new THREE.Group(), vessels=[], materials=[];
  const white=new THREE.MeshStandardMaterial({color:0xe8e5d9,roughness:.5});
  const blue=new THREE.MeshStandardMaterial({color:0x275967,roughness:.45});
  const glass=new THREE.MeshStandardMaterial({color:0x294650,roughness:.2,metalness:.35,emissive:0xffc87c,emissiveIntensity:0});materials.push(glass);
  const route=new THREE.CatmullRomCurve3([V(12,.55,1310),V(170,.55,1055),V(255,.55,830),V(280,.55,735),V(355,.55,635),V(440,.55,510),V(510,.55,320),V(565,.55,120)],false,'centripetal');
  const wakeMat=new THREE.MeshBasicMaterial({color:0xc4e3d7,transparent:true,opacity:.24,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<3;i++){
    const ship=new THREE.Group();
    const add=(g,m,x,y,z)=>{const o=new THREE.Mesh(g,m);o.position.set(x,y,z);ship.add(o);};
    const shape=new THREE.Shape();shape.moveTo(-3,-12);shape.lineTo(3,-12);shape.lineTo(3,8);shape.quadraticCurveTo(2,12,0,14);shape.quadraticCurveTo(-2,12,-3,8);shape.closePath();
    const hull=new THREE.ExtrudeGeometry(shape,{depth:1.5,bevelEnabled:true,bevelSize:.25,bevelThickness:.2,bevelSegments:1});hull.rotateX(-Math.PI/2);hull.rotateY(Math.PI);add(hull,white,0,0,0);
    add(new THREE.BoxGeometry(5.6,2.2,17),white,0,2.25,0);
    add(new THREE.BoxGeometry(6.1,.25,19),blue,0,3.5,0);
    for(const side of [-1,1]){
      for(let j=0;j<8;j++)add(new THREE.BoxGeometry(.06,1.25,1.5),glass,side*2.84,2.4,-7+j*2);
      add(new THREE.BoxGeometry(.09,.1,19),blue,side*2.9,4.55,0);
      for(let j=-9;j<=9;j+=3)add(new THREE.BoxGeometry(.08,1,.08),white,side*2.9,4,j);
    }
    add(new THREE.BoxGeometry(4.5,1.4,3),white,0,4.3,5);
    add(new THREE.BoxGeometry(4,.8,.06),glass,0,4.35,6.55);
    const wave=new THREE.BufferGeometry();wave.setAttribute('position',new THREE.Float32BufferAttribute([-3,.05,-11,-12,.05,-43,-7,.05,-39,3,.05,-11,7,.05,-39,12,.05,-43],3));wave.computeVertexNormals();
    add(wave,wakeMat,0,0,0);
    ship.updateMatrixWorld(true);const batches=new Map();
    for(const o of [...ship.children]){if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(o.geometry.clone().applyMatrix4(o.matrix));o.geometry.dispose();ship.remove(o);}
    for(const [m,geos] of batches){
      // Hull/box/wake layouts differ; normalize to nonindexed position+normal.
      const normalized=geos.map(g=>{const n=g.index?g.toNonIndexed():g.clone();n.deleteAttribute('uv');g.dispose();return n;});
      ship.add(new THREE.Mesh(mergeGeometries(normalized),m));normalized.forEach(g=>g.dispose());
    }
    ship.name='漓江市区游船';group.add(ship);vessels.push(ship);
  }
  let elapsed=0;
  const update=(dt,moving=true)=>{
    if(moving)elapsed+=dt;
    vessels.forEach((ship,i)=>{
      // Ping-pong traversals avoid visible teleportation. Turn at the far endpoints.
      const phase=(elapsed/340+i/3)%2,forward=phase<1,t=forward?phase:2-phase;
      ship.position.copy(route.getPointAt(t));const tangent=route.getTangentAt(t), heading=Math.atan2(tangent.x,tangent.z)+(forward?0:Math.PI);
      if(ship.userData.heading===undefined)ship.userData.heading=heading;
      const delta=Math.atan2(Math.sin(heading-ship.userData.heading),Math.cos(heading-ship.userData.heading));
      ship.userData.heading+=delta*Math.min(1,dt*1.7);ship.rotation.y=ship.userData.heading;
      ship.position.y+=Math.sin(elapsed*1.2+i)*.04;
    });
  };update(0,false);
  return {group,update,setNight:(t)=>{glass.emissiveIntensity=t*.65;wakeMat.opacity=.24-t*.12;}};
}
