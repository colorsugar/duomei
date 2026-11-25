(()=>{
// Motion v2: the page is one native document. Scrolling is never driven by script; sections reveal on
// timed CSS transitions when they enter (IntersectionObserver), and the only scroll-linked motion is CSS
// scroll-driven animation (compositor). Script runs per frame only during the loader/intro and one-shot effects.
const $=id=>document.getElementById(id),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),seg=(u,a,b)=>cl((u-a)/(b-a)),lerp=(a,b,t)=>a+(b-a)*t;
const io=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,oc=t=>1-Math.pow(1-t,3),qo=t=>1-Math.pow(1-t,4);
const MOB=innerWidth<innerHeight,RM=matchMedia('(prefers-reduced-motion: reduce)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
document.documentElement.classList.add('mv');
let W=innerWidth,H=innerHeight,DPR=Math.min(2,devicePixelRatio||1);
window.__VH=()=>innerHeight;
const split=el=>{el.innerHTML=[...el.textContent].map((c,i)=>`<span class="ch" style="--i:${i}">${c===' '?'&nbsp;':c}</span>`).join('');return Q('.ch',el)};
const LOG=window.__loadLog={};const T0=performance.now();
// ---------- on-demand loader ----------
function loadImgs(sec,eager=false){Q(`[data-sec="${sec}"] img[data-src],img[data-sec="${sec}"][data-src]`).forEach(im=>{im.loading=eager?'eager':'lazy';im.decoding='async';im.onload=()=>{im.style.opacity=1;const p=im.closest('.ph');if(p)p.classList.remove('ph')};im.src=im.dataset.src;im.removeAttribute('data-src')})}
function track(sec,promises){LOG[sec]={start:Math.round(performance.now()-T0)};Promise.all(promises).then(()=>LOG[sec].end=Math.round(performance.now()-T0))}
const imgP=src=>new Promise(r=>{const i=new Image();i.onload=i.onerror=()=>r(i);i.src=src});
const imgsOf=sec=>Q(`[data-sec="${sec}"] img,img[data-sec="${sec}"]`).map(i=>new Promise(r=>i.complete&&!i.dataset.src?r():i.addEventListener('load',r)));
Q('.yy-bg img').forEach(i=>i.dataset.src=`img/wander-${MOB?'m':'d'}.webp`);
const SECLOAD={
 zaobao:()=>{loadImgs('zaobao');return imgsOf('zaobao')},
 xiaoji:()=>{loadImgs('xiaoji');return imgsOf('xiaoji')},
 kuaihuo:()=>{const f=new FontFace('BrushK','url(f/brush-kh.woff)');document.fonts.add(f);return[f.load()]},
 guyu:()=>[],xunji:()=>[],huiben:()=>[],skill:()=>[],
 dalu:()=>{loadImgs('dalu');return imgsOf('dalu')},
 yunyou:()=>{loadImgs('yunyou');return imgsOf('yunyou')},
 color:()=>{loadImgs('color');return imgsOf('color')},
 weiyan:()=>{const f=new FontFace('ZMX','url(f/zmx.woff2)');document.fonts.add(f);return[f.load()]},
 foot:()=>Q('[data-bg]').map(e=>{const s=e.dataset.bg;e.removeAttribute('data-bg');return imgP(s).then(()=>e.style.backgroundImage=`url(${s})`)})
};
const done={};
const demand=k=>{if(SECLOAD[k]&&!done[k]){done[k]=1;track(k,SECLOAD[k]())}};
window.__preloadAll=async()=>{for(const k in SECLOAD)demand(k);await new Promise(r=>{const c=()=>Q('img:not([data-src])').every(i=>i.complete)&&Q('[data-bg]').length==0?r():setTimeout(c,80);c()});await document.fonts.ready};

// ---------- build DOM ----------
const SITE='https://duomei.site';
const NOTE_SLUGS=['tea-town-sunset','window-morning-note','duomei-paper-shadow','old-town-overlook','desk-camera-light','guilin-river-tea','note-1782966727392','guilin-matcha-parfait'];
window.__NOTE_SLUGS=NOTE_SLUGS;
const NOTES=[['江南古镇','2026.07.05','古镇夕照里的一杯茶','太阳落到屋檐后面，茶杯、木桌和空白本子忽然都有了慢下来的理由。'],['房间窗前','2026.07.04','窗前的今日小记','一扇窗、一页纸、一杯温水，足够把普通的一天重新打开。'],['纸页之间','2026.07.03','纸上的多美小记','有些日子不需要远行，只要把光影和心事安静地放在一张纸上。'],['老城高处','2026.07.02','在城上看见远处','近处是瓦檐和木栏，远处是雾里的城市，黄昏把两种生活轻轻放在一起。'],['木桌旁','2026.07.01','桌边光影和相机','相机放在桌角，笔记本摊开，墙上的影子把一个安静午后拉得很长。'],['桂林漓江','2026.06.30','漓江边的茶光','太阳落在水面上，小船慢慢经过，山影像一封从故乡寄来的信。'],['小记','2026.06.29','夏日秋荷','1 个标签 / 文字'],['桂林河岸','2026.06.29','山水边的一口甜','抹茶冰淇淋举到山水前，旅行忽然从宏大的风景变成一口具体的甜。']];
const cards=NOTES.map((n,i)=>{const d=document.createElement('div');d.className='card';d.style.setProperty('--i',i);d.dataset.cur='阅读';d.innerHTML=`<div class="im ph" data-sec="xiaoji"><img data-src="img/note${i}.webp" alt=""></div><small><span>${n[0]}</span><span>${n[1]}</span></small><h4>${n[2]}</h4><p>${n[3]}</p><a class="card-go" href="${SITE}/note/${NOTE_SLUGS[i]}">阅读全文 →</a>`;const a=d.querySelector('.card-go');a.addEventListener('click',e=>{if(window.__xjDragged){e.preventDefault();e.stopPropagation();return}e.stopPropagation()});$('cards').appendChild(d);return d});
// 小记: a native horizontal scroller with scroll-snap; script only mirrors the position into the dots.
(function setupXJ(){
 const rail=$('cards'),dots=$('cdots'),dotEls=[];let centers=[],cur=-1,raf=0;
 cards.forEach((_,i)=>{const b=document.createElement('b');b.dataset.i=i;dots.appendChild(b);dotEls.push(b)});
 const measure=()=>{centers=cards.map(c=>c.offsetLeft+c.offsetWidth/2)};
 const nearest=()=>{const c=rail.scrollLeft+rail.clientWidth/2;let best=0,bd=1e9;centers.forEach((x,i)=>{const d=Math.abs(x-c);if(d<bd){bd=d;best=i}});return best};
 const sync=()=>{raf=0;const i=nearest();if(i!==cur){cur=i;dotEls.forEach((b,k)=>b.classList.toggle('on',k===i))}};
 const go=i=>{if(!centers.length)measure();i=cl(i,0,cards.length-1);rail.scrollTo({left:centers[i]-rail.clientWidth/2,behavior:RM?'auto':'smooth'})};
 rail.addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(sync)},{passive:true});
 addEventListener('resize',()=>{measure();sync()});requestAnimationFrame(()=>{measure();sync()});
 window.__xjGo=go;window.__xjState=()=>({i:cur,x:Math.round(rail.scrollLeft)});
 $('cprev').onclick=()=>go(cur-1);$('cnext').onclick=()=>go(cur+1);
 dots.addEventListener('click',e=>{const b=e.target.closest('b');if(b)go(+b.dataset.i)});
 addEventListener('keydown',e=>{if(window.__curSec!=='xiaoji')return;if(e.key==='ArrowLeft')go(cur-1);if(e.key==='ArrowRight')go(cur+1)});
 // mouse drag-to-scroll; touch and trackpads scroll the rail natively
 let d=null;
 rail.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse'||e.button)return;d={x:e.clientX,s:rail.scrollLeft,m:0,id:e.pointerId}});
 rail.addEventListener('pointermove',e=>{if(!d)return;const dx=e.clientX-d.x;if(!d.m&&Math.abs(dx)>5){d.m=1;rail.classList.add('drag');try{rail.setPointerCapture(d.id)}catch(_){}}if(d.m)rail.scrollLeft=d.s-dx});
 const up=()=>{if(!d)return;window.__xjDragged=!!d.m;if(d.m){rail.classList.remove('drag');go(nearest())}d=null;setTimeout(()=>window.__xjDragged=0,120)};
 rail.addEventListener('pointerup',up);rail.addEventListener('pointercancel',up);
})();
$('tick').textContent=('每日一纸，把世界摊在早餐桌上 ◆ 国际 ◆ 科技 ◆ AI ◆ 日常小事 ◆ 堺与大阪本周值得去的展和祭 ◆ 2026年11月23日 星期一 ◆ ').repeat(4);
['mq0','mq1','mq2'].forEach(id=>$(id).textContent='反正有大把时光 · 来啊，快活啊 · '.repeat(6));
Q('#ovtag .tg').forEach(l=>{l.innerHTML=[...l.textContent].map(c=>`<i>${c}</i>`).join('')});const TAGC=Q('#ovtag i');
const WMS=[];Q('#ovwm span').forEach((s,ci)=>{const tip=s.querySelector('.tip');const sk=[...s.querySelectorAll('.sk')];sk.forEach((el,k)=>WMS.push({el,tip,len:el.getTotalLength(),t0:.06+WMS.length*.085+ci*.08,last:k===sk.length-1}))});
const TPET=[0,1,2,3,4].map(k=>{const p=document.createElement('i');p.className='tpet';p.style.setProperty('--k',k);$('ov').querySelector('.sx').append(p);return p});
split($('masth'));split($('hl'));split($('kside'));split($('dh'));Q('.head h2').forEach(split);
{const b=document.createElement('i');b.id='hlbar';$('hl').prepend(b)}
Q('.head p').forEach(p=>{p.innerHTML=`<span class="lmi">${p.innerHTML}</span>`;p.classList.add('lm')});
Q('#W span').forEach((s,i)=>{s.style.setProperty('--i',i);s.style.setProperty('--dx',[-1.2,.8,-.4,1.1,-.9,.5][i]);s.style.setProperty('--dy',[.9,-1,1.2,-.8,.6,-1.1][i])});
Q('#dm-menu a').forEach((a,i)=>a.style.setProperty('--i',i));
// reveal targets: elements that rise + fade in, with a stagger, when their section enters
const RV=[['#zaobao','.dateline,.mast .l,.mast .r',.35,.05],['#zaobao','.cols>div',.85,.14],['#xiaoji','#cnav',.7,0],['#kuaihuo','#ksig',1,0],
 ['#xunji','#xbig',.3,0],['#xunji','#xlist .xi',.45,.07],['#xunji','#xfeat',.5,0],['#xunji','#xmore',.8,0],
 ['#huiben','#hbpost .copy,#hbpost .hb-actions',.15,.14],['#color','#cme,.stk',.15,.14],['#color','#cstkh',.6,0],
 ['#weiyan','#whd',.05,0],['#weiyan','#wnav',.5,0],['#skill','#khd',.05,0],['#skill','#kcount',.25,0],['#skill','#klist .kr',.25,.06],
 ['#foot','#FC,#FT,#FL,#FCP',.6,.1],['#guyu','.head .kick',.05,0],['#xiaoji','.head .kick',.05,0],['#xunji','.head .kick',.05,0],['#dalu','.kick,#dp',.25,.1]];
