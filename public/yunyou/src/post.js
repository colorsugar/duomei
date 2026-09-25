// HDR composer: multisampled scene, soft bloom for lamps and sun glints, then
// tone mapping with a light photographic grade (contrast, warmth, vignette)
// folded into the output pass so the chain stays at three full-screen passes.
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
const GRADE=`
  {
   vec3 c=gl_FragColor.rgb;
   float l=dot(c,vec3(.2126,.7152,.0722));
   c=mix(vec3(l),c,mix(1.10,1.04,uNight));
   c=mix(c,c*c*(3.-2.*c),mix(.22,.12,uNight));
   c*=mix(vec3(1.02,1.0,.965),vec3(.97,1.0,1.05),uNight);
   vec2 p=(vUv-.5)*vec2(uAspect,1.);
   c*=1.-smoothstep(.45,1.15,length(p))*mix(.28,.4,uNight);
   gl_FragColor.rgb=c;
  }
 }`;
export function createPost(renderer,scene,camera){
 const size=renderer.getDrawingBufferSize(new THREE.Vector2());
 // High-DPR screens hide edge aliasing, so MSAA drops to 2x there; the HDR buffer is the main cost.
 const target=new THREE.WebGLRenderTarget(size.x,size.y,{type:THREE.HalfFloatType,samples:renderer.getPixelRatio()>=1.5?2:4});
 const composer=new EffectComposer(renderer,target);
 composer.addPass(new RenderPass(scene,camera));
 const bloom=new UnrealBloomPass(new THREE.Vector2(size.x,size.y),.2,.5,1.1);
 // Bloom is a blur: run its mip chain at half resolution.
 const bloomSetSize=bloom.setSize.bind(bloom);bloom.setSize=(w,h)=>bloomSetSize(Math.ceil(w/2),Math.ceil(h/2));
 composer.addPass(bloom);
 const output=new OutputPass();
 output.uniforms.uNight={value:0};output.uniforms.uAspect={value:1};
 const fs=output.material.fragmentShader,end=fs.lastIndexOf('}');
 output.material.fragmentShader=fs.slice(0,end).replace('varying vec2 vUv;','varying vec2 vUv;\nuniform float uNight;\nuniform float uAspect;')+GRADE;
 composer.addPass(output);
 const resize=()=>{composer.setPixelRatio(renderer.getPixelRatio());composer.setSize(innerWidth,innerHeight);output.uniforms.uAspect.value=innerWidth/innerHeight;};
 resize();
 return {composer,resize,render:()=>composer.render(),setNight(m){
  bloom.strength=THREE.MathUtils.lerp(.16,.85,m);bloom.threshold=THREE.MathUtils.lerp(1.15,.55,m);bloom.radius=THREE.MathUtils.lerp(.45,.6,m);output.uniforms.uNight.value=m;
 }};
}
