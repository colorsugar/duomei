import * as THREE from 'three';
import { Water } from 'three/addons/objects/Water.js';
// Reflective river uses the same actual scene geometry, including ships, roofs
// and hills. The inexpensive material remains available in the flow preset.
export function createRiverReflection(geometry,{mobile=false}={}) {
 const normals=new THREE.TextureLoader().load(new URL('../assets/tex/waternormals.jpg',import.meta.url).href);
 normals.wrapS=normals.wrapT=THREE.RepeatWrapping;
 const flat=geometry.clone();flat.translate(0,-.3,0);flat.rotateX(Math.PI/2);
 const water=new Water(flat,{textureWidth:mobile?768:1024,textureHeight:mobile?768:1024,waterNormals:normals,sunDirection:new THREE.Vector3(.45,.75,.45),sunColor:0xfff1d8,waterColor:0x477769,distortionScale:2.1,fog:true});
 water.rotation.x=-Math.PI/2;water.position.y=.305;
 water.material.uniforms.size.value=1.1;
 const reflect=water.onBeforeRender,lastPosition=new THREE.Vector3(Infinity,Infinity,Infinity),lastRotation=new THREE.Quaternion();let lastTime=-Infinity,quality='high';
 water.onBeforeRender=(renderer,scene,camera)=>{
  const now=performance.now(),moving=lastPosition.distanceToSquared(camera.position)>.01||1-Math.abs(lastRotation.dot(camera.quaternion))>1e-6;
  water.material.uniforms.eye.value.copy(camera.position);
  // Still water reflections refresh for animated boats; active camera stays exact.
  if(!moving&&now-lastTime<(quality==='high'?90:180))return;
  reflect(renderer,scene,camera);lastTime=now;lastPosition.copy(camera.position);lastRotation.copy(camera.quaternion);
 };
 return {water,setQuality:q=>{quality=q;water.visible=q!=='flow';lastTime=-Infinity;},update:dt=>{water.material.uniforms.time.value+=dt*.25;},setNight:(n,sunDirection)=>{
  water.material.uniforms.sunColor.value.setHex(0xfff1d8).lerp(new THREE.Color(0x819cc9),n);
  water.material.uniforms.waterColor.value.setHex(0x477769).lerp(new THREE.Color(0x102b2a),n);
  water.material.uniforms.sunDirection.value.copy(sunDirection).normalize();lastTime=-Infinity;
 }};
}