RV.forEach(([s,sel,d0,st])=>Q(sel,$(s.slice(1))).forEach((el,i)=>{el.classList.add('rv');el.style.setProperty('--rd',(d0+i*st).toFixed(2)+'s')}));
Q('#xbar .xs').forEach((x,i)=>x.style.setProperty('--i',i));Q('.xf').forEach(f=>Q('.xr',f).forEach((r,i)=>r.style.setProperty('--i',i)));
Q('.ws').forEach(w=>Q('.wc span',w).forEach((c,j)=>c.style.setProperty('--j',j)));

// ---------- sections: reveal, visibility, active chapter ----------
const ORDER=['ov','zaobao','xiaoji','kuaihuo','guyu','xunji','dalu','yunyou','huiben','color','weiyan','skill','foot'];
const NAME={ov:'总览',zaobao:'早报',xiaoji:'小记',kuaihuo:'快活',guyu:'故语',xunji:'寻迹',dalu:'大陆',yunyou:'云游',huiben:'绘本',color:'Color',weiyan:'微言',skill:'Skill',foot:'多美'};
const DARK={ov:0,zaobao:0,xiaoji:1,kuaihuo:1,guyu:1,xunji:0,dalu:1,yunyou:1,huiben:1,color:0,weiyan:0,skill:1,foot:0};
const KEY=id=>id==='ov'?'hero':id;
const onIn={},onVis={};
const ioIn=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;e.target.classList.add('in');ioIn.unobserve(e.target);const f=onIn[e.target.id||e.target.dataset.in];f&&f()}),{rootMargin:'0px 0px -20% 0px'});
const ioVis=new IntersectionObserver(es=>es.forEach(e=>{e.target.classList.toggle('vis',e.isIntersecting);const f=onVis[e.target.id];f&&f(e.isIntersecting)}),{rootMargin:'8% 0px'});
const ioNear=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){demand(e.target.id);ioNear.unobserve(e.target)}}),{rootMargin:'150% 0px'});
const HN=$('HN'),HC=$('HC'),HUD=$('HUD'),UI=$('UI'),menuLinks=Q('#dm-menu a[data-sec]');let act=null,actDk=null;
const roll=el=>{if(!RM&&el.animate)el.animate([{transform:'translateY(70%)',opacity:0},{transform:'none',opacity:1}],{duration:460,easing:'cubic-bezier(.22,1,.36,1)'})};
function setActive(el){
 const id=el.dataset.k||el.id;const dk=el.dataset.dk!=null?+el.dataset.dk:DARK[id];
 if(id!==act){
  act=id;window.__curSec=KEY(id);
  HN.textContent=String(ORDER.indexOf(id)).padStart(2,'0');HC.textContent=NAME[id];roll(HN);roll(HC);
  menuLinks.forEach(a=>a.classList.toggle('on',a.dataset.sec===(id==='foot'||id==='ov'?'hero':id)));
  HUD.classList.toggle('on',id!=='ov'&&id!=='foot');HUD.classList.toggle('foot-hide',id==='foot');HUD.classList.toggle('zb',id==='zaobao');
 }
 if(dk!==actDk){actDk=dk;const col=dk?'#f3ead9':'#2a211b';UI.style.color=col;HUD.style.color=col;HUD.classList.toggle('dk',!!dk)}
}
const ioAct=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)setActive(e.target)}),{rootMargin:'-50% 0px -50% 0px'});
ORDER.forEach(id=>{const s=$(id);ioVis.observe(s);ioNear.observe(s);if(s.classList.contains('tall'))Q('.pnl',s).forEach(p=>{ioIn.observe(p);ioAct.observe(p)});else{ioIn.observe(s);ioAct.observe(s)}});
ioIn.observe($('dalu'));Q('.dl-p2').forEach(p=>p.dataset.in='dalu-p2');

