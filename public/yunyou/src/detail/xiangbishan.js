// Shore path stays on the landward side; never draw a full ellipse through the cave.
import * as THREE from 'three';
import { kitMats, applyNight } from './kit.js';
import { XBS } from '../landmarks.js';
import { ribbonGeometry } from '../waterfront.js';
import { hash } from '../lib.js';
export const mode='augment';
export function build({TEX}) {
  const K=kitMats(TEX),g=new THREE.Group();
  const path=[[-286,1487],[-279,1461],[-267,1432],[-245,1405],[-215,1386],[-187,1379],[-168,1372]];
  g.add(new THREE.Mesh(ribbonGeometry(path,2.3,1.1),K.concrete));
  // Low waterline ledges, deliberately absent inside the cave opening.
  const geo=new THREE.IcosahedronGeometry(1,1),rocks=new THREE.InstancedMesh(geo,K.stoneBase,22),m=new THREE.Matrix4();
  for(let i=0;i<22;i++){
    const a=.1+i/21*Math.PI*1.65,x=XBS.cx-10+Math.cos(a)*57,z=XBS.cz+10+Math.sin(a)*66;
    m.makeScale(2+hash(i)*2,.5+hash(i+'h'),1.8+hash(i+'d'));
    m.setPosition(x,.7,z);rocks.setMatrixAt(i,m);
  }g.add(rocks);
  const cave=new THREE.PointLight(0xffc890,35,32,1.7);cave.position.set(-147,6,1391);g.add(cave);
  const warm=new THREE.MeshStandardMaterial({color:0xe6d4b3,emissive:0xffcb86,emissiveIntensity:0,userData:{night:{color:0xffcb86,intensity:1.4}}});
  path.forEach(([x,z],i)=>{
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.065,.09,2.4,6),K.dark);pole.position.set(x-1.5,2.3,z);g.add(pole);
    const lamp=new THREE.Mesh(new THREE.SphereGeometry(.18,8,6),warm);lamp.position.set(x-1.5,3.6,z);g.add(lamp);
  });
  g.userData.top=68.6;return g;
}
export const night=applyNight;
