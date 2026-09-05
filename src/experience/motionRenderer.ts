import { swordTimeline } from './xianyouTimeline';
export type MotionFrame={progress:number;x:number;y:number;time:number};
export type MotionRenderer={draw:(frame:MotionFrame)=>void;resize:(width:number,height:number,dpr:number)=>void;dispose:()=>void};
const vertex=`
precision highp float;
attribute vec2 aUv;
uniform vec2 uFit,uOffset,uMouse;
uniform float uLayer,uTime,uAttack,uDolly;
varying vec2 vUv;
void main(){
 vUv=aUv; vec2 p=aUv;
 if(uLayer>.5){
   // Spatial weights keep the face and crown rigid while lower cloth and hair move.
   float cloth=smoothstep(.52,.92,p.y)*smoothstep(.46,.76,p.x);
   float hair=(1.-smoothstep(.64,.71,p.x))*smoothstep(.24,.49,p.y)*smoothstep(.46,.57,p.x);
   float ribbon=smoothstep(.82,.97,p.x)*smoothstep(.46,.67,p.y);
   p.x+=sin(uTime*1.55+p.y*10.)*.0045*cloth+sin(uTime*1.2+p.y*8.)*.007*hair;
   p.y+=sin(uTime*1.6+p.x*12.)*.005*ribbon+sin(uTime*1.35)*.0018;
   vec2 a=vec2(.23,.95),b=vec2(.72,.48),ab=b-a;
   float along=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);
   float distance=length(p-(a+ab*along));
   float sword=(1.-smoothstep(.065,.105,distance))*(1.-smoothstep(.75,.79,p.x));
   vec2 d=p-b;float r=uAttack*sword;
   p=b+mat2(cos(r),-sin(r),sin(r),cos(r))*d;
   float depth=1.+sword*(1.-along)*1.6;
   p+=uMouse*vec2(.011,.007)*depth;
   p=(p-vec2(.68,.48))*(1.+uDolly*.22)+vec2(.68,.48);
 }else{p+=uMouse*vec2(.003,.002);p=(p-.5)*(1.+uDolly*.035)+.5;}
 gl_Position=vec4((p*uFit+uOffset)*vec2(2.,-2.)+vec2(-1.,1.),0.,1.);
}`;
const fragment=`
precision mediump float;
uniform sampler2D uImage;
uniform float uLayer,uTime,uFlash;
varying vec2 vUv;
void main(){
 vec4 c=texture2D(uImage,vUv);
 if(uLayer>.5){
   // Generated chroma plate: isolate actual silhouette, then suppress edge spill.
   float key=min(c.r,c.b)-c.g;
   float alpha=1.-smoothstep(.16,.48,key);
   c.r=mix(c.r,min(c.r,c.g+.13),1.-alpha);
   c.b=mix(c.b,min(c.b,c.g+.13),1.-alpha);
   vec2 a=vec2(.23,.95),b=vec2(.72,.48),ab=b-a;
   float t=clamp(dot(vUv-a,ab)/dot(ab,ab),0.,1.);
   float d=length(vUv-(a+ab*t));
   float spiral=abs(d-(.025+sin(t*31.-uTime*2.4)*.017));
   float qi=(1.-smoothstep(.001,.005,spiral))*smoothstep(0.,.08,t)*(1.-smoothstep(.94,1.,t));
   float pulse=pow(max(0.,sin(t*17.-uTime*2.)),10.);
   float light=clamp(qi*(.55+uFlash)+pulse*exp(-d*60.)*.6,0.,.9);
   vec3 tint=vec3(.96,1.,.81);
   float outAlpha=alpha+light*(1.-alpha);
   vec3 rgb=(c.rgb*alpha+tint*light*(1.-alpha))/max(outAlpha,.001);
   gl_FragColor=vec4(mix(rgb,tint,light*alpha*.5),outAlpha);
 }else{gl_FragColor=vec4(c.rgb,1.);}
}`;
export function createMotionRenderer(canvas:HTMLCanvasElement,foreground:HTMLImageElement,background:HTMLImageElement):MotionRenderer|null{
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,premultipliedAlpha:false,powerPreference:'low-power'});if(!gl)return null;
 const shaders:WebGLShader[]=[],buffers:WebGLBuffer[]=[],textures:WebGLTexture[]=[];let program:WebGLProgram|null=null;
 const dispose=()=>{shaders.forEach(s=>gl.deleteShader(s));buffers.forEach(b=>gl.deleteBuffer(b));textures.forEach(t=>gl.deleteTexture(t));if(program)gl.deleteProgram(program);};
 try{
  const compile=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw Error();shaders.push(s);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error();return s;};
  program=gl.createProgram();if(!program)throw Error();gl.attachShader(program,compile(gl.VERTEX_SHADER,vertex));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error();gl.useProgram(program);
  const vertices:number[]=[],indices:number[]=[],cols=96,rows=60;
  for(let y=0;y<=rows;y++)for(let x=0;x<=cols;x++)vertices.push(x/cols,y/rows);
  for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){const a=y*(cols+1)+x,b=a+cols+1;indices.push(a,a+1,b,b,a+1,b+1);}
  for(const [target,data] of [[gl.ARRAY_BUFFER,new Float32Array(vertices)],[gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indices)]] as const){const b=gl.createBuffer();if(!b)throw Error();buffers.push(b);gl.bindBuffer(target,b);gl.bufferData(target,data,gl.STATIC_DRAW);}
  const attr=gl.getAttribLocation(program,'aUv');gl.enableVertexAttribArray(attr);gl.vertexAttribPointer(attr,2,gl.FLOAT,false,0,0);
  for(const img of [background,foreground]){const t=gl.createTexture();if(!t)throw Error();textures.push(t);gl.bindTexture(gl.TEXTURE_2D,t);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);}
  const uniform=(s:string)=>gl.getUniformLocation(program!,s);const u={fit:uniform('uFit'),offset:uniform('uOffset'),mouse:uniform('uMouse'),layer:uniform('uLayer'),time:uniform('uTime'),attack:uniform('uAttack'),dolly:uniform('uDolly'),flash:uniform('uFlash')};
  gl.uniform1i(uniform('uImage'),0);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
  let width=1,height=1;
  return {resize(w,h,dpr){width=w;height=h;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);gl.viewport(0,0,canvas.width,canvas.height);},draw(f){
   const t=swordTimeline(f.progress);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform2f(u.mouse,f.x,f.y);gl.uniform1f(u.time,f.time);gl.uniform1f(u.attack,t.attack);gl.uniform1f(u.dolly,t.dolly);gl.uniform1f(u.flash,t.flash);
   for(let layer=0;layer<2;layer++){
    const mobile=width<769;
    const fitX=layer===0?Math.max(1.04,height/width*1.776*1.04):mobile?1.8:Math.max(1.03,height/width*1.776);
    const fitY=fitX*width/height/1.776;
    const offsetX=layer===0?(1-fitX)*.65:mobile?-.65:(1-fitX)*.7;
    const offsetY=layer===0?(1-fitY)*.5:mobile?1-fitY-.10:1-fitY;
    gl.uniform1f(u.layer,layer);gl.uniform2f(u.fit,fitX,fitY);gl.uniform2f(u.offset,offsetX,offsetY);gl.bindTexture(gl.TEXTURE_2D,textures[layer]);gl.drawElements(gl.TRIANGLES,indices.length,gl.UNSIGNED_SHORT,0);
   }
  },dispose};
 }catch{dispose();return null;}
}