// guyu / dalu / yunyou carousels live in js/home-embed.js
const daluP2=new IntersectionObserver(es=>es.forEach(e=>$('dalu').classList.toggle('p2on',e.isIntersecting)),{rootMargin:'-35% 0px 0px 0px'});daluP2.observe(Q('.dl-p2')[0]);

// count-ups (one-shot, text only)
const count=(el,to,ms=1100)=>{if(RM){el.textContent=String(to).padStart(el.id==='kcount'?2:1,'0');return}const t0=performance.now();const f=t=>{const k=cl((t-t0)/ms);el.textContent=String(Math.round(to*io(k))).padStart(el.id==='kcount'?2:1,'0');if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)};
// auto-advancing steppers that only run while their section is on screen; a manual pick holds for two beats
function stepper(n,ms,set){let i=-1,t=0,hold=0;const tick=()=>{if(performance.now()>hold)set(i=(i+1)%n)};return{start(){if(!t&&!RM)t=setInterval(tick,ms)},stop(){clearInterval(t);t=0},go(k){hold=performance.now()+ms*1.6;set(i=((k%n)+n)%n)},get i(){return i}}}
function swipe(el,cb){let s=null;el.addEventListener('touchstart',e=>{const t=e.touches[0];s=e.touches.length===1?{x:t.clientX,y:t.clientY}:null},{passive:true});el.addEventListener('touchend',e=>{if(!s)return;const t=e.changedTouches[0],dx=t.clientX-s.x,dy=t.clientY-s.y;s=null;if(Math.abs(dx)>40&&Math.abs(dx)>Math.abs(dy)*1.3)cb(dx<0?1:-1)},{passive:true})}

