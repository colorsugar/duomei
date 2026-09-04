// One-pass sky and analytic ripples. No reflection render target or bloom pass.
import * as THREE from 'three';
export function createAtmosphere(waterMaterial){
 const uniforms={uTime:{value:0},uNight:{value:0}};
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
    vec2 slope = vec2(.43,.19)*cos(a)*.09 + vec2(-.21,.73)*cos(b)*.055 + vec2(1.13,.54)*cos(c)*.022;
    vec3 riverNormal = normalize(vec3(-slope.x,1.,-slope.y));
    normal = normalize(mat3(viewMatrix) * riverNormal);
    float crest = sin(a)*.5 + sin(b)*.3 + sin(c)*.2;
    diffuseColor.rgb *= 1.0 + crest*.07;
  `);
 };
 waterMaterial.customProgramCacheKey=()=> 'guilin-river-ripples-v1';
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{uNight:uniforms.uNight},
 vertexShader:'varying vec3 vSky; void main(){vSky=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
 fragmentShader:`varying vec3 vSky; uniform float uNight;
 void main(){vec3 d=normalize(vSky);float h=pow(max(d.y,0.),.52);
 vec3 day=mix(vec3(.73,.81,.82),vec3(.27,.49,.67),h);
 float glow=pow(max(dot(d,normalize(vec3(.5,.35,.7))),0.),24.);
 day+=vec3(.20,.13,.045)*glow;
 vec3 night=mix(vec3(.047,.077,.12),vec3(.012,.025,.055),h);
 gl_FragColor=vec4(mix(day,night,uNight),1.0);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
 }`});
 const sky=new THREE.Mesh(new THREE.SphereGeometry(13000,24,12),skyMat);sky.renderOrder=-2;sky.frustumCulled=false;
 return {sky,setNight:n=>{uniforms.uNight.value=n;},update:dt=>{uniforms.uTime.value+=dt;}};
}
