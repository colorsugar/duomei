// Distant fenglin: the ring of karst towers that frames every Guilin skyline,
// plus farmland ground beyond the mapped city. Pure scenery, fogged into the
// horizon; positions are procedural, not surveyed peaks.
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const rand=(()=>{let s=20260926;return()=>((s=Math.imul(s^s>>>15,0x2c1b3c6d)+0x6d2b79f5|0)>>>0)/4294967296;})();
function peakGeometry(seed){
 const pts=[];for(let i=0;i<=14;i++){const t=i/14,r=Math.pow(1-Math.pow(t,2.4),.55)*(1+.08*Math.sin(t*9+seed));pts.push(new THREE.Vector2(Math.max(r,.02),t));}
 const g=new THREE.LatheGeometry(pts,22),p=g.attributes.position,col=new Float32Array(p.count*3),v=new THREE.Vector3();
 const cliff=new THREE.Color(0x7c8479),moss=new THREE.Color(0x3f5a3a),foot=new THREE.Color(0x2e4630),c=new THREE.Color();
 for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);const a=Math.atan2(v.z,v.x);
  const n=Math.sin(a*3+seed)*.5+Math.sin(a*7-seed*2+v.y*6)*.3+Math.sin(v.y*11+a*2)*.2;
  const k=1+n*.13*(1-v.y*.4);v.x*=k;v.z*=k;p.setXYZ(i,v.x,v.y,v.z);
  const bare=THREE.MathUtils.smoothstep(Math.sin(a*5+seed*3+v.y*4),.15,.8)*(v.y>.12&&v.y<.85?1:0);
  c.copy(foot).lerp(moss,Math.min(1,v.y*3)).lerp(cliff,bare*.75);col.set([c.r,c.g,c.b],i*3);}
 g.setAttribute('color',new THREE.BufferAttribute(col,3));g.computeVertexNormals();return g;
}
export function createKarstHorizon({center=new THREE.Vector3(50,0,220),inner=4300,outer=13000,count=170}={}){
 const group=new THREE.Group();group.name='karst-horizon';
 const variants=[0,1.7,3.1,4.6,6.2].map(peakGeometry),geos=[],m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(),pos=new THREE.Vector3();
 // Clusters rather than a uniform ring, like the real peak forest around the city.
 const clusters=Array.from({length:22},()=>{const a=rand()*Math.PI*2,d=inner+rand()*(outer-inner);return [Math.cos(a)*d,Math.sin(a)*d];});
 for(let i=0;i<count;i++){
  const [cx,cz]=clusters[i%clusters.length],spread=260+rand()*520,a=rand()*Math.PI*2,r=Math.sqrt(rand())*spread;
  const x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(Math.hypot(x,z)<inner)continue;
  const d=Math.hypot(x,z),h=(60+Math.pow(rand(),1.6)*230)*Math.min(1,.55+d/14000),w=h*(.38+rand()*.28);
  pos.set(center.x+x,-2,center.z+z);q.setFromAxisAngle(new THREE.Vector3(0,1,0),rand()*6.28);s.set(w,h,w*(.75+rand()*.5));
  const g=variants[i%variants.length].clone();g.applyMatrix4(m.compose(pos,q,s));geos.push(g);
 }
 const peaks=new THREE.Mesh(mergeGeometries(geos),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.95,metalness:0}));
 geos.forEach(g=>g.dispose());variants.forEach(g=>g.dispose());
 peaks.name='karst-peaks';peaks.receiveShadow=false;peaks.castShadow=false;group.add(peaks);
 return {group,peaks};
}
// Ground tint: city soil near the map, paddy/orchard green further out.
export function tintGroundFar(material,center=new THREE.Vector3(50,0,220)){
 material.onBeforeCompile=shader=>{
  shader.uniforms.uGroundCenter={value:center};
  shader.vertexShader='varying vec3 vGroundWorld;\n'+shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvGroundWorld=(modelMatrix*vec4(transformed,1.0)).xyz;');
  shader.fragmentShader='uniform vec3 uGroundCenter;\nvarying vec3 vGroundWorld;\n'+shader.fragmentShader.replace('#include <map_fragment>',`#include <map_fragment>
   float gd=length(vGroundWorld.xz-uGroundCenter.xz);
   float fields=sin(vGroundWorld.x*.011)*sin(vGroundWorld.z*.0093)*.5+.5;
   vec3 farm=mix(vec3(.16,.22,.11),vec3(.24,.28,.15),fields);
   farm*=diffuse/vec3(.42,.46,.40);
   diffuseColor.rgb=mix(diffuseColor.rgb,farm,smoothstep(2300.,3600.,gd));`);
 };
 material.customProgramCacheKey=()=>'guilin-ground-far-v1';
}