// 寻迹: five story skeletons
const XI=Q('#xlist .xi'),XS=Q('#xbar .xs'),XF=Q('#xfeat .xf');
const XUN=stepper(5,4600,i=>{XI.forEach((x,k)=>x.classList.toggle('on',k===i));XS.forEach((x,k)=>x.classList.toggle('on',k===i));XF.forEach((x,k)=>x.classList.toggle('cur',k===i))});
onIn.xunji=()=>{count($('xnum'),30);XUN.go(0);XUN.start()};onVis.xunji=v=>v&&$('xunji').classList.contains('in')?XUN.start():XUN.stop();
XI.forEach((x,i)=>x.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')XUN.go(i)}));
XS.forEach((x,i)=>x.addEventListener('click',()=>XUN.go(i)));
swipe($('xfeat'),d=>XUN.go(XUN.i+d));

// 微言: four pages of a book
const WS=Q('#weiyan .ws'),WD=Q('#wdots i');
function fitPoems(){const bh=$('wbook').offsetHeight,bw=$('wbook').offsetWidth;WS.forEach(w=>{const n=+w.dataset.n,c=+w.dataset.c;const byH=(bh-(MOB?H*.088:H*.14))/(n*1.08);const byW=(bw-(MOB?H*.16:H*.3))/(c*1.42+1.2);w.style.setProperty('--fs',Math.min(byH,byW,H*(MOB?.07:.088))+'px')})}
const WEI=stepper(4,6500,i=>{WS.forEach((w,k)=>{w.style.zIndex=10-k;w.classList.toggle('flip',k<i);w.classList.toggle('cur',k===i)});$('wpg').textContent=`0${i+1} / 04`;WD.forEach((d,k)=>d.classList.toggle('on',k===i))});
onIn.weiyan=()=>{setTimeout(()=>{WEI.go(0);WEI.start()},350)};onVis.weiyan=v=>v&&WEI.i>=0?WEI.start():WEI.stop();
WD.forEach((d,i)=>d.addEventListener('click',()=>WEI.go(i)));
$('wbook').addEventListener('click',e=>{if(!e.target.closest('a'))WEI.go(WEI.i+1)});
swipe($('wbook'),d=>WEI.go(WEI.i+d));

// Skill: seven processes
const KR=Q('#klist .kr');
const SKL=stepper(7,2600,i=>KR.forEach((r,k)=>r.classList.toggle('on',k===i)));
onIn.skill=()=>{count($('kcount'),7);setTimeout(()=>{SKL.go(0);SKL.start()},600)};onVis.skill=v=>v&&SKL.i>=0?SKL.start():SKL.stop();
KR.forEach((r,i)=>r.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse')SKL.go(i)}));

// Color: one ink-and-plum flourish when the page opens
const pcv=$('pcv'),pcx=pcv.getContext('2d'),BLO=Q('#color .blo');
const rnd=s=>{const x=Math.sin(s*127.1)*43758.5453;return x-Math.floor(x)};
const WASH=[[179,38,30],[214,120,118],[236,180,170],[179,38,30],[226,150,140]];
function cx2blob(c,x,y,R,seed){c.beginPath();for(let a=0;a<=72;a++){const th=a/72*Math.PI*2;let n=0;for(let o=1;o<=4;o++)n+=Math.sin(th*(o*2+1)+seed*o*1.3+rnd(seed+o)*6)*(.13/o);const r=R*(1+n);a?c.lineTo(x+Math.cos(th)*r,y+Math.sin(th)*r):c.moveTo(x+Math.cos(th)*r,y+Math.sin(th)*r)}c.closePath()}
function plum(u,bm){const c=pcx;c.setTransform(DPR,0,0,DPR,0,0);c.clearRect(0,0,W,H);
 const tg=bm.map((r,k)=>[r.l+r.w*(k?.5:.3),r.t+r.h*(k?.42:.4),Math.hypot(r.w,r.h)]);
 tg.push([W*(MOB?.78:.52),H*(MOB?.5:.78),H*.5],[W*(MOB?.2:.9),H*(MOB?.62:.2),H*.4]);
 tg.forEach(([x,y,S],k)=>{const L=34.95+k*.16,f=seg(u,L-.55,L),b=seg(u,L,L+1.1);
  if(b>0){const e=oc(b);const fadeK=1-seg(u,L+.55,L+1.25);for(let j=0;j<3;j++){const col=WASH[(k*2+j)%WASH.length];const R=S*(k<3?.5:.32)*e*(.55+j*.17);
    cx2blob(c,x+Math.sin(k*3+j)*S*.05,y+Math.cos(k*2+j)*S*.04,R,k*7.3+j*1.9+b*.6);const al=(k<3?.05:.035)*(1-j*.22)*fadeK;c.fillStyle=`rgba(${col},${al})`;c.fill();c.strokeStyle=`rgba(${col},${al*3})`;c.lineWidth=.8;c.stroke()}}
  if(f>0&&b<.15){const sw=Math.sin(f*7+k)*40*(1-f);const px=x+sw+(1-f)*(k%2?60:-50),py=lerp(-60,y,io(f));const sc=(MOB?.8:1)*(14+k*2)*(1-seg(b,0,.15));c.save();c.translate(px,py);c.rotate(f*5+k);
   for(let p=0;p<5;p++){c.rotate(Math.PI*2/5);c.beginPath();c.ellipse(0,-sc*.55,sc*.42,sc*.5,0,0,7);c.fillStyle=k%2?'rgba(179,38,30,.92)':'rgba(196,52,44,.88)';c.fill()}
   c.beginPath();c.arc(0,0,sc*.18,0,7);c.fillStyle='rgba(243,238,230,.9)';c.fill();c.restore()}})}
onIn.color=()=>{if(RM)return;const sr=$('color').getBoundingClientRect(),bm=BLO.map(b=>{const r=b.getBoundingClientRect();return{w:r.width,h:r.height,l:r.left-sr.left,t:r.top-sr.top}});
 pcv.width=W*DPR;pcv.height=H*DPR;const t0=performance.now();const f=t=>{const s=(t-t0)/1000;plum(34.4+s,bm);if(s<2.7)requestAnimationFrame(f);else{pcx.setTransform(1,0,0,1,0,0);pcx.clearRect(0,0,pcv.width,pcv.height)}};requestAnimationFrame(f)};

// ---------- navigation ----------
let lenis=null;
const yOf=key=>{if(!key||key==='hero')return 0;const el=$(key==='notes'?'xiaoji':key);return el?Math.round(el.getBoundingClientRect().top+scrollY):null};
window.__smoothTo=(y,instant)=>{if(lenis&&!instant)lenis.scrollTo(y,{duration:Math.min(2.2,.9+Math.abs(y-scrollY)/innerHeight*.06)});else{if(lenis)lenis.scrollTo(y,{immediate:true});scrollTo({top:y,behavior:instant||RM?'instant':'smooth'})}};
window.__scrollToSec=(key,behavior='smooth')=>{const y=yOf(key);if(y==null)return;if(window.__onSecJump)window.__onSecJump(key);window.__smoothTo(y,behavior==='instant'||behavior==='auto')};
{const k=decodeURIComponent(location.hash.slice(1));if(k&&yOf(k)!=null){const j=()=>window.__scrollToSec(k,'instant');requestAnimationFrame(j);addEventListener('load',()=>requestAnimationFrame(j),{once:true})}}
Q('#ovix .ix').forEach(t=>t.addEventListener('click',()=>window.__scrollToSec(t.dataset.go)));
// page transition: an ink curtain rises before leaving for an inner page
const PT=document.createElement('div');PT.id='pt';PT.innerHTML='<b>多美</b>';document.body.appendChild(PT);
document.addEventListener('click',e=>{if(e.defaultPrevented||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;const a=e.target.closest&&e.target.closest('a[href]');if(!a||(a.target&&a.target!=='_self')||a.hasAttribute('download'))return;
 const u=new URL(a.href,location.href);if(!/^https?:$/.test(u.protocol)||(u.origin!==location.origin&&u.hostname!=='duomei.site'))return;if(u.pathname==='/'||(u.pathname===location.pathname&&u.hash))return;
 e.preventDefault();PT.classList.add('go');setTimeout(()=>location.assign(a.href),RM?0:420)});
addEventListener('pageshow',()=>PT.classList.remove('go'));
// desktop wheel gets inertia; touch scrolling is always the browser's own
if(FINE&&!RM){const s=document.createElement('script');s.src='js/lenis.min.js';s.onload=()=>{if(!window.Lenis)return;lenis=window.__lenis=new window.Lenis({lerp:.1,smoothWheel:true,syncTouch:false,autoRaf:true,prevent:n=>!!(n.closest&&n.closest('[data-lenis-prevent],#modal,#hbfs,#dm-menu,#dm-music-card'))})};document.head.appendChild(s)}
window.__wheelBy=dy=>{if(lenis)lenis.scrollTo(lenis.targetScroll+dy);else scrollBy(0,dy)};

// ---------- 08 纸上绘本 · fullscreen pop-up book ----------
const HB={f:$('ifH'),ld:0,ready:0,fs:0,savedY:0};
const hbMsg=m=>{const w=HB.f.contentWindow;if(w&&HB.f.src)w.postMessage(m,'*')};
function markHbReady(){HB.ready=1;$('huiben').classList.add('ready');const fs=$('hbfs');fs&&fs.classList.add('ready');const ld=$('hbload');if(ld){ld.style.opacity='0';ld.style.pointerEvents='none';ld.hidden=true}}
addEventListener('message',e=>{const d=e.data||{};if(e.source!==HB.f.contentWindow)return;if(d.sb==='progress'){const ld=$('hbload');if(ld)ld.style.setProperty('--p',(d.v*100).toFixed(0)+'%');if(d.v>=1&&!HB.ready)markHbReady()}});
HB.f.addEventListener('load',()=>{if(HB.f.getAttribute('src'))markHbReady()});
function openHuiben(){if(HB.fs)return;HB.fs=1;HB.savedY=scrollY;const fs=$('hbfs');fs.hidden=false;document.body.classList.add('hb-open');document.body.style.overflow='hidden';lenis&&lenis.stop();
 if(!HB.ld){HB.ld=1;HB.ready=0;fs.classList.remove('ready');const ld=$('hbload');if(ld){ld.hidden=false;ld.style.opacity='';ld.style.pointerEvents=''}HB.f.src='huiben/index.html'+(window.__clock!=null?'?capture':'')}else{if(HB.ready)markHbReady();hbMsg({sb:'pause',v:false})}
 requestAnimationFrame(()=>fs.classList.add('on'))}
function closeHuiben(){if(!HB.fs)return;HB.fs=0;const fs=$('hbfs');fs.classList.remove('on');hbMsg({sb:'pause',v:true});document.body.classList.remove('hb-open');document.body.style.overflow='';lenis&&lenis.start();setTimeout(()=>{if(!HB.fs)fs.hidden=true},320);scrollTo(0,HB.savedY)}
$('hbopen').addEventListener('click',openHuiben);$('hbback').addEventListener('click',closeHuiben);
{const fs=$('hbfs');let sy=null;fs.addEventListener('pointerdown',e=>{if(e.target.closest('#hbback,iframe'))return;sy=e.clientY});fs.addEventListener('pointermove',e=>{if(sy!=null&&e.clientY-sy>72){closeHuiben();sy=null}});fs.addEventListener('pointerup',()=>sy=null);addEventListener('keydown',e=>{if(e.key==='Escape'&&HB.fs)closeHuiben()})}

// ---------- HUD progress + back-to-top (scroll position only; no layout work) ----------
const PG=$('PG'),TT=$('totop'),RING=$('ttp'),SDA=CSS.supports&&CSS.supports('animation-timeline: scroll()');let maxY=1,hudRaf=0,ttOn=null;
const measureMax=()=>{maxY=Math.max(1,document.documentElement.scrollHeight-innerHeight)};
function hudTick(){hudRaf=0;const y=scrollY,p=cl(y/maxY);if(!SDA)PG.style.transform=`scaleX(${p.toFixed(4)})`;RING.style.strokeDashoffset=(113.1*(1-p)).toFixed(1);const on=y>innerHeight*.9&&act!=='foot';if(on!==ttOn){ttOn=on;TT.classList.toggle('show',on);TT.classList.toggle('foot-hide',act==='foot')}}
addEventListener('scroll',()=>{if(!hudRaf)hudRaf=requestAnimationFrame(hudTick)},{passive:true});
TT.addEventListener('click',()=>window.__smoothTo(0));
{const bar=Q('#HUD .bar')[0];let dn=false;const go=(e,instant)=>{const r=bar.getBoundingClientRect();window.__smoothTo(cl((e.clientX-r.left)/r.width)*maxY,instant)};
 bar.addEventListener('pointerdown',e=>{if(e.pointerType==='touch')return;dn=true;bar.setPointerCapture(e.pointerId);go(e)});
 bar.addEventListener('pointermove',e=>{if(dn)go(e,true)});bar.addEventListener('pointerup',()=>dn=false);bar.addEventListener('pointercancel',()=>dn=false)}

// ---------- desktop cursor + magnetic buttons (event-driven; idle costs nothing) ----------
if(FINE){const C=document.createElement('div');C.id='cur';C.innerHTML='<i></i><b>VIEW</b>';document.body.appendChild(C);let mx=-99,my=-99,x=-99,y=-99,run=0;
 const step=()=>{x+=(mx-x)*.22;y+=(my-y)*.22;C.style.transform=`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;if(Math.abs(mx-x)+Math.abs(my-y)>.3)requestAnimationFrame(step);else run=0};
 addEventListener('pointermove',e=>{if(e.pointerType!=='mouse')return;mx=e.clientX;my=e.clientY;if(!run){run=1;requestAnimationFrame(step)}},{passive:true});
 addEventListener('pointerover',e=>{const el=e.target.closest?e.target:null;const tt=el&&el.closest('#totop'),tg=!tt&&el&&el.closest('[data-cur],a,.card,.mag');C.style.opacity=tt?'0':'';C.classList.toggle('big',!!tg);C.querySelector('b').textContent=tg&&tg.dataset.cur?tg.dataset.cur:'VIEW'},{passive:true});
 Q('#ovix .ix,.flinks a,.sk-go,.wy-go,.xj-acts a,.c2 .go,#hbopen,#lcwalk,#totop').forEach(m=>{let r=null;
  m.addEventListener('pointerenter',()=>{r=m.getBoundingClientRect();m.classList.add('magon')});
  m.addEventListener('pointermove',e=>{if(!r)return;m.style.translate=`${((e.clientX-r.left-r.width/2)*.25).toFixed(1)}px ${((e.clientY-r.top-r.height/2)*.3).toFixed(1)}px`});
  m.addEventListener('pointerleave',()=>{r=null;m.classList.remove('magon');m.style.translate=''})})}

// ---------- first-load loader + opening ink intro (time-based, then the loop stops) ----------
const SEEN=(()=>{try{const v=sessionStorage.getItem('dm-seen');sessionStorage.setItem('dm-seen','1');return!!v}catch(_){return false}})();
const LS=SEEN?.45:1;
const HERO=Q('[data-ovbg]').map(e=>e.dataset.ovbg);let prog=0,shown=0,ready=false;const LT=performance.now();
async function heroLoad(){LOG.hero={start:Math.round(performance.now()-T0)};const tot={};let total=0;
 await Promise.all(HERO.map(async src=>{const r=await fetch(src);const len=+r.headers.get('content-length')||40000;total+=len;const rd=r.body.getReader();const parts=[];for(;;){const{done,value}=await rd.read();if(done)break;parts.push(value);tot[src]=(tot[src]||0)+value.length;prog=Object.values(tot).reduce((a,b)=>a+b,0)/total*.9}
  const url=URL.createObjectURL(new Blob(parts,{type:'image/webp'}));await imgP(url);Q(`[data-ovbg="${src}"]`).forEach(e=>e.style.backgroundImage=`url(${url})`)}));
 await document.fonts.load('100px BrushH');await document.fonts.load('15px FrL');prog=1;ready=true;LOG.hero.end=Math.round(performance.now()-T0)}
heroLoad();
let loaderDone=false,exitT0=0,OVS=null,introDone=false;
const LTX=$('ltx'),LMETA=$('lmeta'),LBAR=Q('#lbar i')[0],LPCT=$('lpct'),LSPANS=Q('#lmeta .w span'),LOADER=$('loader'),LHALF=Q('#loader .half'),LSVG=LOADER.querySelector('svg');
function loader(now){if(loaderDone)return;const el=(now-LT)/1000/LS;
 shown+=(Math.min(prog,el/1.4)-shown)*(SEEN?.3:.12);const draw=cl(el/1.6);
 LTX.style.strokeDashoffset=3000*(1-io(draw));LTX.style.fill=`rgba(42,33,27,${seg(el,1.1,1.7)})`;
 LSPANS.forEach((s,i)=>{const t=qo(seg(el,.2+i*.08,.7+i*.08));s.style.opacity=t;s.style.transform=`translateY(${(1-t)*14}px)`});
 LBAR.style.width=(shown*100)+'%';LPCT.textContent='LOADING '+Math.round(shown*100)+'%';
 if(ready&&shown>.985&&el>1.7&&!exitT0){exitT0=now;OVS=now+420*LS}
 if(exitT0){const k=(now-exitT0)/LS,tx=io(cl(k/380)),t=io(cl((k-260)/640));LTX.style.fill=`rgba(42,33,27,${1-tx})`;LTX.style.stroke=`rgba(42,33,27,${1-tx})`;LMETA.style.opacity=1-tx;LSVG.style.transform=`translateY(${-tx*18}px)`;
  LOADER.style.background=`rgba(239,231,218,${1-t})`;LHALF.forEach(h=>h.style.opacity=1-t);
  if(t>=1){loaderDone=true;LOADER.style.display='none'}}}
const ovSpans=Q('#ovwm span').map(s=>({el:s,gf:s.querySelector('.gf'),bl:s.querySelector('.bl')}));
const OVI=Q('#ovix .ix'),ovixSc=Q('#ovix .sc')[0],ovixHint=Q('#ovix .m-hint')[0],ovixEl=$('ovix');
const WT=WMS.length?WMS[WMS.length-1].t0+.3:0,INTRO_END=WT+2.6;
function intro(now){
 const rt=OVS==null?0:(window.__clock!=null?99:(now-OVS)/1000);
 WMS.forEach(m=>{const t=cl((rt-m.t0)/.3);m.el.style.strokeDashoffset=(1-qo(t)).toFixed(4);if(t>0&&t<1){const L=m.len*qo(t),p=m.el.getPointAtLength(L);m.tip.setAttribute('cx',p.x.toFixed(1));m.tip.setAttribute('cy',p.y.toFixed(1));m.tip.style.opacity=(.9*Math.sin(Math.PI*t)).toFixed(3);m.tip.setAttribute('r',(52-26*t).toFixed(1))}else if(t>=1)m.tip.style.opacity=0});
 const fill=oc(cl((rt-WT+.15)/.5));
 ovSpans.forEach(s=>{s.gf.style.opacity=fill.toFixed(3);s.bl.style.opacity=(fill*.17).toFixed(3)});
 const sr=cl((rt-WT-.1)/.42),ssc=sr<.62?lerp(2.6,.9,io(sr/.62)):lerp(.9,1,oc((sr-.62)/.38));
 $('ovseal').style.opacity=cl(sr*4);$('ovseal').style.transform=`scale(${ssc}) rotate(${-4-(1-sr)*10}deg)`;
 const rg=cl((rt-WT-.37)/.8);$('ovring').style.opacity=rg>0&&rg<1?(1-rg)*.6:0;$('ovring').style.transform=`scale(${1+oc(rg)*1.3}) rotate(-4deg)`;
 const ir=oc(cl(rt/1.6));$('ovimg').style.opacity=ir;$('ovimg').style.transform=`scale(${1.07-.07*ir})`;
 TAGC.forEach((c,i)=>{const t=cl((rt-WT-.15-i*.12)/.55),e=oc(t);c.style.opacity=cl(t*2.5);c.style.transform=t<1?`translate3d(0,${((1-e)*-10).toFixed(2)}px,0) scale(${(1+(1-e)*.35).toFixed(3)})`:'none'});
 [['ovk',.55],['ovtag',.75],['ovcap',.9]].forEach(([id,d])=>{const r=oc(cl((rt-d)/.8));$(id).style.opacity=r;$(id).style.transform=r<1?`translate3d(0,${(1-r)*12}px,0)`:'none'});
 OVI.forEach((x,i)=>{const r=oc(cl((rt-1.0-i*.05)/.7));x.style.opacity=r;x.style.transform=r<1?`translate3d(0,${(1-r)*10}px,0)`:'none'});
 if(ovixSc)ovixSc.style.opacity=cl((rt-1.6)/.6);if(ovixHint)ovixHint.style.opacity=cl((rt-1.1)/.6);
 if(ovixEl)ovixEl.style.borderTopColor=`rgba(28,25,22,${.16*cl((rt-.9)/.6)})`;
 if(rt>=INTRO_END){introDone=true;$('ov').classList.add('alive')}
}
function layout(){W=innerWidth;H=innerHeight;DPR=Math.min(2,devicePixelRatio||1);fitPoems();measureMax();hudTick()}
let lastW=innerWidth;addEventListener('resize',()=>{if(Math.abs(innerWidth-lastW)<2&&MOB){measureMax();return}lastW=innerWidth;layout()});
layout();addEventListener('load',measureMax);
function loop(now){loader(now);if(!introDone)intro(now);if(!loaderDone||!introDone)requestAnimationFrame(loop)}
requestAnimationFrame(loop);
window.__render=()=>{intro(performance.now())};window.__loaderIsDone=()=>loaderDone;
})();
