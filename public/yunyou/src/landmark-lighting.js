import * as THREE from 'three';
// Four local facade lights, shared by the selected landmark; no extra shadow pass.
// These illuminate materials and adjacent paving rather than making roads emissive.
export function createLandmarkLighting(scene){
 const lamps=Array.from({length:4},()=>{const l=new THREE.SpotLight(0xffc17a,0,110,.68,.8,2);l.castShadow=false;scene.add(l,l.target);return l;});
 let mode=0,active=null;
 const eligible=l=>l&&l.id!=='xiaoyaolou'&&['building','pagoda'].includes(l.kind);
 function apply(){
  const l=eligible(active)?active:null;
  for(let i=0;i<lamps.length;i++){
   const lamp=lamps[i];lamp.visible=!!l&&mode>.01;
   if(!l)continue;
   const r=THREE.MathUtils.clamp((l.span||100)*.11,12,38),angle=Math.PI/4+i*Math.PI/2;
   lamp.position.set(l.x+Math.cos(angle)*r,3.5,l.z+Math.sin(angle)*r);
   lamp.target.position.set(l.x,Math.max(7,(l.h||20)*.43),l.z);lamp.target.updateMatrixWorld();
   lamp.distance=r*4;lamp.intensity=(l.id==='qixiasi'?950:1700)*mode;
   lamp.color.setHex(l.id==='yueta'?0xb7d7ee:0xffb65e);
  }
 }
 return {setNight:value=>{mode=value;apply();},focus:lm=>{if(active!==lm){active=lm;apply();}}};
}
