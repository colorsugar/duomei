// Xiaoyao Tower: TWO occupied floors, THREE eaves; total height including
// plinth is 24m (Guangxi Daily / China News, 2016-04-27). See reference note.
import * as THREE from 'three';
import { kitMats, applyNight, polyRoof, dougong, balustrade, colonnade, latticeWall, plaque } from './kit.js';
import { ringAngle } from '../lib.js';
export function build({F,TEX}) {
  const shared=kitMats(TEX),K={...shared},g=new THREE.Group();
  const clone=(m,color)=>{const c=m.clone();c.color.setHex(color);return c;};
  K.lacquer=clone(K.lacquer,0x3f352b);K.woodDark=clone(K.woodDark,0x44382b);
  K.beam=K.woodDark;K.tile=clone(K.tile,0x90938b);K.ridge=clone(K.ridge,0x96988d);
  K.wall=clone(K.wall,0xf0e8d9);K.marble=clone(K.marble,0xcbcabd);
  K.lacquer.userData={night:{color:0xffbd66,intensity:.52}};
  K.woodDark.userData={night:{color:0xffc16b,intensity:.65}};
  K.tile.userData={night:{color:0xe5a857,intensity:.15}};
  const roofs={roof:K.tile,ridge:K.ridge,eaveWood:K.woodDark};
  const box=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;};
  box(29,1.5,29,K.stoneBase,0,.75,0);
  for(const side of [-1,1]){
    box(.18,.6,28,K.marble,side*14,1.85,0);box(.28,.15,28,K.marble,side*14,2.45,0);
    box(9.3,.6,.18,K.marble,side*9.35,1.85,14);box(9.3,.15,.28,K.marble,side*9.35,2.45,14);
  }
  box(28,.6,.18,K.marble,0,1.85,-14);box(28,.15,.28,K.marble,0,2.45,-14);
  for(let t=-14;t<=14;t+=2){for(const side of [-1,1])box(.26,1.1,.26,K.marble,side*14,2.05,t);box(.26,1.1,.26,K.marble,t,2.05,-14);if(Math.abs(t)>4.5)box(.26,1.1,.26,K.marble,t,2.05,14);}
  // Broad front stairs and a front opening, no invented 8m castle platform.
  for(let i=0;i<9;i++)box(9,.17,4.5-i*.46,K.marble,0,.085+i*.17,14.7+(4.5-i*.46)/2);
  const walls=(half,y,h)=>{
    box(half*2-.5,h,half*2-.5,K.wall,0,y+h/2,0);
    g.add(colonnade({sides:4,rx:half,rz:half,y,h,mats:K,pitch:3.1,r:.29}));
    g.add(latticeWall({sides:4,rx:half-.16,rz:half-.16,y:y+.65,h:h*.60,mats:K,inset:.02}));
  };
  // Ground floor, wraparound veranda and the first low eave.
  walls(7.8,1.5,6.6);
  g.add(colonnade({sides:4,rx:10,rz:10,y:1.5,h:5.7,mats:K,pitch:3.25,r:.32}));
  g.add(dougong({sides:4,rx:10,rz:10,y:6.2,pitch:1.3,mats:K,scale:.72}));
  g.add(polyRoof({sides:4,rx:9.6,rz:9.6,h:1.7,ridge:8,over:1.7,curl:.55,y:7,rows:6,segs:12,mats:roofs}));
  // Balcony at the second floor. Dark timber rails and a white wall band.
  box(19.3,.4,19.3,K.woodDark,0,8.2,0);
  g.add(balustrade({sides:4,rx:9.35,rz:9.35,y:8.4,mats:K,mat:K.woodDark,postMat:K.woodDark,post:1.05,panel:.48,pitch:1.25}));
  walls(7.6,8.4,5.5);
  g.add(colonnade({sides:4,rx:9.0,rz:9.0,y:8.4,h:5.5,mats:K,pitch:3,r:.28}));
  g.add(dougong({sides:4,rx:9,rz:9,y:12.8,pitch:1.15,mats:K,scale:.9}));
  g.add(polyRoof({sides:4,rx:9,rz:9,h:1.8,ridge:7,over:2.1,curl:.7,y:13.75,rows:6,segs:12,mats:roofs}));
  // Exposed bracket/attic zone under the third roof, not a third occupied storey.
  box(14.3,2.25,14.3,K.woodDark,0,15.7,0);
  g.add(colonnade({sides:4,rx:7.7,rz:7.7,y:14.55,h:2.5,mats:K,pitch:2.6,r:.23}));
  g.add(dougong({sides:4,rx:8,rz:8,y:16.3,pitch:1.15,mats:K,scale:.8}));
  const topRoof=polyRoof({sides:4,rx:8.1,rz:8.1,h:4.25,ridge:7.0,over:2.8,curl:.9,y:17.0,rows:8,segs:14,mats:roofs});
  // Ridge runs front/back; the front triangular gable is visible in the user's photo.
  topRoof.rotation.y=Math.PI/2;g.add(topRoof);
  const triangle=new THREE.Shape();triangle.moveTo(-3.5,0);triangle.lineTo(3.5,0);triangle.lineTo(0,3.4);triangle.closePath();
  for(const side of [-1,1]){
    const face=new THREE.Mesh(new THREE.ShapeGeometry(triangle),K.ridge);face.position.set(0,18,side*4.8);if(side<0)face.rotation.y=Math.PI;g.add(face);
    for(let i=0;i<7;i++)box(2.4-i*.27,.09,.08,K.woodDark,0,18.4+i*.35,side*4.85);
  }
  // Protruding entrance roof with its characteristic small triangular gable.
  const porch=polyRoof({sides:4,rx:2.9,rz:2.4,h:1.9,ridge:2.4,over:1.15,curl:.5,y:6.4,rows:6,segs:10,mats:roofs});porch.rotation.y=Math.PI/2;porch.position.z=10.2;g.add(porch);
  for(const x of [-2.7,2.7])box(.38,4.9,.38,K.woodDark,x,3.95,11.5);
  const sign=plaque('逍遥楼',3.8,.95,'#292821','#cab981');sign.position.set(0,5.45,11.8);g.add(sign);
  // Entrance doorway remains visibly dark and recessed.
  box(3.8,3.7,.12,K.dark,0,3.35,7.65);
  const light=new THREE.PointLight(0xffcc85,28,55,1.7);light.position.set(0,6,13);g.add(light);
  g.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(g);
  g.scale.y=24/(bounds.max.y-bounds.min.y);
  g.rotation.y=ringAngle(F.xiaoyaolou.o)+Math.PI/2;
  g.position.set(F.xiaoyaolou.c[0],0,F.xiaoyaolou.c[1]);g.userData.top=24;
  // The western plaza is above the riverside road. Keep both platform and
  // tower within 24m; the visible east retaining wall is not another 8m tower.
  g.scale.y*=21/24;g.position.y=3;
  const root=new THREE.Group();root.add(g);
  const base=new THREE.Mesh(new THREE.BoxGeometry(37,3,42),K.stoneBase);
  base.position.set(F.xiaoyaolou.c[0],1.5,F.xiaoyaolou.c[1]);base.rotation.y=g.rotation.y;root.add(base);
  // Terraced approach links back down to the mapped alley / front square.
  for(let i=0;i<12;i++){
    const step=new THREE.Mesh(new THREE.BoxGeometry(2.2,.25*(i+1),18),K.stoneBase);
    step.position.set(F.xiaoyaolou.c[0]-43+i*2.2,.125*(i+1),F.xiaoyaolou.c[1]);root.add(step);
  }
  root.userData.top=24;return root;
}
export const night=applyNight;
