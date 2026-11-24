(()=>{
const $=id=>document.getElementById(id),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),seg=(u,a,b)=>cl((u-a)/(b-a)),lerp=(a,b,t)=>a+(b-a)*t;
const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,oc=t=>1-Math.pow(1-t,3),qo=t=>1-Math.pow(1-t,4),ic=t=>t*t*t;
const back=t=>{const c=1.7;return 1+(c+1)*Math.pow(t-1,3)+c*Math.pow(t-1,2)};
const MOB=innerWidth<innerHeight,TOUCH=matchMedia('(pointer:coarse)').matches||'ontouchstart' in window;
// phone section slides track the finger at a constant rate; an eased scrub runs 3-5x finger speed mid-slide and stalls at both ends
const ez=(f,t)=>MOB?t:f(t);
let W=innerWidth,H=innerHeight,VH=innerHeight,lastResizeW=0;
window.__VH=()=>VH;
const split=el=>{el.innerHTML=[...el.textContent].map(c=>c===' '?'<span class="ch">&nbsp;</span>':`<span class="ch">${c}</span>`).join('');return Q('.ch',el)};
const LOG=window.__loadLog={};const T0=performance.now();
// ---------- on-demand loader ----------
function loadImgs(sec,eager=false){Q(`[data-sec="${sec}"] img[data-src]`).forEach(im=>{im.loading=eager?'eager':'lazy';im.decoding='async';im.onload=()=>{im.style.opacity=1;const p=im.closest('.ph');if(p)p.classList.remove('ph')};im.src=im.dataset.src;im.removeAttribute('data-src')})}
function track(sec,promises){LOG[sec]={start:Math.round(performance.now()-T0)};Promise.all(promises).then(()=>LOG[sec].end=Math.round(performance.now()-T0))}
const imgP=src=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>r(i);i.src=src});
const SECLOAD={
 zaobao:()=>{loadImgs('zaobao');return Q('[data-sec=zaobao] img').map(i=>new Promise(r=>i.complete?r():i.addEventListener('load',r)))},
 xiaoji:()=>{loadImgs('xiaoji');return Q('[data-sec=xiaoji] img').map(i=>new Promise(r=>i.complete?r():i.addEventListener('load',r)))},
 kuaihuo:()=>{const f=new FontFace('BrushK','url(f/brush-kh.woff)');document.fonts.add(f);return[f.load()]},
 guyu:()=>[],
 dalu:()=>{loadImgs('dalu');return Q('[data-sec=dalu] img').map(i=>new Promise(r=>i.complete?r():i.addEventListener('load',r)))},
 yunyou:()=>[imgP(`img/wander-${SET}.webp`).then(i=>WDI=i)],
 color:()=>{loadImgs('color');return Q('[data-sec=color] img').map(i=>new Promise(r=>i.complete?r():i.addEventListener('load',r)))},
 weiyan:()=>{const f=new FontFace('ZMX','url(f/zmx.woff2)');document.fonts.add(f);return[f.load()]},
 foot:()=>Q('[data-bg]').map(e=>{const s=e.dataset.bg;e.removeAttribute('data-bg');return imgP(s).then(()=>e.style.backgroundImage=`url(${s})`)})
};
const SBA=34.32,SBD=0,POST=1.55;
const CUTS=[[7.60,9.20],[15.80,17.20],[24.40,31.10]];
const CUTLEN=CUTS.reduce((n,[a,b])=>n+(b-a),0);
const SBA_C=SBA-CUTLEN;
function compactU(uOld){let u=uOld;for(const [a,b] of CUTS){if(uOld>=b)u-=(b-a);else if(uOld>a)u=a}return u}
function expandU(uc){let u=uc;for(const [a,b] of CUTS){if(u>=a)u+=(b-a)}return u}
let U0=0,HBC=0;window.__U2Y=v=>compactU(v)+(v>=SBA?POST:0);
const START={zaobao:2.3,xiaoji:4.3,kuaihuo:9.2,guyu:3.5,dalu:20.2,yunyou:23.6,color:34.4,weiyan:38.4,foot:44.2};
const done={};let GLB=null;
function demand(u){for(const k in START){if(!done[k]&&u>START[k]-2.2){done[k]=1;track(k,SECLOAD[k]())}}}
// yunyou frames
const SET=MOB?'m':'d',NF=20,SC=['hong','jiangnan','xiaoyuan','guilin'],FR=SC.map(()=>new Array(NF).fill(null));
function loadFrames(){const ps=[];SC.forEach((s,k)=>{for(let i=0;i<NF;i++){ps.push(imgP(`fr/${SET}/${s}/${String(i).padStart(2,'0')}.webp`).then(im=>FR[k][i]=im))}});return ps}
window.__preloadAll=async()=>{for(const k in START)if(!done[k]){done[k]=1;track(k,SECLOAD[k]())}await new Promise(r=>{const c=()=>Q('img:not([data-src])').every(i=>i.complete)&&Q('[data-bg]').length==0?r():setTimeout(c,80);c()});await document.fonts.ready};
// ---------- build DOM ----------
const SITE='https://duomei.site';
const NOTE_SLUGS=['tea-town-sunset','window-morning-note','duomei-paper-shadow','old-town-overlook','desk-camera-light','guilin-river-tea','note-1782966727392','guilin-matcha-parfait'];
window.__NOTE_SLUGS=NOTE_SLUGS;
const NOTES=[['江南古镇','2026.07.05','古镇夕照里的一杯茶','太阳落到屋檐后面，茶杯、木桌和空白本子忽然都有了慢下来的理由。'],['房间窗前','2026.07.04','窗前的今日小记','一扇窗、一页纸、一杯温水，足够把普通的一天重新打开。'],['纸页之间','2026.07.03','纸上的多美小记','有些日子不需要远行，只要把光影和心事安静地放在一张纸上。'],['老城高处','2026.07.02','在城上看见远处','近处是瓦檐和木栏，远处是雾里的城市，黄昏把两种生活轻轻放在一起。'],['木桌旁','2026.07.01','桌边光影和相机','相机放在桌角，笔记本摊开，墙上的影子把一个安静午后拉得很长。'],['桂林漓江','2026.06.30','漓江边的茶光','太阳落在水面上，小船慢慢经过，山影像一封从故乡寄来的信。'],['小记','2026.06.29','夏日秋荷','1 个标签 / 文字'],['桂林河岸','2026.06.29','山水边的一口甜','抹茶冰淇淋举到山水前，旅行忽然从宏大的风景变成一口具体的甜。']];
const cards=NOTES.map((n,i)=>{const d=document.createElement('div');d.className='card';d.dataset.cur='阅读';d.innerHTML=`<div class="im ph" data-sec="xiaoji"><img data-src="img/note${i}.webp" alt=""></div><small><span>${n[0]}</span><span>${n[1]}</span></small><h4>${n[2]}</h4><p>${n[3]}</p><a class="card-go" href="${SITE}/note/${NOTE_SLUGS[i]}">阅读全文 →</a>`;const a=d.querySelector('.card-go');a.addEventListener('click',e=>{if(window.__xjDragged){e.preventDefault();e.stopPropagation();return}e.stopPropagation()});$('cards').appendChild(d);return d});
const MX={xjCw:260,xjCh:320,xjRailH:400,dpanW:1200,blo:null};
const XJ={x:0,tgt:0,v:0,i:0,axis:null,p:null,landed:0};
(function setupXJ(){
  const rail=$('cards'), dots=$('cdots'), dotEls=[];
  if(dots){cards.forEach((_,i)=>{const b=document.createElement('b');b.dataset.i=i;if(i===0)b.className='on';dots.appendChild(b);dotEls.push(b)})}
  const syncDots=()=>dotEls.forEach((b,k)=>b.classList.toggle('on',k===XJ.i));
  const step=()=>{const cw=MX.xjCw||cards[0].offsetWidth||260,gap=MOB?W*.08:W*.035;return cw+gap};
  const maxX=()=>Math.max(0,step()*7);
  const rubber=nx=>{const m=maxX();return nx<0?nx*.38:(nx>m?m+(nx-m)*.38:nx)};
  const go=(i,instant=false)=>{
    XJ.i=Math.max(0,Math.min(7,i));
    XJ.tgt=XJ.i*step();
    if(instant||window.__clock!=null){XJ.x=XJ.tgt;XJ.v=0}
    syncDots();
  };
  const snap=()=>{go(Math.round(XJ.x/step()))};
  window.__xjGo=go;
  window.__xjState=()=>({x:Math.round(XJ.x),tgt:Math.round(XJ.tgt),i:XJ.i,landed:XJ.landed});
  const startDrag=(x,y,id,isTouch)=>{
    if(!XJ.landed)return;
    const now=performance.now();
    XJ.p={x,y,x0:XJ.x,axis:null,moved:0,id,isTouch,samples:[{x,t:now}]};
    XJ.v=0;
  };
  const moveDrag=(x,y,ev)=>{
    if(!XJ.p)return;
    const dx=x-XJ.p.x,dy=y-XJ.p.y;
    if(!XJ.p.axis&&Math.hypot(dx,dy)>6)XJ.p.axis=Math.abs(dx)>=Math.abs(dy)*0.82?'x':'y';
    if(XJ.p.axis==='x'){
      if(ev&&ev.cancelable)ev.preventDefault();
      if(!XJ.p.isTouch&&!XJ.p.cap&&XJ.p.id!=null){try{rail.setPointerCapture(XJ.p.id)}catch(_){}XJ.p.cap=1}
      const now=performance.now();
      XJ.x=rubber(XJ.p.x0-dx);
      XJ.tgt=XJ.x;
      XJ.p.samples.push({x,t:now});
      while(XJ.p.samples.length>8&&now-XJ.p.samples[0].t>105)XJ.p.samples.shift();
      XJ.p.moved=1;
    }
  };
  const endDrag=()=>{
    if(!XJ.p)return;
    const moved=XJ.p.moved,axis=XJ.p.axis,samples=XJ.p.samples;
    window.__xjDragged=!!moved;
    XJ.p=null;
    if(moved&&axis==='x'){
      let v=0;
      const now=performance.now(),last=samples[samples.length-1];
      if(samples.length>=2&&now-last.t<90){
        let first=samples[0];
        for(let k=0;k<samples.length-1;k++){if(last.t-samples[k].t<=100){first=samples[k];break}}
        const dt=(last.t-first.t)/1000;
        if(dt>0.008)v=-(last.x-first.x)/dt;
      }
      XJ.v=cl(v,-2800,2800);
      const st=step(),curIdx=XJ.i;
      let nextIdx=Math.round((XJ.x+XJ.v*0.16)/st);
      if(nextIdx===curIdx&&Math.abs(XJ.v)>180)nextIdx=curIdx+(XJ.v>0?1:-1);
      nextIdx=cl(nextIdx,curIdx-2,curIdx+2);
      go(nextIdx);
    }
    setTimeout(()=>window.__xjDragged=0,120);
  };
  rail.addEventListener('touchstart',e=>{if(e.touches.length===1)startDrag(e.touches[0].clientX,e.touches[0].clientY,null,true)},{passive:true});
  rail.addEventListener('touchmove',e=>{if(XJ.p&&XJ.p.isTouch&&e.touches.length===1)moveDrag(e.touches[0].clientX,e.touches[0].clientY,e)},{passive:false});
  rail.addEventListener('touchend',()=>{if(XJ.p&&XJ.p.isTouch)endDrag()},{passive:true});
  rail.addEventListener('touchcancel',()=>{if(XJ.p&&XJ.p.isTouch)endDrag()},{passive:true});
  rail.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;startDrag(e.clientX,e.clientY,e.pointerId,false)});
  rail.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;moveDrag(e.clientX,e.clientY,e)});
  rail.addEventListener('pointerup',e=>{if(e.pointerType==='touch')return;endDrag()});
  rail.addEventListener('pointercancel',e=>{if(e.pointerType==='touch')return;endDrag()});
  rail.addEventListener('wheel',e=>{
    if(!XJ.landed)return;
    const horiz=e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY);
    if(!horiz)return;
    e.preventDefault();XJ.x=rubber(XJ.x+(e.deltaX||e.deltaY));XJ.tgt=XJ.x;
    clearTimeout(rail._snap);rail._snap=setTimeout(snap,110);
  },{passive:false});
  const prev=$('cprev'),next=$('cnext');
  if(prev)prev.onclick=()=>go(XJ.i-1);if(next)next.onclick=()=>go(XJ.i+1);
  if(dots)dots.addEventListener('click',e=>{const b=e.target.closest('b');if(b)go(+b.dataset.i)});
  addEventListener('keydown',e=>{if(!XJ.landed)return;const on=document.elementFromPoint(innerWidth/2,innerHeight/2);if(!on||!on.closest('#xiaoji'))return;if(e.key==='ArrowLeft')go(XJ.i-1);if(e.key==='ArrowRight')go(XJ.i+1)});
})();
const BOOKS=['没有遇见 何来艳遇','纸上飞檐','想象画本','月亮下的童梦','桂巷还香','七国 · 地理与风物设定集'];
const leaves=BOOKS.map((b,i)=>{const l=document.createElement('div');l.className='leaf';l.style.zIndex=20-i;l.innerHTML=`<div class="f ph dark" data-sec="guyu"><img data-src="img/book${i}.webp" alt=""><div class="sh"></div></div><div class="b"><b>${b}</b><small>第 ${i+1} 本，共 6 本</small></div>`;$('book').appendChild(l);return l});
let LABN=0,WDI=null,PANX=0,ACI=-1;const SHB=Q('#shelf .bk');const LABS=Q('#apins .pin').map(p=>{const d=document.createElement('div');d.className='lab';d.innerHTML=`<s></s><b><span><em>${String(++LABN).padStart(2,'0')}</em>${p.dataset.n}</span></b>`;$('alab').appendChild(d);return d});
$('amap').dataset.src=MOB?'img/map-guilin-m.webp':'img/map-guilin.webp';
$('stage').appendChild($('ccv'));$('stage').appendChild($('yhead'));const ccv=$('ccv'),ccx=ccv.getContext('2d');
const pcv=$('pcv'),pcx=pcv.getContext('2d');const fxc=$('fx'),fxx=fxc.getContext('2d');
const WS=Q('#weiyan .ws'),WD=Q('#wdots i'),XI=Q('#xlist .xi'),XS=Q('#xbar .xs'),KR=Q('#klist .kr'),AL=Q('#alist li'),PINS=Q('#apins .pin'),BLO=Q('#color .blo');
function fitPoems(){const bh=$('wbook').offsetHeight,bw=$('wbook').offsetWidth;WS.forEach(w=>{const n=+w.dataset.n,c=+w.dataset.c;const byH=(bh-(MOB?H*.088:H*.14))/(n*1.08);const byW=(bw-(MOB?H*.16:H*.3))/(c*1.42+1.2);w.style.setProperty('--fs',Math.min(byH,byW,H*(MOB?.07:.088))+'px')})}
const NS=MOB?5:8;for(let i=0;i<NS;i++){const s=document.createElement('i');s.style.cssText='flex:1;height:100%;transform-origin:0 50%;background:#33373a';$('fold1').appendChild(s)}
const F2=()=>Q('#fold2 i').forEach((i,k)=>{i.style.background=`#eaa5a8 url(fr/${SET}/xiaoyuan/19.webp) 50% ${k?'100%':'0%'}/cover no-repeat`;i.style.backgroundSize='100% 200%';i.style.boxShadow='inset 0 '+(k?'':'-')+'30px 60px rgba(0,0,0,.25)'});
$('tick').textContent=('每日一纸，把世界摊在早餐桌上 ◆ 国际 ◆ 科技 ◆ AI ◆ 日常小事 ◆ 堺与大阪本周值得去的展和祭 ◆ 2026年11月23日 星期一 ◆ ').repeat(4);
['mq0','mq1','mq2'].forEach(id=>$(id).textContent='反正有大把时光 · 来啊，快活啊 · '.repeat(6));

