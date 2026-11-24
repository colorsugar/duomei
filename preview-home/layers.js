(()=>{
const $=id=>document.getElementById(id),Q=s=>[...document.querySelectorAll(s)];const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,L=(a,b,t)=>a+(b-a)*t;
const S=[['hero',.6,0,'多美'],['zaobao',2.8,0,'报晨纸'],['xiaoji',7,1,'记旅光'],['kuaihuo',11.2,1,'快活'],['guyu',15.2,1,'故语书'],['xunji',19.2,0,'寻迹路'],['dalu',22.4,1,'山海城'],['yunyou',28,1,'云游'],['color',33.7,0,'色'],['weiyan',37.4,0,'风云灯'],['skill',40.2,1,'技'],['foot',42.5,0,'多美']];
let sd=7;const R=()=>{sd=(sd*16807)%2147483647;return sd/2147483647};const its=[];
const hf=document.createElement('section');hf.className='sec';hf.id='herofx';hf.style.cssText='z-index:51;background:transparent';$('hero').after(hf);
S.forEach(([id,cen,dark,chars])=>{const sec=id==='hero'?hf:$(id),b=document.createElement('div'),f=document.createElement('div');b.className='dl dl-b';f.className='dl dl-f';sec.prepend(b);sec.append(f);
const add=(e,layer,dep,rot=0,spin=0)=>{layer.append(e);its.push({e,cen,id,x:R()*100,y:R()*100,dep,rot,spin})};
[...chars].forEach(c=>{const e=document.createElement('b');e.className='dl-ch';e.textContent=c;e.style.color=dark?'rgba(255,255,255,.04)':'rgba(42,33,27,.04)';e.style.fontSize=35+R()*15+'vmin';add(e,b,.2+R()*.2)});
for(let i=0;i<4;i++){const e=document.createElement('i');e.className='dl-ln';e.style.width=20+R()*40+'vw';e.style.background=dark?'#fff4':'#2a211b33';add(e,b,.4+R()*.2)}
for(let i=0;i<9;i++){const e=document.createElement('i');e.className='dl-dot';const z=3+R()*18;e.style.width=e.style.height=z+'px';e.style.background=i%2?(dark?'#F3EAD9':'#8E1C1E'):'#F2A65A';e.style.opacity=.2+R()*.25;if(z>14)e.style.filter='blur(3px)';add(e,i%3?b:f,.7+R())}
for(let i=0;i<4;i++){const e=document.createElement('i');e.className='dl-sc';const pet=['kuaihuo','yunyou','weiyan','foot'].includes(id);e.style.cssText=`width:${10+R()*18}px;height:${10+R()*18}px;background:${pet?'#F6A5A8':'#F3EAD9'};border-radius:${pet?'90% 0 90% 0':'1px'};opacity:.65`;add(e,f,1.2+R(),R()*360,(R()-.5)*100)}
const light=document.createElement('i');light.className='dl-sweep';f.append(light);its.push({e:light,cen,sweep:1});
});
// A single persistent element changes its form and travels across every handoff.
const K=[[0,50,88,8,8,50,'#8E1C1E'],[1.9,50,23,600,2,0,'#2a211b'],[5.4,9,31,24,24,8,'#E8473F'],[10.6,90,82,38,38,50,'#F6A5A8'],[14.2,50,92,180,3,0,'#E8473F'],[18.6,80,70,14,14,50,'#8E1C1E'],[21.8,86,14,34,34,50,'#ffe9b8'],[27,94,50,2,110,0,'#ffffff'],[31.2,50,30,22,22,0,'#F2A65A'],[33.9,8,86,40,56,8,'#F3EAD9'],[37,88,24,2,150,0,'#8E1C1E'],[39.8,6,14,10,10,50,'#4D9A44'],[42.8,50,80,8,8,50,'#8E1C1E']];
const token=document.createElement('div');token.id='token';document.body.append(token);let last=null,vel=0,lc=null;
window.__layers=(u,clk)=>{const W=innerWidth,H=innerHeight,k=Math.min(W,H)/900;hf.style.visibility=$('hero').style.visibility;hf.style.opacity=$('hero').style.opacity;
if(clk!==lc){const du=last==null?0:u-last;last=u;lc=clk;vel+=(cl(du*30,-3,3)-vel)*.25}
its.forEach(o=>{if(o.sweep){const p=cl((u-o.cen+3)/6);o.e.style.transform=`translateX(${L(-70,170,p)}vw) rotate(18deg)`;o.e.style.opacity=.45*Math.sin(Math.PI*p);return}
const span=H*1.5;let y=o.y/100*span-(u-o.cen)*o.dep*H*.9;y=((y%span)+span)%span-H*.25;
o.e.style.transform=`translate3d(${o.x/100*W+Math.sin(clk*.8+o.x)*o.dep*5}px,${y}px,0) rotate(${o.rot+u*o.spin}deg)`});
Q('.sec .head').forEach(h=>{const c=S.find(s=>s[0]===h.closest('.sec').id);if(c){h.style.translate=`0 ${-(u-c[1])*2.5}vh`;h.style.rotate=`x ${cl(-vel*3,-6,6)}deg`}});
Q('.dl-f').forEach(f=>f.style.rotate=`x ${cl(vel*2,-4,4)}deg`);
let i=0;while(i<K.length-2&&u>K[i+1][0])i++;const A=K[i],B=K[i+1],t=io(cl((cl((u-A[0])/(B[0]-A[0]))-.45)/.55)),w=L(A[3],B[3],t)*k,h=L(A[4],B[4],t)*k;
const ca=[1,3,5].map(j=>parseInt(A[6].slice(j,j+2),16)),cb=[1,3,5].map(j=>parseInt(B[6].slice(j,j+2),16));const co=`rgb(${ca.map((v,j)=>Math.round(L(v,cb[j],t))).join(',')})`;
token.style.cssText=`width:${w}px;height:${h}px;background:${co};border-radius:${L(A[5],B[5],t)}%;transform:translate(${L(A[1],B[1],t)/100*W-w/2}px,${L(A[2],B[2],t)/100*H-h/2}px) rotate(${Math.sin(Math.PI*t)*90}deg);box-shadow:0 0 ${Math.sin(Math.PI*t)*30}px ${co};opacity:${u>42.9?0:1}`;
};})();
