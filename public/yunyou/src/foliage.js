import * as THREE from 'three';
import { hash } from './lib.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
// CC0 photographed leaves. Small curved planes have real alpha outlines and veins;
// instance batches keep thousands of visible leaves to a few draw calls.
export function createLeafyTrees(points,TEX){
 const root=new THREE.Group(),chunks=new Map(),up=new THREE.Vector3(0,1,0),m=new THREE.Matrix4(),q=new THREE.Quaternion(),p=new THREE.Vector3(),scale=new THREE.Vector3(),color=new THREE.Color();
 const geometry=new THREE.PlaneGeometry(.72,1,1,2),pos=geometry.attributes.position;
 for(let i=0;i<pos.count;i++){const y=pos.getY(i);pos.setZ(i,.11*(1-4*y*y));}
 // Middle upper leaf, precise occupied region of the real photograph atlas.
 const uv=geometry.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,.388184+uv.getX(i)*.224121,.675781+uv.getY(i)*.322266);geometry.computeVertexNormals();
 const mat=new THREE.MeshStandardMaterial({map:TEX.leafColor,alphaMap:TEX.leafAlpha,normalMap:TEX.leafNormal,normalScale:new THREE.Vector2(.38,.38),alphaTest:.48,side:THREE.DoubleSide,roughness:.86,metalness:0});
 mat.userData.foliage=true;
 const bark=new THREE.MeshStandardMaterial({color:0x625c4c,roughness:1});
 points.forEach(([x,z,y0,r],id)=>{const k=Math.floor(x/160)+':'+Math.floor(z/160);if(!chunks.has(k))chunks.set(k,{leaves:[],branches:[]});const bucket=chunks.get(k);
  const center=new THREE.Vector3(x,y0+r*1.05+1.2,z);
  for(let branch=0;branch<7;branch++){
   const a=branch*2.399+id*.13,reach=r*(.55+hash(id+'r'+branch)*.5),tip=center.clone().add(new THREE.Vector3(Math.cos(a)*reach,(hash(id+'h'+branch)-.5)*r*.7,Math.sin(a)*reach));
   const start=new THREE.Vector3(x,y0+r*.55,z),delta=tip.clone().sub(start),geo=new THREE.CylinderGeometry(.045,.13,delta.length(),5);geo.applyQuaternion(q.setFromUnitVectors(up,delta.clone().normalize()));geo.translate(...start.add(tip).multiplyScalar(.5));bucket.branches.push(geo);
   for(let j=0;j<72;j++){
    const seed=id*997+branch*101+j,theta=hash(seed+'a')*Math.PI*2,t=hash(seed+'y')*2-1,rad=Math.sqrt(1-t*t),spread=r*.50*Math.cbrt(hash(seed+'d'));
    p.set(tip.x+Math.cos(theta)*rad*spread,tip.y+t*spread*.72,tip.z+Math.sin(theta)*rad*spread);
    q.setFromEuler(new THREE.Euler((hash(seed+'rx')-.5)*2.4,hash(seed+'ry')*6.28,(hash(seed+'rz')-.5)*2));
    const len=.52+hash(seed+'s')*.42;scale.set(len,len,len);m.compose(p,q,scale);
    color.setHSL(.25+hash(seed+'c')*.035,.24+hash(seed+'sat')*.14,.49+hash(seed+'l')*.12);
    bucket.leaves.push([m.clone(),color.clone()]);
   }
  }
 });
 for(const {leaves,branches} of chunks.values()){
  const batch=new THREE.InstancedMesh(geometry,mat,leaves.length);leaves.forEach(([matrix,c],i)=>{batch.setMatrixAt(i,matrix);batch.setColorAt(i,c);});batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);
  if(branches.length){const geo=mergeGeometries(branches),b=new THREE.Mesh(geo,bark);b.castShadow=true;root.add(b);branches.forEach(g=>g.dispose());}
 }
 root.name='摄影叶片树冠';return root;
}
