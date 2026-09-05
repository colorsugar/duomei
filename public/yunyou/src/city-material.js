import * as THREE from 'three';
// Windows follow facade coordinates. A unique world cell controls occupancy;
// the wall keeps its real albedo instead of being recolored as a luminous box.
export function createCityMaterial(){
 const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,emissive:0xffffff,emissiveIntensity:0});
 const night={value:0};m.userData.setNight=v=>{night.value=v;};
 m.onBeforeCompile=s=>{
  s.uniforms.cityNight=night;
  s.vertexShader='varying vec3 vCityPosition; varying vec3 vCityNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPosition=position; vCityNormal=normal;');
  s.fragmentShader=`uniform float cityNight; varying vec3 vCityPosition; varying vec3 vCityNormal;
float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 bool facade=abs(vCityNormal.y)<.5;
 float wallAxis=abs(vCityNormal.x)>.5?vCityPosition.z:vCityPosition.x;
 vec2 cell=vec2(wallAxis/3.25,vCityPosition.y/3.2);
 vec2 f=fract(cell); vec2 edge=min(f,1.-f);
 vec2 aa=max(fwidth(cell),vec2(.001));
 float detail=1.-smoothstep(.28,.70,max(aa.x,aa.y));
 vec2 pane=smoothstep(vec2(.20,.23)-aa,vec2(.20,.23)+aa,edge);
 vec2 frame=smoothstep(vec2(.175,.205)-aa,vec2(.175,.205)+aa,edge);
 float windowMask=pane.x*pane.y*detail*step(1.6,vCityPosition.y);
 float frameMask=frame.x*frame.y*detail*step(1.6,vCityPosition.y);
 float wallDepth=abs(vCityNormal.x)>.5?vCityPosition.x:vCityPosition.z;
 float seed=cityHash(floor(cell)+vec2(floor(wallDepth*.17),0.));
 if(facade){
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.70,frameMask);
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.07,.13,.16)*(0.75+seed*.6),windowMask);
  float band=(1.-smoothstep(.015-aa.y,.015+aa.y,edge.y))*detail;diffuseColor.rgb*=1.-band*.14;
 }
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 if(facade){
  float occupied=step(.72,seed);
  vec3 warmth=mix(vec3(1.,.56,.24),vec3(.61,.77,1.),step(.91,seed));
  totalEmissiveRadiance=warmth*windowMask*occupied*cityNight*(.22+.24*seed);
 }else{totalEmissiveRadiance=vec3(0.);}
 `);
 };
 m.customProgramCacheKey=()=> 'guilin-window-facades-v3';return m;
}
export function cityUV(g){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/9;uv[i*2+1]=p.getY(i)/6.4;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