// split texts
Q('#ovtag .tg').forEach(l=>{l.innerHTML=[...l.textContent].map(c=>`<i>${c}</i>`).join('')});const TAGC=Q('#ovtag i');const WMS=[];Q('#ovwm span').forEach((s,ci)=>{const tip=s.querySelector('.tip');const sk=[...s.querySelectorAll('.sk')];sk.forEach((el,k)=>WMS.push({el,tip,len:el.getTotalLength(),t0:.06+WMS.length*.085+ci*.08,last:k===sk.length-1}))});
const PTR={dx:0,near:0};let RIP=0;addEventListener('pointermove',e=>{const r=$('ovwm').getBoundingClientRect();const cxm=r.left+r.width/2,cym=r.top+r.height/2;const d=Math.hypot(e.clientX-cxm,e.clientY-cym)/Math.max(r.width,1);PTR.near=cl(1.2-d);PTR.dx=cl((e.clientX-cxm)/r.width*2,-1,1);RIP=1},{passive:true});
addEventListener('touchstart',e=>{const t=e.touches[0];if(t){PTR.near=1;PTR.dx=0;RIP=1}},{passive:true});
const TPET=[0,1,2,3,4].map(()=>{const p=document.createElement('i');p.className='tpet';$('ov').append(p);return p});const mastC=split($('masth')),hlC=split($('hl')),dhC=split($('dh')),ksideC=split($('kside'));
{const b=document.createElement('i');b.id='hlbar';$('hl').prepend(b)}
const heads=Q('.head h2').map(h=>split(h));
function layoutX(){fitPoems&&fitPoems();pcv.width=W*DPR;pcv.height=H*DPR;ccv.width=Math.ceil(W*DPR/2);ccv.height=Math.ceil(H*DPR/2);fxc.width=W*DPR;fxc.height=H*DPR}
// hero dive point: widest stroke of 美 (distance-transform peak of the glyph raster)
let HFS=100,HP=null;
let FONT64=null;
async function heroPoint(){if(!FONT64){const r=await fetch('f/brush-hero.woff');const buf=new Uint8Array(await r.arrayBuffer());let bin='';buf.forEach(v=>bin+=String.fromCharCode(v));FONT64=btoa(bin)}
 const g=2,w=Math.ceil(W/g),h=Math.ceil(H/g);const c=document.createElement('canvas');c.width=W;c.height=H;const x=c.getContext('2d');
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><style>@font-face{font-family:BH;src:url(data:font/woff;base64,${FONT64}) format("woff")}</style><text x="50%" y="46%" text-anchor="middle" dominant-baseline="central" font-family="BH" font-size="${HFS}" fill="#000">多美</text></svg>`;
 const im=await imgP('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));x.drawImage(im,0,0);
 const a=x.getImageData(0,0,W,H).data;const D=new Float32Array(w*h);const BIG=1e6;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){D[j*w+i]=a[((j*g)*W+i*g)*4+3]>128?BIG:0}
 const S2=Math.SQRT2;
 for(let j=0;j<h;j++)for(let i=0;i<w;i++){const k=j*w+i;if(!D[k])continue;let v=D[k];if(i>0)v=Math.min(v,D[k-1]+1);if(j>0){v=Math.min(v,D[k-w]+1);if(i>0)v=Math.min(v,D[k-w-1]+S2);if(i<w-1)v=Math.min(v,D[k-w+1]+S2)}D[k]=i==0||j==0?Math.min(v,1):v}
 for(let j=h-1;j>=0;j--)for(let i=w-1;i>=0;i--){const k=j*w+i;if(!D[k])continue;let v=D[k];if(i<w-1)v=Math.min(v,D[k+1]+1);if(j<h-1){v=Math.min(v,D[k+w]+1);if(i<w-1)v=Math.min(v,D[k+w+1]+S2);if(i>0)v=Math.min(v,D[k+w-1]+S2)}D[k]=v}
 let best=-1,bi=0,bj=0;const x0=Math.floor(w/2);for(let j=0;j<h;j++)for(let i=x0;i<w;i++){const v=D[j*w+i];if(v>best){best=v;bi=i;bj=j}}
 HP=best>0?{x:bi*g+g/2,y:bj*g+g/2,r:best*g}:{x:W*.62,y:H*.46,r:HFS*.05};window.__HP=HP}

// overview tiles & unified section router
if(MOB){$('stage').style.perspective='none';const wb=$('wbook');if(wb)wb.style.perspective='1200px'}
const SEC_U={hero:0,zaobao:3.3,xiaoji:5.8,kuaihuo:11.3,guyu:13.8,xunji:19.1,dalu:22.1,yunyou:31.4,color:36.4,weiyan:39.4,skill:43.3,foot:45.9};
window.__scrollToSec=(key,behavior='smooth')=>{
 window.__stopEmbFling&&window.__stopEmbFling();
 window.__cancelToTop&&window.__cancelToTop();
 let y=0;
 if(key==='hero'||!key)y=0;
 else if(key==='huiben')y=(SBA_C+0.55)*VH;
 else if(SEC_U[key]!=null)y=window.__U2Y(SEC_U[key])*VH;
 if(window.__onSecJump)window.__onSecJump(key);
 scrollTo({top:Math.round(y),behavior});
};
{const k=decodeURIComponent(location.hash.slice(1)),key=k==='notes'?'xiaoji':k;if(key&&(SEC_U[key]!=null||key==='huiben'))addEventListener('load',()=>requestAnimationFrame(()=>window.__scrollToSec(key,'instant')),{once:true})}
const OVI=Q('#ovix .ix');let OVS=null;function ovRect(){}
OVI.forEach(t=>t.addEventListener('click',()=>window.__scrollToSec(t.dataset.go)));
// canvas & layout metrics cache
const cv=$('cv'),cx=cv.getContext('2d');let DPR=1;
function refreshMetrics(){
 const pan=$('dpan');if(pan){pan.style.width=Math.max(W,H*1.5)+'px';MX.dpanW=pan.offsetWidth||Math.max(W,H*1.5)}
 MX.xjCw=cards[0].offsetWidth||260;
 MX.xjCh=cards[0].offsetHeight||320;
 const rb=$('cards');MX.xjRailH=(rb&&rb.clientHeight)||H*.56;
 MX.blo=null;
 const step=MX.xjCw+(MOB?W*.08:W*.035);
 XJ.tgt=XJ.i*step;if(!XJ.p)XJ.x=XJ.tgt;
}
function size(force){
 const nw=innerWidth,nh=innerHeight;
 if(TOUCH&&force!==true&&lastResizeW>0&&Math.abs(nw-lastResizeW)<40&&Math.abs(nh-VH)<220)return;
 W=nw;H=nh;VH=nh;lastResizeW=nw;
 DPR=Math.min(2,devicePixelRatio||1);
 document.documentElement.style.setProperty('--track-h',Math.round((window.__U2Y(46.05)+1)*VH)+'px');
 cv.width=W*DPR;cv.height=H*DPR;cx.setTransform(DPR,0,0,DPR,0,0);
 $('hsvg').setAttribute('viewBox',`0 0 ${W} ${H}`);$('lsvg').setAttribute('viewBox',`0 0 ${W} ${H}`);
 const fs=MOB?W*.44:Math.min(W*.28,H*.58);HFS=fs;$('htx').setAttribute('font-size',fs);ovRect();$('ltx').setAttribute('font-size',fs);
 layoutX();refreshMetrics();
}
const off=document.createElement('canvas'),ox=off.getContext('2d');
function frameAt(k,t){const a=FR[k];const f=cl(t)*(NF-1);const i=Math.floor(f),r=f-i;let A=a[i];if(!A)for(let j=i;j>=0;j--)if(a[j]){A=a[j];break}return[A,r>0?a[i+1]:null,r]}
function cover(img,sc=1,al=1,c=cx,w=W,h=H){if(!img)return;const r=Math.max(w/img.width,h/img.height)*sc;const iw=img.width*r,ih=img.height*r;c.globalAlpha=al;c.drawImage(img,(w-iw)/2+(MOB&&c===cx?PANX*(iw-w)/2:0),(h-ih)/2,iw,ih);c.globalAlpha=1}
function scene(k,t,sc=1,c=cx,w=W,h=H){const[A,B,r]=frameAt(k,t);if(!A){c.fillStyle='#2a231d';c.fillRect(0,0,w,h);shimmer(c,w,h);return}cover(A,sc,1,c,w,h);if(B)cover(B,sc,r,c,w,h)}
function shimmer(c,w,h){const x=((performance.now()/1400)%1)*w*3-w;const g=c.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.5,'rgba(255,255,255,.08)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,h)}
const rnd=s=>{const x=Math.sin(s*127.1)*43758.5453;return x-Math.floor(x)};
function blob(x,y,R,seed){cx.moveTo(x+R,y);for(let a=0;a<=64;a++){const th=a/64*Math.PI*2;let n=0;for(let o=1;o<=4;o++)n+=Math.sin(th*(o*3+1)+seed*o*1.7+rnd(seed+o)*6)*(.11/o);const r=R*(1+n);cx.lineTo(x+Math.cos(th)*r,y+Math.sin(th)*r)}cx.closePath()}
const P=[...Array(160)].map((_,i)=>({x:rnd(i+1),y:rnd(i+7),z:.3+rnd(i+13)*.7,s:rnd(i+19)}));
function rain(a,clk){if(a<=0)return;cx.save();cx.globalAlpha=a*.5;cx.strokeStyle='#e9eef0';cx.lineCap='round';for(const p of P){const y=((p.y+clk*(1.4+p.z*1.6))%1.1-.05)*H,x=(p.x*1.2-.1)*W+y*.12;cx.lineWidth=p.z*1.4;cx.beginPath();cx.moveTo(x,y);cx.lineTo(x+H*.012*p.z,y+H*.06*p.z);cx.stroke()}cx.restore()}
function petals(a,clk,col){if(a<=0)return;cx.save();for(let i=0;i<60;i++){const p=P[i];const t=(p.y+clk*(.06+p.z*.08))%1.15-.08;const x=(p.x+Math.sin(clk*.8+p.s*9)*.05+t*.25)%1.1*W,y=t*H,r=(6+p.z*14)*(MOB?.8:1);cx.globalAlpha=a*(.55+.45*p.z);cx.fillStyle=col[i%col.length];cx.translate(x,y);cx.rotate(clk*(1+p.s)+p.s*6);cx.scale(1,.55+.35*Math.sin(clk*3+p.s*7));cx.beginPath();cx.ellipse(0,0,r,r*.62,0,0,7);cx.fill();cx.setTransform(DPR,0,0,DPR,0,0)}cx.restore()}
function glints(a,clk){if(a<=0)return;cx.save();cx.globalCompositeOperation='lighter';for(let i=0;i<80;i++){const p=P[i];const tw=Math.max(0,Math.sin(clk*3*(.5+p.s)+p.s*20));const x=p.x*W,y=(.45+p.y*.55)*H,r=(2+p.z*5)*tw;const g=cx.createRadialGradient(x,y,0,x,y,r*4);g.addColorStop(0,`rgba(255,250,230,${a*tw*.9})`);g.addColorStop(1,'rgba(255,250,230,0)');cx.fillStyle=g;cx.fillRect(x-r*4,y-r*4,r*8,r*8)}cx.restore()}
// ---------- helpers ----------
const VIS={};
const vis=(id,v)=>{const b=!!v;if(VIS[id]===b)return;VIS[id]=b;$(id).style.visibility=b?'visible':'hidden'};
const secOn=(id,v)=>{const b=!!v,was=!!VIS[id];vis(id,b);return b||was};
function chars(cs,v,o=0,mode=0){const n=cs.length;cs.forEach((c,i)=>{const d=n>1?i/(n-1)*.6:0;const t=qo(seg(v,d,d+.4)),x=seg(o,d*.5,d*.5+.5);c.style.opacity=t*(1-x);
 c.style.transform=mode===1?`translate3d(0,${(1-t)*-.9}em,0) scale(${1+(1-t)*.6})`:`translate3d(0,${(1-t)*.7}em,0) rotate(${(1-t)*(i%2?8:-8)}deg)`;
 if(!MOB)c.style.filter=(t<1||x>0)?`blur(${(1-t)*8+x*8}px)`:'none'})}
const fade=(el,v,dy=24)=>{
 if(el.classList&&el.classList.contains('lm')){const t=oc(cl(v));el.style.opacity=v>0.001?1:0;el.firstChild.style.transform=`translate3d(0,${(1-t)*115}%,0)`;el.firstChild.style.opacity=.3+.7*t;return}
 el.style.opacity=v;el.style.transform=`translate3d(0,${(1-v)*dy}px,0)`;
};
let IDLE=0,DKF=0,lastClk=0;
const CP=[...Array(70)].map((_,i)=>({x:rnd(i+31)*1.3-.15,y:rnd(i+37)*1.3-.15,r:.07+rnd(i+41)*.13,s:rnd(i+43),z:i%3}));
function clouds(u,clk){const a=io(seg(u,23.5,24.1)),o=io(seg(u,24.1,24.85));const on=a>0&&o<1;if(VIS._ccv!==on){VIS._ccv=on;ccv.style.visibility=on?'visible':'hidden'}if(!on)return;
 const w=ccv.width,h=ccv.height;ccx.clearRect(0,0,w,h);const D=Math.hypot(w,h);
 if(!MOB){ccx.fillStyle=`rgba(236,236,236,${.35*a*(1-o)})`;ccx.fillRect(0,0,w,h)}
 if(WDI){const ia=io(seg(u,MOB?23.5:23.75,MOB?23.85:24.2))*(1-io(seg(u,24.45,24.85)));if(ia>0){const s=Math.max(w/WDI.width,h/WDI.height)*(MOB?1.22-.14*seg(u,23.5,24.85):1.08-.06*seg(u,23.75,24.85)),dy=MOB?h*.09*(1-seg(u,23.5,24.85)):0;ccx.globalAlpha=ia;ccx.drawImage(WDI,(w-WDI.width*s)/2,(h-WDI.height*s)/2+dy,WDI.width*s,WDI.height*s);if(MOB){ccx.globalCompositeOperation='multiply';ccx.globalAlpha=ia*.55;ccx.drawImage(WDI,(w-WDI.width*s)/2,(h-WDI.height*s)/2+dy,WDI.width*s,WDI.height*s);ccx.globalCompositeOperation='source-over'};ccx.globalAlpha=1}}
 for(const p of CP){const dx=p.x-.5,dy=p.y-.5;const par=1+p.z*.5;const k=(2.2-1.2*a)+(2.2*o)*par;const x=(.5+dx*k)*w+Math.sin(clk*.25+p.s*6)*w*.008,y=(.5+dy*k)*h;const R=p.r*D*(.9+.6*a+.8*o)*(1+p.z*.25);
  const al=a*(1-o)*(.5+.4*p.s)*(1-(MOB?.7:.45)*io(seg(u,MOB?23.6:23.8,MOB?23.95:24.2))*(1-o))*(MOB?(Math.abs(dx)<.3&&Math.abs(dy)<.32?.22:.5)+.5*(1-io(seg(u,23.6,23.9))):1);const g=ccx.createRadialGradient(x-R*.18,y-R*.28,R*.05,x,y,R);g.addColorStop(0,`rgba(255,255,253,${al})`);g.addColorStop(.45,`rgba(246,245,243,${al*.85})`);g.addColorStop(.75,`rgba(200,206,214,${al*.4})`);g.addColorStop(1,'rgba(200,206,214,0)');ccx.fillStyle=g;ccx.fillRect(x-R,y-R,R*2,R*2)}}
function getBloMetrics(){
 if(!MX.blo){MX.blo=BLO.map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height,l:r.left,t:r.top}})}
 return MX.blo;
}
const WASH=[[179,38,30],[214,120,118],[236,180,170],[179,38,30],[226,150,140]];
function plum(u,clk){const c=pcx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);
 const bm=getBloMetrics();
 const tg=bm.map((r,k)=>[r.l+r.w*(k?.5:.3),r.t+r.h*(k?.42:.4),Math.hypot(r.w,r.h)]);
 tg.push([W*(MOB?.78:.52),H*(MOB?.5:.78),H*.5],[W*(MOB?.2:.9),H*(MOB?.62:.2),H*.4]);
 tg.forEach(([x,y,S],k)=>{const L=34.95+k*.16,f=seg(u,L-.55,L),b=seg(u,L,L+1.1);
  if(b>0){const e=oc(b);const fadeK=1-seg(u,L+.55,L+1.25);for(let j=0;j<3;j++){const col=WASH[(k*2+j)%WASH.length];const R=S*(k<3?.5:.32)*e*(.55+j*.17);
    cx2blob(c,x+Math.sin(k*3+j)*S*.05,y+Math.cos(k*2+j)*S*.04,R,k*7.3+j*1.9+b*.6);const al=(k<3?.05:.035)*(1-j*.22)*fadeK;c.fillStyle=`rgba(${col},${al})`;c.fill();c.strokeStyle=`rgba(${col},${al*3})`;c.lineWidth=.8;c.stroke()}}
  if(f>0&&b<.15){const sw=Math.sin(f*7+k)*40*(1-f);const px=x+sw+(1-f)*(k%2?60:-50),py=lerp(-60,y,io(f));const sc=(MOB?.8:1)*(14+k*2)*(1-seg(b,0,.15));c.save();c.translate(px,py);c.rotate(f*5+k);
   for(let p=0;p<5;p++){c.rotate(Math.PI*2/5);c.beginPath();c.ellipse(0,-sc*.55,sc*.42,sc*.5,0,0,7);c.fillStyle=k%2?'rgba(179,38,30,.92)':'rgba(196,52,44,.88)';c.fill()}
   c.beginPath();c.arc(0,0,sc*.18,0,7);c.fillStyle='rgba(243,238,230,.9)';c.fill();c.restore()}})}
function cx2blob(c,x,y,R,seed){c.beginPath();for(let a=0;a<=72;a++){const th=a/72*Math.PI*2;let n=0;for(let o=1;o<=4;o++)n+=Math.sin(th*(o*2+1)+seed*o*1.3+rnd(seed+o)*6)*(.13/o);const r=R*(1+n);a?c.lineTo(x+Math.cos(th)*r,y+Math.sin(th)*r):c.moveTo(x+Math.cos(th)*r,y+Math.sin(th)*r)}c.closePath()}
// ---------- render ----------
const SECN=[['hero',0,'总览'],['zaobao',.6,'早报'],['xiaoji',4.6,'小记'],['kuaihuo',9.6,'快活'],['guyu',12.9,'故语'],['xunji',17.8,'寻迹'],['dalu',20.6,'大陆'],['yunyou',24.0,'云游'],['huiben',SBA,'绘本'],['color',34.9,'Color'],['weiyan',38.7,'微言'],['skill',42.5,'Skill'],['foot',44.7,'多美']];
const DARK={huiben:1,zaobao:0,xiaoji:1,kuaihuo:1,guyu:1,xunji:0,dalu:1,yunyou:1,color:0,weiyan:0,skill:1,foot:0,hero:0};

// 08 纸上绘本 · pop-up book segment, spliced in after 云游 (scroll is frozen for the rest of the page while it plays)
const HB={el:$('huiben'),f:$('ifH'),hd:$('hbhd'),ld:0,open:0,live:-1,n:0,ready:0,th:'guilin'};
const hbMsg=m=>{const w=HB.f.contentWindow;if(w&&HB.f.src)w.postMessage(m,'*')};
function markHbReady(){
  HB.ready=1;
  HB.el&&HB.el.classList.add('ready');
  const fs=$('hbfs');fs&&fs.classList.add('ready');
  const ld=$('hbload');if(ld){ld.style.opacity='0';ld.style.pointerEvents='none';ld.hidden=true}
}
addEventListener('message',e=>{const d=e.data||{};if(e.source!==HB.f.contentWindow)return;
 if(d.sb==='progress'){const ld=$('hbload');if(ld)ld.style.setProperty('--p',(d.v*100).toFixed(0)+'%');if(d.v>=1&&!HB.ready)markHbReady()}
 if(d.sb==='theme'&&d.id!=='cover'){HB.th=d.id;const L=!['guilin','towers','rita','yueta','shuiyue'].includes(d.id);DARK.huiben=L?0:1;HB.el.classList.toggle('light',L);HB.el.style.backgroundColor=L?({jiangnan:'#e4dccf',xiaoyuan:'#e7dfcf'}[d.id]||'#ece4d3'):'#141b2a'}});
if(HB.f){HB.f.addEventListener('load',()=>{if(HB.f.getAttribute('src'))markHbReady()})}
function hb(U0c){
  const a=SBA_C,on=!HB.fs&&U0c>a-0.2&&U0c<a+POST+0.5;
  vis('huiben',on||!!HB.fs);HBC=0;if(on||HB.fs)vis('yunyou',false);
  if(on){const e=io(seg(U0c,a,a+.35));HB.el.style.transform=e<1?`translate3d(0,${((1-e)*18).toFixed(3)}%,0)`:'none'}
  const post=$('hbpost');if(post)post.style.opacity=HB.fs?0:1;
}
HB.fs=0;HB.savedY=0;
function openHuiben(){
  if(HB.fs)return;HB.fs=1;HB.savedY=scrollY;
  const fs=$('hbfs');fs.hidden=false;document.body.classList.add('hb-open');document.body.style.overflow='hidden';
  if(!HB.ld){
    HB.ld=1;HB.ready=0;fs.classList.remove('ready');
    const ld=$('hbload');if(ld){ld.hidden=false;ld.style.opacity='';ld.style.pointerEvents=''}
    HB.f.src='huiben/index.html'+(window.__clock!=null?'?capture':'');
  } else {
    if(HB.ready)markHbReady();
    hbMsg({sb:'pause',v:false});
  }
  requestAnimationFrame(()=>fs.classList.add('on'));
}
function closeHuiben(){
  if(!HB.fs)return;HB.fs=0;
  const fs=$('hbfs');fs.classList.remove('on');
  hbMsg({sb:'pause',v:true});
  document.body.classList.remove('hb-open');document.body.style.overflow='';
  setTimeout(()=>{if(!HB.fs)fs.hidden=true},280);
  scrollTo(0,HB.savedY);
}
(function setupHuiben(){
  const open=$('hbopen');if(open)open.addEventListener('click',openHuiben);
  const back=$('hbback');if(back)back.addEventListener('click',closeHuiben);
  const fs=$('hbfs');if(!fs)return;
  let sy=null;
  fs.addEventListener('pointerdown',e=>{if(e.target.closest('#hbback,iframe'))return;sy=e.clientY});
  fs.addEventListener('pointermove',e=>{if(sy!=null&&e.clientY-sy>72){closeHuiben();sy=null}});
  fs.addEventListener('pointerup',()=>sy=null);
  addEventListener('keydown',e=>{if(e.key==='Escape'&&HB.fs)closeHuiben()});
})();
const ovSpans=Q('#ovwm span').map(s=>({el:s,gf:s.querySelector('.gf'),bl:s.querySelector('.bl')})),ovixEl=Q('#ovix')[0],ovixSc=Q('#ovix .sc')[0],ovixHint=Q('#ovix .m-hint')[0];
const zbCols=Q('.cols>div'),zbMeta=Q('.dateline,.mast .l,.mast .r'),zbTicker=$('zaobao').querySelector('.ticker');
const xjSub=Q('#xiaoji .head p,#xiaoji .kick'),gySub=Q('#guyu .head p,#guyu .head .kick'),xunjiSub=Q('#xunji .head p,#xunji .head .kick'),daluSub=Q('#dalu .kick,#dp');
const xfeatCards=Q('#xfeat .xf').map(p=>({el:p,xr:Q('.xr',p)}));
const wsMeta=WS.map(w=>({el:w,sh:w.querySelector('.wsh'),sp:Q('.wc span',w),tx:Q('.wt,.wsrc,.wn',w)}));
const krMeta=KR.map(r=>({el:r,p:r.querySelector('p'),b:r.querySelector('b')}));
const footSpans=Q('#W span'),menuLinks=Q('#dm-menu a[data-sec]'),cardImgs=cards.map(c=>c.querySelector('img'));
cardImgs.forEach(im=>{if(im)im.style.filter='none'});

const embFling={vy:0,y:0,t:0,on:false};
window.__startEmbFling=vy=>{embFling.vy=vy;embFling.y=scrollY;embFling.t=performance.now();embFling.on=true};
window.__stopEmbFling=()=>{embFling.on=false;embFling.vy=0};
addEventListener('touchstart',window.__stopEmbFling,{passive:true});
addEventListener('wheel',window.__stopEmbFling,{passive:true});
addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')window.__stopEmbFling()},{passive:true});

function render(clk){
 const dt=cl(clk-lastClk,0.001,0.05);lastClk=clk;
 if(window.__clock!=null||SY==null||TOUCH||embFling.on)SY=scrollY;
 else{SY+=(scrollY-SY)*.28;if(Math.abs(scrollY-SY)<.3)SY=scrollY}
 U0=SY/VH;
 const u=U0<SBA_C?expandU(U0):(U0<SBA_C+POST?SBA:expandU(U0-POST));
 demand(u);
 vis('hero',false);vis('herobgs',false);

 // OPENING 0-0.86
 if(secOn('ov',u<0.86)){
  const rt=OVS==null?0:(window.__clock!=null?99:(performance.now()-OVS)/1000);
  const sU=seg(u,0,.8),WT=WMS.length?WMS[WMS.length-1].t0+.3:0;RIP*=.93;
  WMS.forEach(m=>{const t=cl((rt-m.t0)/.3);m.el.style.strokeDashoffset=(1-qo(t)).toFixed(4);if(t>0&&t<1){const L=m.len*qo(t),p=m.el.getPointAtLength(L);m.tip.setAttribute('cx',p.x.toFixed(1));m.tip.setAttribute('cy',p.y.toFixed(1));m.tip.style.opacity=(.9*Math.sin(Math.PI*t)).toFixed(3);m.tip.setAttribute('r',(52-26*t).toFixed(1))}else if(t>=1&&m.last)m.tip.style.opacity=0});
  const rmin=cl((rt-.1)/(WT+.1)),fill=oc(cl((rt-WT+.15)/.5));
  ovSpans.forEach((s,i)=>{const b=Math.sin(clk*1.3+i*1.7),b2=Math.sin(clk*.9+i*2.9),pr=PTR.near*RIP;
   s.gf.style.opacity=fill.toFixed(3);s.bl.style.opacity=(fill*(.12+.1*(1+Math.sin(clk*1.6+i))*.5+pr*.25)).toFixed(3);s.bl.style.transform=`scale(${(1.015+.012*Math.sin(clk*1.6+i)+pr*.04).toFixed(4)})`;
   s.el.style.transform=`translate3d(${(PTR.dx*pr*14*(i?1:-1)).toFixed(2)}px,${-io(sU)*H*.32*(1+i*.12)}px,0) scale(${1+.016*b},${1-.013*b}) skewX(${(1.6*b2+PTR.dx*pr*5).toFixed(3)}deg) rotate(${(.8*b).toFixed(3)}deg)`});
  if(!MOB){$('inkD').setAttribute('scale',(7+7*(1+Math.sin(clk*1.15))*.5+26*(1-rmin)+38*RIP*PTR.near).toFixed(2));$('inkT').setAttribute('baseFrequency',`${(.010+.0025*Math.sin(clk*.41)).toFixed(4)} ${(.015+.0025*Math.cos(clk*.33)).toFixed(4)}`)}
  const sr=cl((rt-WT-.1)/.42),sy=-io(sU)*H*.36,ssc=sr<.62?lerp(2.6,.9,io(sr/.62)):lerp(.9,1,oc((sr-.62)/.38));
  $('ovseal').style.opacity=cl(sr*4);$('ovseal').style.transform=`translate3d(0,${sy}px,0) scale(${ssc}) rotate(${-4-(1-sr)*10}deg)`;
  const rg=cl((rt-WT-.37)/.8);$('ovring').style.opacity=rg>0&&rg<1?(1-rg)*.6:0;$('ovring').style.transform=`translate3d(0,${sy}px,0) scale(${1+oc(rg)*1.3}) rotate(-4deg)`;
  const ir=oc(cl((rt-.0)/1.6));$('ovimg').style.opacity=ir;$('ovimg').style.transform=`translate3d(${Math.sin(clk*.12)*6}px,${-io(sU)*H*.12}px,0) scale(${(1.07-.07*ir)*(1+.012*Math.sin(clk*.2))})`;
  TAGC.forEach((c,i)=>{const t0=WT+.15+i*.12,t=cl((rt-t0)/.55),e=oc(t),sw=cl((rt-t0-.6)/1.2);c.style.opacity=cl(t*2.5);if(MOB){c.style.clipPath='none'}else{c.style.clipPath=t<1?`inset(0 0 ${((1-e)*100).toFixed(1)}% 0)`:'none';c.style.filter=t<1?`blur(${((1-e)*5).toFixed(2)}px)`:''}
   c.style.transform=`translate3d(0,${((1-e)*-10+Math.sin(clk*1.5-i*.45)*2.2*sw).toFixed(2)}px,0) scale(${(1+(1-e)*.35).toFixed(3)}) rotate(${(Math.sin(clk*1.5-i*.45)*3.2*sw).toFixed(2)}deg)`});
  const tb=$('ovtag').getBoundingClientRect();
  TPET.forEach((p,k)=>{const T=((clk*.07+k/TPET.length)%1),x=tb.left-60+T*(tb.width+160)+Math.sin(clk*1.1+k*2)*18,y=tb.top+(k/TPET.length)*tb.height+Math.sin(clk*.8+k)*30-T*40;p.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${(clk*90+k*60)%360}deg)`;p.style.opacity=(cl((rt-WT-1.2)/1)*.75*Math.sin(Math.PI*T)).toFixed(3)});
  [['ovk',.55],['ovtag',.75],['ovcap',.9]].forEach(([id,d])=>{const r=oc(cl((rt-d)/.8)),o=io(seg(u,.02,.35));$(id).style.opacity=r*(1-o);$(id).style.transform=`translate3d(0,${(1-r)*12-o*40}px,0)`});
  OVI.forEach((x,i)=>{const r=oc(cl((rt-1.0-i*.05)/.7)),o=io(seg(u,.01+i*.012,.2+i*.012));x.style.opacity=r*(1-o);x.style.transform=`translate3d(0,${(1-r)*10+o*-16}px,0)`});
  if(ovixSc)ovixSc.style.opacity=cl((rt-1.6)/.6)*(1-seg(u,0,.1));
  if(ovixHint)ovixHint.style.opacity=cl((rt-1.1)/.6)*(1-seg(u,0,.22));
  if(ovixEl)ovixEl.style.borderTopColor=`rgba(28,25,22,${.16*cl((rt-.9)/.6)*(1-seg(u,0,.3))})`;
 }

 // ZAOBAO .1-5.2
 if(secOn('zaobao',u>.1&&u<5.2)){
  mastC.forEach((c,i)=>{const t=seg(u,.7+i*.06,1.0+i*.06),e=back(t);c.style.opacity=t>0?1:0;c.style.transform=`scale(${lerp(2.6,1,cl(e,0,2))}) translateY(${(1-t)*-30}px)`;if(!MOB)c.style.filter=t<1?`blur(${(1-t)*6}px)`:'none';c.style.color=t<1?`rgba(29,25,21,${.3+.7*t})`:''});
  $('rule').style.transform=`scaleX(${io(seg(u,1.3,1.9))})`;
  hlC.forEach((c,i)=>{const t=oc(seg(u,1.6+i*.03,1.75+i*.03));c.style.opacity=t;c.style.transform=`translateY(${(1-t)*-.5}em)`});
  $('hlbar').style.transform=`scaleX(${io(seg(u,2.3,2.8))})`;
  zbCols.forEach((c,i)=>{const t=oc(seg(u,2.0+i*.25,3.2+i*.2));c.style.transform=`translate3d(0,${(1-t)*(40+i*25)}vh,0)`;c.style.opacity=t});
  zbMeta.forEach(e=>e.style.opacity=seg(u,1.1,1.6));
  $('tick').style.transform=`translate3d(${-((u*260)%1400)}px,0,0)`;zbTicker.style.transform=`translate3d(0,${(1-oc(seg(u,1.0,1.6)))*100}%,0)`;
  const toss=ez(io,seg(u,4.3,5.2));
  if(MOB){
   const eIn=seg(u,.1,.78);
   $('zaobao').style.transform=toss>0?`translate3d(0,${(-toss*100).toFixed(2)}vh,0) scale(${(1-toss*.06).toFixed(4)})`:(u<1?`translate3d(0,${((1-eIn)*100).toFixed(2)}vh,0) scale(${(.95+.05*eIn).toFixed(4)})`:'none');
   $('zaobao').style.opacity=toss>0?(1-seg(toss,.45,1)).toFixed(3):'1';
  }else{
   $('zaobao').style.transform=toss>0?`translate3d(0,${-toss*115}vh,0) rotateX(${toss*58}deg) rotateZ(${-toss*14}deg) scale(${1-toss*.35})`:(u<1?`translate3d(0,${(1-io(seg(u,.1,.78)))*100}vh,0)`:'none');
  }
 }

 // XIAOJI 4.3-10.2
 XJ.landed=u>4.45&&u<9.6?1:0;
 if(secOn('xiaoji',u>4.3&&u<10.2)){
  const cw=MX.xjCw,gap=MOB?W*.08:W*.035,railStart=MOB?W*.17:W*.38;
  if(!XJ.p){
   const k=1-Math.exp(-dt*11);
   XJ.x+=(XJ.tgt-XJ.x)*k;
   if(Math.abs(XJ.tgt-XJ.x)<.25)XJ.x=XJ.tgt;
  }
  const rail=XJ.x,sc=io(seg(u,9.2,10.2));
  chars(heads[0],seg(u,4.5,5.1),seg(u,9.2,9.6));xjSub.forEach(e=>fade(e,seg(u,4.8,5.2)*(1-seg(u,9.2,9.5))));
  $('xiaoji').style.opacity=1-seg(sc,.4,1);
  const railH=MX.xjRailH,ch=MX.xjCh,baseTy=Math.max(6,Math.min(railH-ch-8,Math.round((railH-ch)*.38)));
  cards.forEach((c,i)=>{const t=back(cl(seg(u,4.6+i*.12,5.25+i*.12))),tx=railStart+i*(cw+gap)-rail,ty=baseTy;
   const sx=W*1.1,sy=railH+120,rot0=30+i*7,rr=(rnd(i+3)-.5)*6;
   let x=lerp(sx,tx,t),y=lerp(sy,ty,t),r=lerp(rot0,rr,cl(t,0,1));
   const cxp=x+cw/2,dc=Math.abs(cxp-W/2)/(W/2),dev=cl(1-dc*1.4);
   if(sc>0){const ang=Math.atan2(y+cw*.5-H/2,cxp-W/2)+rnd(i)*1.2-.6;x+=Math.cos(ang)*sc*W*1.2;y+=Math.sin(ang)*sc*H*1.3;r+=sc*(rnd(i+9)-.5)*140}
   c.style.transform=`translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) rotate(${r.toFixed(2)}deg) scale(${(1+dev*.06).toFixed(4)})`;c.style.zIndex=Math.round(dev*10)});
 }

 // KUAIHUO 9.2-13.4
 if(secOn('kuaihuo',u>9.2&&u<13.4)){
  const hk=seg(u,9.2,13.4);
  $('kbg').style.background=`radial-gradient(120% 90% at ${30+hk*40}% 40%,#BF2D23 0,#A8221B 55%,#8E1C16 100%)`;
  const k1=seg(u,9.6,10.15),e1=back(k1);$('k1').style.opacity=k1>0?1:0;const sh=k1>=1?Math.sin(u*90)*Math.max(0,1-(u-10.15)*3)*8:0;
  $('k1').style.transform=`translate3d(${sh}px,0,0) scale(${k1<1?lerp(3.2,1,cl(e1,0,1.2)):1+seg(u,10.2,12.4)*.08}) rotate(${(1-k1)*-12}deg)`;
  const k2=seg(u,9.95,10.6);$('k2').style.opacity=oc(k2);$('k2').style.transform=`rotate(${(1-back(k2))*-24}deg) translate3d(${(1-oc(k2))*-60}vw,0,0)`;
  ['mq0','mq1','mq2'].forEach((id,i)=>{$(id).style.transform=`translate3d(${(i%2?-1:1)*((u-9.2)*22%60)-(i%2?0:60)}vw,0,0)`;$(id).style.opacity=seg(u,9.4,9.9)});
  chars(ksideC,seg(u,10.4,11.3));fade($('ksig'),seg(u,10.8,11.3));
 }

 // GUYU 12.4-18.2 (embedded #ifD handles covers; #book & #shelf are display:none)
 if(secOn('guyu',u>12.4&&u<18.2)){
  const sl=ez(io,seg(u,12.4,13.4));
  if(MOB){
   $('guyu').style.clipPath='none';
   $('guyu').style.transform=sl<1?`translate3d(0,${((1-sl)*92).toFixed(2)}vh,0) scale(${(.95+.05*sl).toFixed(4)})`:'none';
   $('guyu').style.opacity=cl(sl*1.6).toFixed(3);
  }else{
   $('guyu').style.clipPath=sl<1?`polygon(${lerp(130,-40,sl)}% 0,150% 0,150% 100%,${lerp(170,0,sl)}% 100%)`:'none';
  }
  chars(heads[1],seg(u,12.9,13.5));gySub.forEach(e=>fade(e,seg(u,13.1,13.6)));
 }

 // XUNJI 17.2-21.2
 if(secOn('xunji',u>17.2&&u<21.2)){
  const pt=ez(io,seg(u,17.2,18.0));
  if(MOB){
   $('xunji').style.transform=pt<1?`translate3d(0,${((1-pt)*92).toFixed(2)}vh,0) scale(${(.95+.05*pt).toFixed(4)})`:'none';
   $('xunji').style.opacity=cl(pt*1.6).toFixed(3);
  }else{
   $('xunji').style.transform=pt<1?`rotateY(${(1-pt)*-115}deg)`:'none';
   $('xunji').style.filter=pt<1?`brightness(${.6+.4*pt})`:'';
  }
  chars(heads[2],seg(u,17.35,17.9));xunjiSub.forEach(e=>fade(e,seg(u,17.5,17.95)));
  $('xnum').textContent=Math.round(30*io(seg(u,17.9,18.9)));fade($('xbig'),seg(u,17.75,18.15),20);
  XS.forEach((x,i)=>{x.querySelector('i').style.transform=`scaleX(${io(seg(u,18.0+i*.1,18.45+i*.1))})`;x.style.opacity=seg(u,18.0+i*.1,18.3+i*.1)});
  const af=seg(u,18.75,20.05)*4.999,ai=Math.floor(af);
  if(!MOB){XI.forEach((x,i)=>{const t=oc(seg(u,18.15+i*.09,18.6+i*.09));x.style.opacity=t;x.style.transform=`translate3d(0,${(1-t)*28}px,0)`;x.classList.toggle('on',i===ai);x.style.setProperty('--d',i===ai?back(cl((af-ai)*4)):0)})}
  const fo=oc(seg(u,18.2,18.65));$('xfeat').style.opacity=fo;$('xfeat').style.transform=`translate3d(0,${(1-fo)*36}px,0)`;
  xfeatCards.forEach((p,i)=>{let o=cl((.5-Math.abs(af-(i+.5)))*8);if(i===0&&af<.5)o=1;if(i===4&&af>4.5)o=1;p.el.style.opacity=o;p.el.style.transform=`translate3d(0,${((af-(i+.5))*-10*(1-o)).toFixed(2)}px,0)`;p.el.style.visibility=o>0?'':'hidden';if(o>0)p.xr.forEach((r,k)=>{r.style.opacity=cl(o*1.6-k*.12)})});
  XS.forEach((x,i)=>x.classList.toggle('on',i===ai));
  if(!MOB){const r=XI[ai].getBoundingClientRect();window.__wpLast=[r.left-18,r.top+H*.023+9]}else{window.__wpLast=[W*.5,H*.5]}
  fade($('xmore'),seg(u,19.0,19.4));
 }

 // DALU 20.2-24.7
 if(secOn('dalu',u>20.2&&u<24.7)){
  const ir=ez(io,seg(u,20.2,21.0)),ta=ez(io,seg(u,23.6,24.6)),lp=window.__wpLast||[W/2,H/2];
  if(MOB){
   $('dalu').style.clipPath='none';
   $('dalu').style.transform=ir<1?`translate3d(0,${((1-ir)*92).toFixed(2)}vh,0) scale(${(.95+.05*ir).toFixed(4)})`:(ta>0?`translate3d(0,${(-ta*14).toFixed(2)}vh,0) scale(${(1-ta*.08).toFixed(4)})`:'none');
   $('dalu').style.opacity=(cl(ir*1.6)*(1-seg(ta,.35,1))).toFixed(3);
  }else{
   $('dalu').style.clipPath=ir<1?`circle(${ir*Math.hypot(W,H)}px at ${lp[0]}px ${lp[1]}px)`:'none';
   $('dalu').style.transform=ta>0?`translate3d(0,${ta*30}vh,0) rotateX(${ta*78}deg) scale(${1-ta*.25})`:'none';
   $('dalu').style.opacity=1-seg(ta,.6,1);
  }
  const pan=$('dpan'),iw=MX.dpanW,pz=seg(u,20.2,23.6);
  pan.style.transform=`translate3d(${-(iw-W)*io(pz)}px,0,0) scale(${1.15-.1*pz})`;pan.style.transformOrigin='0 50%';
  const f=seg(u,21.2,23.6);$('flare').style.opacity=.9*Math.sin(Math.PI*f);$('flare').style.setProperty('--fx',lerp(85,25,f)+'%');$('flare').style.setProperty('--fy',lerp(14,30,f)+'%');
  $('m1').style.transform=`translate3d(${-pz*40}vw,0,0)`;$('m2').style.transform=`translate3d(${pz*30}vw,0,0)`;
  chars(dhC,seg(u,21.0,21.7));daluSub.forEach(e=>fade(e,seg(u,21.3,21.8)));
 }

 // YUNYOU 23.6-34.95 (clouds + yhead in #stage, #ifE in #yunyou)
 secOn('yunyou',u>23.6&&u<34.95);
 clouds(u,clk);
 if(u>23.7&&u<25.2){VIS._yh=true;const yh=seg(u,23.9,24.4)*(1-seg(u,24.7,25.0));fade($('yhead'),yh);$('yhead').style.visibility=yh>0.002?'visible':'hidden'}else if(VIS._yh!==false){VIS._yh=false;$('yhead').style.opacity=0;$('yhead').style.visibility='hidden'}

 // COLOR 34.4-38.9
 if(secOn('color',u>34.4&&u<38.9)){
  plum(u,clk);
  if(MOB){
   BLO.forEach((b,k)=>{const L=34.95+k*.16,t=seg(u,L,L+.65),e=oc(t);
    b.style.clipPath='none';b.style.opacity=e.toFixed(3);
    if(k===0)b.style.transform=`translate3d(0,${((1-e)*22).toFixed(1)}px,0) scale(${(.96+.04*e).toFixed(3)})`;
   });
   const stE=oc(seg(u,35.1,35.8));$('cstk').style.transform=`translate3d(0,${((1-stE)*26).toFixed(1)}px,0)`;
  }else{
   const bm=getBloMetrics();
   BLO.forEach((b,k)=>{const L=34.95+k*.16,t=seg(u,L,L+.75),e=io(t),r=bm[k],R=Math.hypot(r.w,r.h)*.62*e,ox=r.w*(k?.5:.3),oy=r.h*(k?.42:.4);
    b.style.clipPath=t<1?`circle(${R}px at ${ox}px ${oy}px)`:'none';b.style.filter=t<1?`url(#bloomf) blur(${(1-e)*5}px)`:'none';b.style.opacity=t>0?1:0});
  }
  fade($('cstkh'),seg(u,35.9,36.3));const cx2=seg(u,38.3,38.75),cIn=ez(io,seg(u,34.4,34.85));
  $('color').style.opacity=((1-cx2)*cIn).toFixed(3);
  if(MOB)$('color').style.transform=cIn<1?`translate3d(0,${((1-cIn)*40).toFixed(1)}vh,0)`:'none';
 }

 // WEIYAN 38.3-42.7
 if(secOn('weiyan',u>38.3&&u<42.7)){
  const e=ez(oc,seg(u,38.35,38.95));
  $('wbook').style.transform=MOB?`translate3d(0,${((1-e)*76).toFixed(2)}vh,0) scale(${(.95+.05*e).toFixed(4)})`:`translate3d(0,${(1-e)*95}vh,0) rotateX(${(1-e)*24}deg) rotateZ(${(1-e)*-3}deg)`;
  fade($('whd'),seg(u,38.6,38.95));fade($('wnav'),seg(u,38.8,39.1));
  let pg=1;wsMeta.forEach((w,i)=>{const W0=38.95+i*.8,tt=i<3?seg(u,W0+.62,W0+.98):0,te=io(tt);if(i<3&&te>.5)pg=i+2;
   w.el.style.zIndex=10-i;w.el.style.transform=`translateZ(${Math.sin(te*Math.PI)*70}px) rotateY(${te*168}deg)`;w.el.style.visibility=te>=1?'hidden':'';w.sh.style.opacity=Math.sin(te*Math.PI)*.95;
   const n=w.sp.length;let rm=1;w.sp.forEach((c,j)=>{const a=W0+j*(.5/n),t=seg(u,a,a+.5/n+.08);rm=Math.min(rm,t);
    if(MOB){c.style.clipPath='none';c.style.opacity=t.toFixed(3);c.style.transform=`translate3d(0,${((1-oc(t))*12).toFixed(1)}px,0)`}
    else{c.style.clipPath=`inset(-4% -10% ${(1-t)*104}% -10%)`}});
   if(!MOB&&u>W0-.1&&u<W0+.75){$('inkD2').setAttribute('scale',(3+2*Math.sin(clk*1.4)+18*(1-rm)).toFixed(2))}
   const to=seg(u,W0-.15,W0+.1);w.tx.forEach(x=>x.style.opacity=to)});
  pg=Math.min(4,pg);$('wpg').textContent=`0${pg} / 04`;WD.forEach((d,i)=>d.classList.toggle('on',i===pg-1));
 }

 // SKILL 42.3-44.95
 if(secOn('skill',u>42.3&&u<44.95)){
  const w=MOB?seg(u,42.3,42.95):io(seg(u,42.3,42.8)),x=ez(io,seg(u,44.35,44.9));
  if(MOB){
   $('skill').style.clipPath='none';
   $('skill').style.transform=w<1?`translate3d(0,${((1-w)*92).toFixed(2)}vh,0) scale(${(.95+.05*w).toFixed(4)})`:(x>0?`translate3d(0,${(-x*88).toFixed(2)}vh,0) scale(${(1-x*.06).toFixed(4)})`:'none');
   $('skill').style.opacity=(cl(w*1.6)*(1-seg(x,.55,1))).toFixed(3);
  }else{
   $('skill').style.clipPath=`inset(${(1-w)*100}% 0 ${x*100}% 0)`;
  }
  fade($('khd'),seg(u,42.6,43.0));const kc=$('kcount');kc.textContent=String(Math.round(7*io(seg(u,42.7,43.3)))).padStart(2,'0');kc.style.opacity=.9*seg(u,42.6,42.9);
  const af=seg(u,43.05,44.3)*6.999;krMeta.forEach((r,i)=>{const t=oc(seg(u,42.75+i*.06,43.15+i*.06)),o=io(cl(1.35-Math.abs(af-i-.5)*1.35));
   r.el.style.opacity=t;
   if(MOB){
    r.el.style.transform=`translate3d(${(o*5).toFixed(1)}px,${((1-t)*24).toFixed(1)}px,0)`;
    r.p.style.opacity=(.42+.58*o).toFixed(3);
   }else{
    r.el.style.transform=`translate3d(0,${(1-t)*30}px,0)`;
    r.p.style.maxHeight=(o*56)+'px';r.p.style.opacity=o;r.p.style.marginTop=(o*8)+'px';
   }
   r.el.style.setProperty('--o',o);r.b.style.color=o>.5?'#fff':''});
 }

 // FOOT 44.2-
 if(secOn('foot',u>44.2)){
  footSpans.forEach((s,i)=>{const t=qo(seg(u,44.7+i*.08,45.3+i*.08)),dx=[-1.2,.8,-.4,1.1,-.9,.5][i],dy=[.9,-1,1.2,-.8,.6,-1.1][i];s.style.opacity=t;s.style.transform=`translate3d(${(1-t)*dx*40}vw,${(1-t)*dy*40}vh,0) rotate(${(1-t)*dx*40}deg) scale(${1+(1-t)*1.5})`});
  fade($('FC'),seg(u,45.3,45.7));fade($('FT'),seg(u,45.5,45.8));fade($('FL'),seg(u,45.6,46));fade($('FCP'),seg(u,45.7,46));
 }

 // UI & Footer clearance
 let si=0;SECN.forEach((s,i)=>{if(s[0]==='huiben'?(U0>SBA_C&&U0<SBA_C+POST+.25):(u>=s[1]-.3&&!(U0>SBA_C&&U0<SBA_C+POST+.25&&s[1]>=SBA)))si=Math.max(si,i)});if(U0>SBA_C&&U0<SBA_C+POST+.25)si=SECN.findIndex(x=>x[0]==='huiben');const sn=SECN[si][0];const dk=(DARK[sn]&&!(sn==='skill'&&u>44.6));DKF=dk;
 window.__curU=u;window.__curSec=sn;
 const footIn=u>44.3;
 const col=dk?'#f3ead9':'#2a211b';$('UI').style.color=col;$('HUD').style.color=col;if(sn==='zaobao'||sn==='hero'&&u>.5)$('HUD').style.setProperty('bottom',`calc(4.4vh + ${MOB?8:12}px + env(safe-area-inset-bottom))`,'important');else $('HUD').style.removeProperty('bottom');
 $('HUD').classList.toggle('foot-hide',footIn);
 $('HUD').style.opacity=footIn?0:seg(u,.7,.9);
 $('PG').style.width=(cl(u/46)*100)+'%';
 $('HN').textContent=String(si).padStart(2,'0');$('HC').textContent=SECN[si][2];
 menuLinks.forEach(a=>a.classList.toggle('on',a.dataset.sec===(sn==='foot'?'hero':sn)));
 hb(U0);
 if(window.__afterRender)window.__afterRender(u,clk);
}
// ---------- first-load loader ----------
const HERO=Q('[data-ovbg]').map(e=>e.dataset.ovbg);let prog=0,shown=0,ready=false;const LT=performance.now();
async function heroLoad(){LOG.hero={start:Math.round(performance.now()-T0)};const tot={};let total=0;
 await Promise.all(HERO.map(async src=>{const r=await fetch(src);const len=+r.headers.get('content-length')||40000;total+=len;const rd=r.body.getReader();const parts=[];let got=0;for(;;){const{done,value}=await rd.read();if(done)break;parts.push(value);got+=value.length;tot[src]=got;prog=Object.values(tot).reduce((a,b)=>a+b,0)/total*.9}
  const url=URL.createObjectURL(new Blob(parts,{type:'image/webp'}));await imgP(url);Q(`[data-ovbg="${src}"]`).forEach(e=>e.style.backgroundImage=`url(${url})`);}));
 await document.fonts.load('100px BrushH');await document.fonts.load('15px FrL');prog=1;ready=true;LOG.hero.end=Math.round(performance.now()-T0)}
