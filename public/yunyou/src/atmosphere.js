// Analytic sky with sun glow and horizon haze, analytic river ripples, and a
// sky-derived environment map so metal, glaze and water reflect the real sky.
import * as THREE from 'three';
const SKY_GLSL=`
vec3 skyColor(vec3 d, vec3 sunDir, float night){
 float h=max(d.y,0.);
 vec3 zenith=vec3(.010,.052,.24), horizon=vec3(.30,.40,.53);
 vec3 day=mix(horizon,zenith,pow(h,.5));
 float s=max(dot(d,sunDir),0.);
 day+=vec3(1.,.78,.50)*(pow(s,5.)*.12+pow(s,40.)*.3);
 day+=vec3(1.,.95,.86)*smoothstep(.99955,.9998,s)*8.;
 day=mix(day,horizon*vec3(1.02,1.,.97),exp(-h*9.)*.55);
 vec3 dusk=mix(vec3(.030,.046,.085),vec3(.006,.013,.034),pow(h,.5));
 dusk+=vec3(.05,.07,.11)*exp(-h*7.);
 vec3 c=mix(day,dusk,night);
 if(d.y<0.)c=mix(c,mix(vec3(.46,.52,.52),vec3(.02,.03,.045),night),min(-d.y*5.,1.));
 return c;
}`;
export const HORIZON_DAY=new THREE.Color().setRGB(.31,.40,.52),HORIZON_NIGHT=new THREE.Color().setRGB(.05,.073,.12);
export function createAtmosphere(waterMaterial){
 const uniforms={uTime:{value:0},uNight:{value:0},uSunDir:{value:new THREE.Vector3(.45,.6,.66).normalize()}};
 waterMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec3 vRiverWorld;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvRiverWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader='uniform float uTime;\nuniform float uNight;\nvarying vec3 vRiverWorld;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    vec2 q = vRiverWorld.xz;
    float a = dot(q,vec2(.43,.19)) + uTime*.9;
    float b = dot(q,vec2(-.21,.73)) - uTime*1.3;
    float c = dot(q,vec2(1.13,.54)) + uTime*1.6;
    float e = dot(q,vec2(-2.3,1.7)) + uTime*2.3;
    vec2 slope = vec2(.43,.19)*cos(a)*.05 + vec2(-.21,.73)*cos(b)*.035 + vec2(1.13,.54)*cos(c)*.016 + vec2(-2.3,1.7)*cos(e)*.006;
    // Ripples fade with distance so the far river reads as a calm mirror, not a tiled pattern.
    slope *= 1.0 / (1.0 + length(cameraPosition.xz - q) * .004);
    vec3 riverNormal = normalize(vec3(-slope.x,1.,-slope.y));
    normal = normalize(mat3(viewMatrix) * riverNormal);
  `);
 };
 waterMaterial.customProgramCacheKey=()=> 'guilin-river-ripples-v2';
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{uNight:uniforms.uNight,uSunDir:uniforms.uSunDir},
 vertexShader:'varying vec3 vSky; void main(){vSky=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec3 vSky; uniform float uNight; uniform vec3 uSunDir;${SKY_GLSL}
 void main(){gl_FragColor=vec4(skyColor(normalize(vSky),uSunDir,uNight),1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(13000,48,24),skyMat);sky.renderOrder=-2;sky.frustumCulled=false;
 sky.onBeforeRender=(_r,_s,camera)=>{sky.position.copy(camera.position);sky.updateMatrixWorld();};
 // Environment maps for day and night are baked once from the same sky.
 const envs={};
 function bakeEnvironment(renderer){
  const pmrem=new THREE.PMREMGenerator(renderer),envScene=new THREE.Scene(),probe=new THREE.Mesh(new THREE.SphereGeometry(100,48,24),skyMat);
  envScene.add(probe);const old=uniforms.uNight.value;
  for(const [k,n] of [['day',0],['night',1]]){uniforms.uNight.value=n;envs[k]=pmrem.fromScene(envScene,0,1,1000).texture;}
  uniforms.uNight.value=old;probe.geometry.dispose();pmrem.dispose();return envs;
 }
 return {sky,bakeEnvironment,envs,setSun:dir=>{uniforms.uSunDir.value.copy(dir).normalize();},setNight:n=>{uniforms.uNight.value=n;},update:dt=>{uniforms.uTime.value+=dt;}};
}
