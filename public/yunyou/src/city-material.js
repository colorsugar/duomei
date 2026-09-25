import * as THREE from 'three';
// Windows follow facade coordinates. A unique world cell controls occupancy;
// the wall keeps its real albedo instead of being recolored as a luminous box.
// Optional per-building `facade` attribute (bay width, storey height, window
// width ratio, style bits) varies the grid; buildings without it keep defaults.
// Style bits: 1 balcony bands, 2 ground-floor shopfront, 4 ribbon windows, 8 tiled wall.
export function createCityMaterial(){
 const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.84,emissive:0xffffff,emissiveIntensity:0});
 const night={value:0};m.userData.setNight=v=>{night.value=v;};
 m.onBeforeCompile=s=>{
  s.uniforms.cityNight=night;
  s.vertexShader='attribute vec4 facade; varying vec3 vCityPosition; varying vec3 vCityNormal; varying vec4 vFacade;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityPosition=position; vCityNormal=normal; vFacade=facade;');
  s.fragmentShader=`uniform float cityNight; varying vec3 vCityPosition; varying vec3 vCityNormal; varying vec4 vFacade;
float cityHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float cityNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(cityHash(i),cityHash(i+vec2(1,0)),f.x),mix(cityHash(i+vec2(0,1)),cityHash(i+vec2(1,1)),f.x),f.y);}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
 bool custom=vFacade.x>.5;
 float bay=custom?vFacade.x:3.25, storey=custom?vFacade.y:3.2, winW=custom?vFacade.z:.60;
 float style=custom?vFacade.w:0.;
 bool balcony=mod(style,2.)>=1., shop=mod(floor(style/2.),2.)>=1., ribbon=mod(floor(style/4.),2.)>=1., tiled=mod(floor(style/8.),2.)>=1.;
 bool facade=abs(vCityNormal.y)<.5;
 vec2 wn=normalize(vCityNormal.xz+vec2(1e-5,0.)), wt=vec2(-wn.y,wn.x);
 float wallAxis=dot(vCityPosition.xz,wt);
 vec2 cell=vec2(wallAxis/bay,vCityPosition.y/storey);
 vec2 f=fract(cell); vec2 edge=min(f,1.-f);
 vec2 aa=max(fwidth(cell),vec2(.001));
 float detail=1.-smoothstep(.28,.70,max(aa.x,aa.y));
 float hx=ribbon?.04:(1.-winW)*.5, hy=.22;
 vec2 pane=smoothstep(vec2(hx,hy)-aa,vec2(hx,hy)+aa,edge);
 vec2 frame=smoothstep(vec2(hx-.03,hy-.03)-aa,vec2(hx-.03,hy-.03)+aa,edge);
 float lowest=shop?storey*1.15:1.6;
 float windowMask=pane.x*pane.y*detail*step(lowest,vCityPosition.y);
 float frameMask=frame.x*frame.y*detail*step(lowest,vCityPosition.y);
 float wallDepth=dot(vCityPosition.xz,wn);
 float seed=cityHash(floor(cell)+vec2(floor(wallDepth*.17),0.));
 float shopMask=0.;
 if(facade){
  // Weathering: rain streaks under sills and a darker plinth, varied per wall.
  float grime=cityNoise(vec2(wallAxis*.35,vCityPosition.y*.04))*.5+cityNoise(vec2(wallAxis*1.7,vCityPosition.y*.3))*.2;
  diffuseColor.rgb*=1.-.16*grime-.12*(1.-smoothstep(0.,2.5,vCityPosition.y));
  if(tiled)diffuseColor.rgb*=.94+.06*step(.5,fract(vCityPosition.y*6.))*step(.5,fract(wallAxis*6.));
  diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.70,frameMask);
  vec3 glass=mix(vec3(.06,.10,.12),vec3(.16,.22,.26),seed)*(1.+.4*step(.8,seed));
  diffuseColor.rgb=mix(diffuseColor.rgb,glass,windowMask);
  if(balcony){float slab=smoothstep(.0,.06,f.y)*(1.-smoothstep(.16,.22,f.y));diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*.78,slab*detail*step(lowest,vCityPosition.y));}
  if(shop&&vCityPosition.y<storey*1.05){shopMask=step(.08,edge.x)*step(.4,vCityPosition.y)*(1.-step(storey*.82,vCityPosition.y));diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.09,.10,.10),shopMask);
   float sign=step(storey*.84,vCityPosition.y)*(1.-step(storey*1.0,vCityPosition.y));diffuseColor.rgb=mix(diffuseColor.rgb,mix(vec3(.55,.12,.08),vec3(.10,.26,.36),step(.5,cityHash(floor(cell.xx)))),sign*.85);}
  float band=(1.-smoothstep(.015-aa.y,.015+aa.y,edge.y))*detail;diffuseColor.rgb*=1.-band*.14;
 }
 `);
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
 if(facade){
  float occupied=step(.72,seed);
  vec3 warmth=mix(vec3(1.,.56,.24),vec3(.61,.77,1.),step(.91,seed));
  totalEmissiveRadiance=warmth*windowMask*occupied*cityNight*(.22+.24*seed)+vec3(1.,.72,.42)*shopMask*cityNight*.55;
 }else{totalEmissiveRadiance=vec3(0.);}
 `);
 };
 m.customProgramCacheKey=()=> 'guilin-window-facades-v4';return m;
}
export function cityUV(g){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/9;uv[i*2+1]=p.getY(i)/6.4;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