heroLoad();
let loaderDone=false,exitT0=0;
function loader(now){if(loaderDone)return;const el=(now-LT)/1000;window.__loaderClock!=null&&0;
 shown+=(Math.min(prog,el/1.4)-shown)*.12;const draw=cl(el/1.6);
 $('ltx').style.strokeDashoffset=3000*(1-io(draw));$('ltx').style.fill=`rgba(42,33,27,${seg(el,1.1,1.7)})`;
 Q('#lmeta .w span').forEach((s,i)=>{const t=qo(seg(el,.2+i*.08,.7+i*.08));s.style.opacity=t;s.style.transform=`translateY(${(1-t)*14}px)`});
 Q('#lbar i')[0].style.width=(shown*100)+'%';$('lpct').textContent='LOADING '+Math.round(shown*100)+'%';
 if(ready&&shown>.985&&el>1.7&&!exitT0){exitT0=now;OVS=now+420}
 if(exitT0){const k=now-exitT0,tx=io(cl(k/380)),t=io(cl((k-260)/640));$('ltx').style.fill=`rgba(42,33,27,${1-tx})`;$('ltx').style.stroke=`rgba(42,33,27,${1-tx})`;$('lmeta').style.opacity=1-tx;$('loader').querySelector('svg').style.transform=`translateY(${-tx*18}px)`;
  // ink 多美 dissolves to reveal painting through the hero knockout; loader bg fades since hero bg = same beige
  $('loader').style.background=`rgba(239,231,218,${1-t})`;Q('#loader .half').forEach(h=>h.style.opacity=1-t);
  if(t>=1){loaderDone=true;$('loader').style.display='none'}}}
