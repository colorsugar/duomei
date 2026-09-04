import * as THREE from 'three';
export function createCityMaterial(){
 const paint=(lit)=>{const c=document.createElement('canvas');c.width=256;c.height=256;const g=c.getContext('2d');
  g.fillStyle=lit?'#020202':'#dedbd3';g.fillRect(0,0,256,256);
  for(let row=0;row<2;row++)for(let col=0;col<3;col++){
   const x=12+col*83,y=23+row*128;
   if(lit){g.fillStyle=(col+row)%3?'#f4c889':'#13161a';g.fillRect(x+5,y+7,46,69);continue;}
   g.fillStyle='#a2a19b';g.fillRect(x-2,y-2,60,89);
   g.fillStyle='#424d52';g.fillRect(x+3,y+3,50,75);
   const grad=g.createLinearGradient(x,y,x+40,y+80);grad.addColorStop(0,'#708c9a');grad.addColorStop(.5,'#46545d');grad.addColorStop(1,'#a0b4b9');g.fillStyle=grad;g.fillRect(x+5,y+7,46,69);
   g.fillStyle='#c4c3b9';g.fillRect(x+27,y+5,2,73);g.fillRect(x+4,y+40,48,2);
   g.fillStyle='#efeee5';g.fillRect(x-3,y+82,64,5);g.fillStyle='#8e908c';g.fillRect(x-2,y+87,62,3);
  }
  if(!lit){g.fillStyle='#b4b4ad';g.fillRect(0,124,256,3);g.fillRect(0,252,256,3);}
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;
 };
 const m=new THREE.MeshStandardMaterial({vertexColors:true,map:paint(false),emissiveMap:paint(true),emissive:0xffc77d,emissiveIntensity:0,roughness:.87});
 m.onBeforeCompile=s=>{
  s.vertexShader='varying float vCityRoof;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvCityRoof=step(.5,normal.y);');
  s.fragmentShader='varying float vCityRoof;\n'+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <map_fragment>','if(vCityRoof<.5){\n#include <map_fragment>\n}');
  s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','if(vCityRoof<.5){\n#include <emissivemap_fragment>\n}else{totalEmissiveRadiance=vec3(0.); }');
 };
 m.customProgramCacheKey=()=> 'guilin-window-facades-v1';return m;
}
export function cityUV(g){const p=g.attributes.position,n=g.attributes.normal,uv=new Float32Array(p.count*2);for(let i=0;i<p.count;i++){uv[i*2]=(Math.abs(n.getX(i))>.5?p.getZ(i):p.getX(i))/9;uv[i*2+1]=p.getY(i)/6.4;}g.setAttribute('uv',new THREE.BufferAttribute(uv,2));}
