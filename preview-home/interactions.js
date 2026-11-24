(()=>{
const $=id=>document.getElementById(id),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const BOOKS=['没有遇见 何来艳遇','纸上飞檐','想象画本','月亮下的童梦','桂巷还香','七国 · 地理与风物设定集'];
const MAPS=[['紅樓夢影','大观园 · 依《红楼梦》原文复原的园林','img/yy/hong.webp',25.35],['诗语江南','江南 · 园林一隅','img/yy/jiangnan.webp',27.2],['夏日小院','云上 · 夏日小院','img/yy/xiaoyuan.webp',29.2],['沿水看桂林','桂林 · 两江四湖','img/map-guilin.webp',31.4],['超级大陆','立体卫星图','img/yy/chaoji.webp',21.8],['大陆','奇幻大陆 · 地图','img/yy/dalu.webp',22.2]];
const m=document.createElement('div');m.id='modal';m.innerHTML=`<div class="mbg"></div><article role="dialog" aria-modal="true" aria-label="内容预览"><button id="mclose" type="button" aria-label="关闭">返回 ×</button><div id="mcontent"></div><nav id="mnav"><button type="button" id="mprev" aria-label="上一本">←</button><span id="midx"></span><button type="button" id="mnext" aria-label="下一本">→</button></nav></article>`;document.body.appendChild(m);
let kind='',idx=0,prevf=null,oldY='',xj=null;
function show(k,i){if(!m.classList.contains('on')){prevf=document.activeElement;oldY=document.body.style.overflow;document.body.style.overflow='hidden'}kind=k;idx=i;m.classList.add('on');$('mcontent').innerHTML='';$('mnav').style.display=k==='book'||k==='sticker'?'flex':'none';$('mclose').focus();draw()}
function close(){m.classList.remove('on');document.body.style.overflow=oldY;prevf&&prevf.focus();setTimeout(()=>{if(!m.classList.contains('on'))$('mcontent').innerHTML=''},500)}
function draw(){const c=$('mcontent');c.className=kind;
 if(kind==='book'){c.innerHTML=`<div class="mcover"><img src="img/book${idx}.webp" alt="${BOOKS[idx]}"></div><div class="minfo"><span class="kick">故语 · 全套六本 · 预览封面</span><h3>${BOOKS[idx]}</h3><p>把旧日收好，等后来的人翻阅。<br>有些话，只适合留在纸页之间。</p><small>此方案展示全套封面，完整阅读保留原站入口。</small></div>`;$('midx').textContent=`0${idx+1} / 06`}
 if(kind==='sticker'){const z=idx===1;c.innerHTML=`<div class="mqr"><img src="img/st/${z?'qr-zhu':'qr-duomei'}.webp" alt="微信表情二维码"></div><div class="minfo"><span class="kick">微信表情包 · 扫码添加</span><h3>${z?'多美猪猪':'多美'}</h3><p>微信扫一扫，收藏这套表情。</p><small>二维码取自原站，此方案不代替扫码操作。</small></div>`;$('midx').textContent=`0${idx+1} / 02`}
 if(kind==='xunji'){if(!xj){c.innerHTML='<p class="mload">正在翻开素材…</p>';fetch('xunji.json').then(r=>r.json()).then(j=>{xj=j;if(kind==='xunji'&&m.classList.contains('on'))draw()});return}const g=xj[idx];c.innerHTML=`<div class="mxj"><span class="kick">寻迹 · ${g.cat} · 2026-11-23</span><h3>${g.title}</h3><p class="msrc">${g.src}</p><ol>${g.p.map(p=>{const a=p.indexOf('：');return `<li><b>${p.slice(0,a)}</b>${p.slice(a+1)}</li>`}).join('')}</ol><small>取自今日寻迹，保留原始素材和故事骨架。</small></div>`}
 if(kind==='skill'){const r=Q('#klist .kr')[idx];c.innerHTML=`<div class="mskill"><span class="kick">Skill · 0${idx+1} / 07</span><h3>${r.querySelector('b').textContent}</h3><p>${r.querySelector('p').textContent}</p><div class="mtg">${r.querySelector('.tg').innerHTML}</div><small>真实工作流摘要 · 已按主题归组，版本迭代不重复计数。</small></div>`}
}
$('mclose').onclick=close;Q('.mbg',m)[0].onclick=close;
$('mprev').onclick=()=>{idx=(idx-1+(kind==='book'?6:2))%(kind==='book'?6:2);draw()};$('mnext').onclick=()=>{idx=(idx+1)%(kind==='book'?6:2);draw()};
addEventListener('keydown',e=>{if(!m.classList.contains('on'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft'&&kind==='book')$('mprev').click();if(e.key==='ArrowRight'&&kind==='book')$('mnext').click();if(e.key==='Tab'){const fs=Q('button',m).filter(x=>x.offsetParent);const i=fs.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();fs.at(-1).focus()}else if(!e.shiftKey&&i===fs.length-1){e.preventDefault();fs[0].focus()}}});
function clickify(els,cb){els.forEach((e,i)=>{e.tabIndex=0;e.setAttribute('role','button');e.addEventListener('click',()=>cb(i));e.addEventListener('keydown',v=>{if(v.key==='Enter'||v.key===' '){v.preventDefault();cb(i)}})})}
clickify(Q('#shelf .bk'),i=>show('book',i));clickify(Q('.stk'),i=>show('sticker',i));clickify(Q('#xlist .xi'),i=>show('xunji',i));clickify(Q('#klist .kr'),i=>show('skill',i));
// Atlas thumbnails are a real slider: selecting a map changes the main plate. Existing four scene choices can also enter the story.
window.__atlasIndex=3;const MAPSRC=MAPS.map((p,i)=>i===3?(innerWidth<innerHeight?'img/map-guilin-m.webp':'img/map-guilin.webp'):p[2]);
clickify(Q('#alist li'),i=>{window.__atlasIndex=i;$('amap').style.opacity=.25;const im=new Image();im.onload=()=>{$('amap').src=im.src;$('amap').style.opacity=1};im.src=MAPSRC[i];$('ahead').querySelector('h3').textContent=MAPS[i][0];$('ahead').querySelector('p').textContent=MAPS[i][1];Q('#alist li').forEach((e,k)=>e.classList.toggle('on',k===i));$('apins').style.visibility=i===3?'visible':'hidden';$('alab').style.visibility=i===3?'visible':'hidden'});
// keyboard accessibility for index and footer navigation
const starts=[.8,4.8,9.8,13.2,18.4,21.5,24.6,36.6,39.5,43.3];
Q('#NAV a').forEach((e,i)=>{e.tabIndex=0;e.setAttribute('role','button');e.addEventListener('click',()=>scrollTo({top:(window.__U2Y||(v=>v))(starts[i])*innerHeight,behavior:'smooth'}));e.onkeydown=v=>{if(v.key==='Enter')e.click()}});
const fs=[0,.8,4.8,13.2,18.4,24.6,36.6,39.5,43.3];Q('.flinks a').forEach((e,i)=>{e.tabIndex=0;e.onclick=()=>scrollTo({top:(window.__U2Y||(v=>v))(fs[i])*innerHeight,behavior:'smooth'});e.onkeydown=v=>{if(v.key==='Enter')e.click()}});
$('xmore').onclick=()=>show('xunji',0);$('xmore').textContent='翻开今日素材 →';
})();

/* back to top: progress ring, idle bob, eased inertial return */
(()=>{const b=document.getElementById('totop');if(!b)return;const ring=document.getElementById('ttp'),ar=b.querySelector('.ar'),hud=document.getElementById('HUD');let anim=null;
 function tick(){const vh=innerHeight,u=scrollY/vh,max=(document.documentElement.scrollHeight-vh)/vh||1,on=u>0.9;
  const t=Math.min(1,Math.max(0,(u-.9)/.35)),e=1-Math.pow(1-t,3);b.style.opacity=e;b.style.transform=`scale(${.6+.4*e})`;b.classList.toggle('show',on);
  ring.style.strokeDashoffset=(113.1*(1-Math.min(1,u/max))).toFixed(2);
  const idle=typeof IDLE==='number'?IDLE:0,c=(window.__clock!=null?window.__clock:performance.now()/1000);ar.style.transform=`translateY(${(Math.sin(c*2.4)*1.6*idle).toFixed(2)}px)`;
  hud.classList.toggle('dk',typeof DKF!=='undefined'&&!!DKF);requestAnimationFrame(tick)}
 requestAnimationFrame(tick);
 b.addEventListener('click',()=>{if(anim)cancelAnimationFrame(anim);const y0=scrollY,vh=innerHeight,dur=Math.min(2600,1100+y0/vh*34),t0=performance.now();
  const ease=t=>t<.5?8*t*t*t*t:1-Math.pow(-2*t+2,4)/2;
  const step=now=>{const t=Math.min(1,(now-t0)/dur);window.scrollTo(0,y0*(1-ease(t)));if(t<1)anim=requestAnimationFrame(step);else anim=null};anim=requestAnimationFrame(step)});
 addEventListener('wheel',()=>{if(anim){cancelAnimationFrame(anim);anim=null}},{passive:true});addEventListener('touchstart',()=>{if(anim){cancelAnimationFrame(anim);anim=null}},{passive:true});
})();
;(()=>{const A=document.getElementById('acards');if(!A)return;let t;A.addEventListener('touchstart',()=>{A._touch=1;clearTimeout(t)},{passive:true});A.addEventListener('touchend',()=>{t=setTimeout(()=>A._touch=0,1500)},{passive:true})})();