// ---------- loop ----------
const c0=performance.now();
let SY=null;
// muuuuu-inspired: film grain (rosca / misotone texture), line-mask reveals (rosca SplitText lines), cursor follower (mabataki / osply)
const GR=document.createElement('div');GR.id='grain';{const c=document.createElement('canvas');c.width=c.height=160;const x=c.getContext('2d');const d=x.createImageData(160,160);for(let i=0;i<d.data.length;i+=4){const v=Math.random()*255|0;d.data[i]=d.data[i+1]=d.data[i+2]=v;d.data[i+3]=255}x.putImageData(d,0,0);GR.style.backgroundImage=`url(${c.toDataURL()})`}document.body.appendChild(GR);
Q('.head p').forEach(p=>{p.innerHTML=`<span class="lmi">${p.innerHTML}</span>`;p.classList.add('lm')});
let lastSY=-1,lastMove=0;const MOTE=[...Array(46)].map((_,i)=>({x:rnd(i+61),y:rnd(i+67),z:.3+rnd(i+71)*.7,s:rnd(i+73)}));
function post(clk){if(Math.abs(SY-lastSY)>.5){lastMove=clk;lastSY=SY}IDLE=cl((clk-lastMove-.35)/1.1);IDLE=IDLE*IDLE*(3-2*IDLE);
 if(!MOB||IDLE>.05){const c=fxx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);const base=.12+.55*IDLE,cnt=MOB?20:MOTE.length;for(let i=0;i<cnt;i++){const m=MOTE[i],y=((m.y-clk*.012*m.z)%1+1)%1*H,x=(m.x+Math.sin(clk*.25+m.s*9)*.02)*W,tw=.5+.5*Math.sin(clk*1.3+m.s*20);c.globalAlpha=base*tw*m.z;c.fillStyle=DKF?'#F3EEE6':'#1C1916';c.beginPath();c.arc(x,y,(DKF?1.4:1)*m.z*1.6,0,7);c.fill()}c.globalAlpha=1}
 if(window.__layers)window.__layers(SY/VH,clk);if(!MOB){const f=Math.floor(clk*24);GR.style.backgroundPosition=`${(f*73)%160}px ${(f*131)%160}px`}else{GR.style.opacity='.08'}}
const MAG=Q('.mag,#NAV a,#ovix .ix,.flinks a');
if(matchMedia('(pointer:fine)').matches){const C=document.createElement('div');C.id='cur';C.innerHTML='<i></i><b>VIEW</b>';document.body.appendChild(C);let mx=-99,my=-99,cx2=-99,cy2=-99;addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY});
 (function cl2(){cx2+=(mx-cx2)*.18;cy2+=(my-cy2)*.18;C.style.transform=`translate(${cx2}px,${cy2}px)`;const el=document.elementFromPoint(mx,my);const tt=el&&el.closest('#totop'),tg=!tt&&el&&el.closest('[data-cur],a,.card,.leaf,.mag');C.style.opacity=tt?'0':'';C.classList.toggle('big',!!tg);C.querySelector('b').textContent=tg&&tg.dataset.cur?tg.dataset.cur:'VIEW';
  MAG.forEach(m=>{const r=m.getBoundingClientRect();if(!r.width){return}const cxm=r.left+r.width/2,cym=r.top+r.height/2;const dx=mx-cxm,dy=my-cym,lim=Math.max(r.width,r.height)*.6+50;const on=Math.hypot(dx,dy)<lim;
   m._x=(m._x||0)+(((on?dx*.22:0))-(m._x||0))*.16;m._y=(m._y||0)+(((on?dy*.28:0))-(m._y||0))*.16;m.style.translate=`${m._x.toFixed(2)}px ${m._y.toFixed(2)}px`});requestAnimationFrame(cl2)})()}
{const bar=Q('#HUD .bar')[0];let dn=false;const go=e=>{window.__stopEmbFling();const r=bar.getBoundingClientRect();const f=cl((e.clientX-r.left)/r.width);scrollTo(0,f*(document.documentElement.scrollHeight-innerHeight))};bar.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;dn=true;bar.setPointerCapture(e.pointerId);go(e)});bar.addEventListener('pointermove',e=>{if(dn)go(e)});bar.addEventListener('pointerup',()=>dn=false)}
WD.forEach((d,i)=>d.addEventListener('click',()=>{window.__stopEmbFling();scrollTo({top:window.__U2Y(38.95+i*.8+.55)*VH,behavior:'smooth'})}));
function stepEmbFling(now){
 if(!embFling.on)return;
 if(Math.abs(scrollY-embFling.y)>10){embFling.on=false;embFling.vy=0;return}
 const dt=cl((now-embFling.t)/1000,0.001,0.05);embFling.t=now;
 const maxS=Math.max(0,document.documentElement.scrollHeight-innerHeight);
 embFling.y+=embFling.vy*dt;
 embFling.vy*=Math.exp(-2.15*dt);
 if(embFling.y<=0||embFling.y>=maxS||Math.abs(embFling.vy)<12){
  embFling.y=cl(embFling.y,0,maxS);embFling.on=false;embFling.vy=0;
 }
 scrollTo(0,Math.round(embFling.y));
}
function loop(now){loader(now);stepEmbFling(now);const clk=window.__clock!=null?window.__clock:(now-c0)/1000;render(clk);post(clk);requestAnimationFrame(loop)}
addEventListener('resize',()=>size(false));size(true);requestAnimationFrame(loop);
window.__render=()=>{render(window.__clock||0);post(window.__clock||0)};window.__loaderIsDone=()=>loaderDone;
})();
