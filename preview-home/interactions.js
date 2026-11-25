(()=>{
const $=id=>document.getElementById(id),Q=(s,r=document)=>[...r.querySelectorAll(s)];
const SITE='https://duomei.site';
const NOTE_SLUGS=window.__NOTE_SLUGS||['tea-town-sunset','window-morning-note','duomei-paper-shadow','old-town-overlook','desk-camera-light','guilin-river-tea','note-1782966727392','guilin-matcha-parfait'];
const GUYU_ROUTES=['/guyu/meiyou-yujian','/guyu/zhi-shang-feiyan','/guyu/xinshuo-01','/guyu/xinshuo-02','/guyu/gui-xiang-huan-xiang','/dalu'];
const STICKER_URLS=['https://w.url.cn/s/ANJIS6e#wechat_redirect','https://w.url.cn/s/A5vPMKw#wechat_redirect'];
const BOOKS=['没有遇见 何来艳遇','纸上飞檐','想象画本','月亮下的童梦','桂巷还香','七国 · 地理与风物设定集'];
const MAPS=[['紅樓夢影','大观园 · 依《红楼梦》原文复原的园林','img/yy/hong.webp',25.35],['诗语江南','江南 · 园林一隅','img/yy/jiangnan.webp',27.2],['夏日小院','云上 · 夏日小院','img/yy/xiaoyuan.webp',29.2],['沿水看桂林','桂林 · 两江四湖','img/map-guilin.webp',31.4],['超级大陆','立体卫星图','img/yy/chaoji.webp',21.8],['大陆','奇幻大陆 · 地图','img/yy/dalu.webp',22.2]];

/* ===== Toast & Clipboard Copy (WeChat Sticker Links) ===== */
let toastTimer=0;
function showToast(msg){
 const t=$('dm-toast');if(!t)return;
 t.textContent=msg;t.classList.add('on');
 clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>t.classList.remove('on'),2600);
}
async function copyText(val){
 if(navigator.clipboard&&window.isSecureContext){
  try{await navigator.clipboard.writeText(val);return true}catch(_){}
 }
 const ta=document.createElement('textarea');
 ta.value=val;ta.readOnly=true;ta.style.cssText='position:fixed;opacity:0;pointer-events:none;left:-9999px';
 document.body.appendChild(ta);
 let ok=false;
 try{ta.focus();ta.select();ta.setSelectionRange(0,val.length);ok=document.execCommand('copy')}catch(_){}
 ta.remove();
 return ok;
}
async function handleStickerCopy(url,btn){
 const ok=await copyText(url);
 if(ok){
  showToast('已复制微信表情链接，请粘贴到微信打开');
  if(btn){const orig=btn.dataset.orig||btn.textContent;btn.dataset.orig=orig;btn.textContent='链接已复制 ✓';btn.classList.add('copied');setTimeout(()=>{btn.textContent=orig;btn.classList.remove('copied')},2200)}
 }else{
  showToast('复制失败，请稍后再试');
 }
}
Q('.stk-copy').forEach(btn=>{
 btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();handleStickerCopy(btn.dataset.url,btn)});
});
Q('.stk-dl').forEach(a=>{
 a.addEventListener('click',e=>e.stopPropagation());
});

/* ===== 1:1 Production Header: Brand + Scroll Reveal/Hide + Three-dot Menu ===== */
(function setupHeader(){
 const header=$('UI'),brand=$('dm-brand'),menuBtn=$('dm-menu-btn'),menu=$('dm-menu'),hoverZone=$('dm-hover-zone');
 if(!header||!menuBtn||!menu)return;
 let menuOpen=false,scrolled=false,scrollRevealed=true,hoverRevealed=false;
 let lastY=scrollY,quietUntil=0,rafId=0,hoverCloseTimer=0,touchStart=null,lastTouchTs=-9999;

 const syncHeader=()=>{
  const visible=!scrolled||scrollRevealed||hoverRevealed||menuOpen;
  header.classList.toggle('is-hidden',!visible);
  header.classList.toggle('is-menu-open',menuOpen);
  menuBtn.setAttribute('aria-expanded',menuOpen?'true':'false');
  menuBtn.setAttribute('aria-label',menuOpen?'关闭导航':'打开导航');
 };
 const cancelHoverClose=()=>{if(hoverCloseTimer){clearTimeout(hoverCloseTimer);hoverCloseTimer=0}};
 const closeMenu=()=>{
  cancelHoverClose();
  delete header.dataset.menuHoverOpened;
  if(!menuOpen&&!hoverRevealed)return;
  menuOpen=false;hoverRevealed=false;syncHeader();
 };
 const openMenu=(byHover=false)=>{
  cancelHoverClose();
  if(byHover)header.dataset.menuHoverOpened='true';
  menuOpen=true;
  if(window.__closeMusicCard)window.__closeMusicCard();
  syncHeader();
 };
 window.__closeHeaderMenu=closeMenu;
 window.__onSecJump=key=>{
  closeMenu();
  if(key&&key!=='hero'){
   quietUntil=Date.now()+1800;
   if(scrollY>36)scrollRevealed=false;
   syncHeader();
  }else{
   quietUntil=0;scrollRevealed=true;syncHeader();
  }
 };

 const updateOnScroll=()=>{
  rafId=0;
  const y=scrollY,nextScrolled=y>36;
  scrolled=nextScrolled;
  if(!nextScrolled){
   hoverRevealed=false;scrollRevealed=true;
  }else if(y-lastY>6){
   menuOpen=false;hoverRevealed=false;scrollRevealed=false;
   delete header.dataset.menuHoverOpened;
   if(window.__closeMusicCard)window.__closeMusicCard();
  }else if(lastY-y>6&&Date.now()>quietUntil){
   scrollRevealed=true;
  }
  lastY=y;
  syncHeader();
 };
 addEventListener('scroll',()=>{if(!rafId)rafId=requestAnimationFrame(updateOnScroll)},{passive:true});
 ['wheel','touchstart','keydown'].forEach(ev=>addEventListener(ev,()=>{quietUntil=0},{passive:true}));
 updateOnScroll();

 if(hoverZone){
  hoverZone.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'){hoverRevealed=true;syncHeader()}});
 }
 header.addEventListener('pointerenter',e=>{
  if(e.pointerType==='mouse'){hoverRevealed=true;cancelHoverClose();syncHeader()}
 });
 header.addEventListener('pointerleave',e=>{
  if(e.pointerType!=='mouse')return;
  if(e.relatedTarget instanceof Element&&e.relatedTarget.closest('#dm-music-card'))return;
  if(menuOpen&&header.dataset.menuHoverOpened==='true'){
   cancelHoverClose();
   hoverCloseTimer=setTimeout(()=>{hoverCloseTimer=0;delete header.dataset.menuHoverOpened;closeMenu()},400);
   return;
  }
  if(scrolled&&!menuOpen){hoverRevealed=false;syncHeader()}
 });

 menuBtn.addEventListener('pointerenter',e=>{
  if(e.pointerType!=='mouse'||menuOpen)return;
  openMenu(true);
 });
 menuBtn.addEventListener('click',e=>{
  if(e.pointerType==='mouse'&&header.dataset.menuHoverOpened==='true'){
   delete header.dataset.menuHoverOpened;return;
  }
  if(menuOpen)closeMenu();else openMenu(false);
 });

 if(brand){
  brand.addEventListener('click',e=>{
   e.preventDefault();
   closeMenu();
   if(window.__scrollToSec)window.__scrollToSec('hero');
   else scrollTo({top:0,behavior:'smooth'});
  });
 }

 Q('a',menu).forEach(a=>{
  a.addEventListener('click',e=>{
   if(a.dataset.ext==='1'){
    setTimeout(closeMenu,0);
    return;
   }
   e.preventDefault();
   const sec=a.dataset.sec||'hero';
   if(window.__scrollToSec)window.__scrollToSec(sec);
   closeMenu();
  });
 });

 // Native short-tap touch activation for iOS Safari / WebViews
 header.addEventListener('touchstart',e=>{
  if(e.touches.length!==1){touchStart=null;return}
  touchStart={x:e.touches[0].clientX,y:e.touches[0].clientY};
 },{capture:true,passive:true});
 header.addEventListener('touchend',e=>{
  const st=touchStart;touchStart=null;
  const t=e.changedTouches[0];
  if(!st||!t||Math.hypot(t.clientX-st.x,t.clientY-st.y)>10)return;
  const target=e.target instanceof Element?e.target.closest('a,button'):null;
  if(!target||!header.contains(target))return;
  e.preventDefault();
  lastTouchTs=performance.now();
  if(target.tagName==='A'&&target.dataset.ext==='1'){
   closeMenu();
   window.location.assign(target.href);
   return;
  }
  target.click();
 },{capture:true,passive:false});
 header.addEventListener('touchcancel',()=>{touchStart=null},{capture:true,passive:true});
 header.addEventListener('click',e=>{
  if(e.isTrusted&&performance.now()-lastTouchTs<700){e.preventDefault();e.stopPropagation()}
 },true);

 document.addEventListener('pointerdown',e=>{
  if(menuOpen&&e.target instanceof Node&&!header.contains(e.target))closeMenu();
 });
 addEventListener('keydown',e=>{
  if(e.key==='Escape'&&menuOpen){closeMenu();if(document.activeElement instanceof HTMLElement)document.activeElement.blur()}
 });
})();

/* ===== 1:1 Original Music Player (2 Albums · 19 Tracks, Never Auto-play) ===== */
(function setupMusicPlayer(){
 const orbWrap=$('dm-music'),orb=$('dm-orb'),card=$('dm-music-card');
 if(!orb||!card)return;
 const coverBtn=$('dm-mcover'),coverImg=$('dm-mimg'),nowBtn=$('dm-mnow'),titleEl=$('dm-mtitle'),subEl=$('dm-msub');
 const prevBtn=$('dm-prev'),playBtn=$('dm-play'),playIc=$('dm-play-ic'),nextBtn=$('dm-next');
 const modeBtn=$('dm-mode'),modeIc=$('dm-mode-ic'),muteBtn=$('dm-mute'),muteIc=$('dm-mute-ic'),qBtn=$('dm-queue-btn');
 const prog=$('dm-prog'),panel=$('dm-mpanel');

 const ALBUMS=[
  {id:'garden',title:'诗语江南 · 园中曲',note:'古风纯音乐 · 多美 作曲',cover:`${SITE}/images/originals/garden.webp`,fallback:'img/t/jn.webp',root:`${SITE}/xiaoyuan-scene/audio/`,seeds:[
   ['bgm-qingchen','清晨','古筝 · 洞箫 · 流水',167549],
   ['bgm-zhuying','竹影','风过修竹',180820],
   ['bgm-wuhe','午荷','琵琶 · 竹笛 · 蝉声',158459],
   ['bgm-afternoon','午后','林下清荫',177789],
   ['bgm-fuyuan','浮园','云上小园',72542],
   ['bgm-yanyu','烟雨','琵琶轮指 · 雨打荷叶',168124],
   ['bgm','暮色','园中黄昏',179775],
   ['bgm-mulang','暮廊','二胡 · 灯笼渐亮',156186],
   ['bgm-night','夜泊','月下回廊',166034],
   ['bgm-yueye','月夜','古琴 · 洞箫 · 细雨',156134],
   ['bgm-yutie','玉与铁','国潮 · 鼓点',146547]
  ]},
  {id:'seasons',title:'诗语江南 · 四季',note:'古风纯音乐 · 多美 作曲',cover:`${SITE}/images/originals/seasons.webp`,fallback:'img/yy/xiaoyuan.webp',root:`${SITE}/audio/originals/`,seeds:[
   ['bgm2-chunyu','春雨','古筝 · 洞箫',150727],
   ['bgm2-xinghua','杏花','曲笛 · 琵琶',150204],
   ['bgm2-xiahe','夏荷','古琴泛音 · 竹笛',153078],
   ['bgm2-zhuliang','竹凉','扬琴 · 洞箫',156552],
   ['bgm2-qiugui','秋桂','琵琶轮指 · 古筝',152842],
   ['bgm2-qiuyue','秋月','古琴 · 箫',149656],
   ['bgm2-dongxue','冬雪','古筝泛音 · 笙',124656],
   ['bgm2-meiying','梅影','曲笛 · 古琴',148898]
  ]}
 ];
 const TRACKS=[];
 ALBUMS.forEach(alb=>{
  alb.tracks=alb.seeds.map(([file,name,sub,dur])=>{
   const tr={id:`original-${file}`,name,sub,duration:dur/1000,src:`${alb.root}${file}.mp3`,cover:alb.cover,fallback:alb.fallback,albumId:alb.id};
   TRACKS.push(tr);return tr;
  });
 });

 const fmt=s=>{if(!Number.isFinite(s)||s<0)return'0:00';const m=Math.floor(s/60);return`${m}:${String(Math.floor(s%60)).padStart(2,'0')}`};
 const audio=new Audio();
 audio.preload='none';

 let curIdx=2; // 默认选中《午荷》 (琵琶 · 竹笛 · 蝉声)，绝不自动播放
 let isOpen=false,qOpen=false,playing=false,muted=false,mode='shuffle';
 const failed=new Set();
 const rowEls=[];

 // Build 19-track album drawer
 panel.innerHTML=ALBUMS.map(alb=>`<section class="dm-malb"><header class="dm-malb-hd"><img src="${alb.cover}" data-fb="${alb.fallback}" alt="" loading="lazy" referrerpolicy="no-referrer"><div><strong>${alb.title}</strong><small>${alb.note} · ${alb.tracks.length} 首</small></div></header>${alb.tracks.map((tr,pos)=>{const gIdx=TRACKS.indexOf(tr);return`<button type="button" class="dm-mrow" data-idx="${gIdx}" role="listitem"><span class="no">${String(pos+1).padStart(2,'0')}</span><span class="inf"><b>${tr.name}</b><small>${tr.sub}</small></span><em>${fmt(tr.duration)}</em></button>`}).join('')}</section>`).join('');
 Q('img[data-fb]',panel).forEach(im=>im.addEventListener('error',function onErr(){im.removeEventListener('error',onErr);im.src=im.dataset.fb}));
 coverImg.addEventListener('error',()=>{const tr=TRACKS[curIdx];if(tr&&coverImg.src!==tr.fallback)coverImg.src=tr.fallback});
 Q('.dm-mrow',panel).forEach(btn=>{
  const i=+btn.dataset.idx;rowEls[i]=btn;
  btn.addEventListener('click',()=>playAt(i,true));
 });
 panel.addEventListener('wheel',e=>{if(e.ctrlKey||e.deltaY===0)return;e.stopPropagation()},{passive:true});

 const syncUI=()=>{
  const tr=TRACKS[curIdx]||TRACKS[0];
  titleEl.textContent=tr.name;
  subEl.textContent=tr.sub;
  if(coverImg.dataset.alb!==tr.albumId){coverImg.dataset.alb=tr.albumId;coverImg.src=tr.cover}
  orb.classList.toggle('is-playing',playing);
  card.classList.toggle('is-playing',playing);
  card.classList.toggle('open',isOpen);
  card.classList.toggle('q-open',qOpen);
  card.setAttribute('aria-hidden',isOpen?'false':'true');
  orb.setAttribute('aria-expanded',isOpen?'true':'false');
  qBtn.classList.toggle('on',qOpen);
  qBtn.setAttribute('aria-pressed',qOpen?'true':'false');
  muteBtn.classList.toggle('on',muted);
  document.body.classList.toggle('dm-music-open',isOpen);
  playBtn.setAttribute('aria-label',playing?'暂停':'播放');
  playIc.innerHTML=playing?'<path d="M8.5 6.5v11M15.5 6.5v11"/>':'<path class="fill" d="m9 6 9 6-9 6Z"/>';
  muteIc.innerHTML=muted?'<path class="fill" d="M4.5 9v6h4l5 4V5l-5 4Z"/><path d="m17 9 4 6m0-6-4 6"/>':'<path class="fill" d="M4.5 9v6h4l5 4V5l-5 4Z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/>';
  if(mode==='shuffle'){
   modeBtn.title='随机播放';
   modeIc.innerHTML='<path d="M4 7h3c4.5 0 5.5 10 10 10h3M17 14l3 3-3 3M4 17h3c1.8 0 3-1.6 4-3.5M14 8.5C15 7.5 16 7 17.5 7H20M17 4l3 3-3 3"/>';
  }else if(mode==='one'){
   modeBtn.title='单曲循环';
   modeIc.innerHTML='<path d="M6 7h11l-2.5-2.5M17 7l-2.5 2.5M18 17H7l2.5-2.5M7 17l2.5 2.5"/><text x="12" y="14.5" text-anchor="middle" fill="currentColor" stroke="none" font-size="7.5" font-weight="700">1</text>';
  }else{
   modeBtn.title='顺序循环';
   modeIc.innerHTML='<path d="M6 7h11l-2.5-2.5M17 7l-2.5 2.5M18 17H7l2.5-2.5M7 17l2.5 2.5"/>';
  }
  rowEls.forEach((r,k)=>{if(r)r.classList.toggle('cur',k===curIdx)});
 };

 const setProg=(cur,dur)=>{
  const d=dur>0?dur:(TRACKS[curIdx]?.duration||1);
  const pct=Math.min(100,Math.max(0,(cur/d)*100));
  prog.max=d.toFixed(1);
  prog.value=Math.min(cur,d).toFixed(1);
  prog.style.setProperty('--mp',pct.toFixed(2)+'%');
 };

 const openCard=()=>{
  isOpen=true;
  if(window.__closeHeaderMenu)window.__closeHeaderMenu();
  syncUI();
 };
 const closeCard=()=>{
  if(!isOpen)return;
  isOpen=false;qOpen=false;
  syncUI();
 };
 window.__closeMusicCard=closeCard;

 async function playAt(idx,userInitiated=false){
  if(idx<0||idx>=TRACKS.length)return;
  curIdx=idx;
  const tr=TRACKS[curIdx];
  setProg(0,tr.duration);
  syncUI();
  if(!userInitiated&&!playing)return;
  if(audio.dataset.tid!==tr.id){
   audio.dataset.tid=tr.id;
   audio.src=tr.src;
   audio.load();
  }
  try{
   await audio.play();
  }catch(_){
   subEl.textContent=`暂无法播放《${tr.name}》`;
  }
 }

 function stepTrack(dir,auto=false){
  if(auto&&mode==='one'){audio.currentTime=0;audio.play().catch(()=>{});return}
  const avail=TRACKS.map((t,i)=>i).filter(i=>!failed.has(TRACKS[i].id));
  if(!avail.length){playing=false;syncUI();return}
  if(mode==='shuffle'){
   const pool=avail.length>1?avail.filter(i=>i!==curIdx):avail;
   const pick=pool[Math.floor(Math.random()*pool.length)];
   playAt(pick,true);
   return;
  }
  for(let s=1;s<=TRACKS.length;s++){
   const ni=((curIdx+dir*s)%TRACKS.length+TRACKS.length)%TRACKS.length;
   if(!failed.has(TRACKS[ni].id)){playAt(ni,true);return}
  }
 }

 audio.addEventListener('play',()=>{playing=true;syncUI()});
 audio.addEventListener('pause',()=>{playing=false;syncUI()});
 audio.addEventListener('timeupdate',()=>setProg(audio.currentTime,audio.duration||TRACKS[curIdx]?.duration));
 audio.addEventListener('loadedmetadata',()=>setProg(audio.currentTime,audio.duration));
 audio.addEventListener('ended',()=>stepTrack(1,true));
 audio.addEventListener('error',()=>{
  const tr=TRACKS[curIdx];
  if(tr)failed.add(tr.id);
  if(failed.size<TRACKS.length)stepTrack(1,false);
  else{playing=false;subEl.textContent='音频暂不可用';syncUI()}
 });

 orb.addEventListener('click',e=>{e.stopPropagation();if(isOpen)closeCard();else openCard()});
 orbWrap.addEventListener('click',e=>{if(e.target===orbWrap){e.stopPropagation();if(isOpen)closeCard();else openCard()}});
 playBtn.addEventListener('click',()=>{
  if(!audio.paused){audio.pause();return}
  playAt(curIdx,true);
 });
 prevBtn.addEventListener('click',()=>stepTrack(-1,false));
 nextBtn.addEventListener('click',()=>stepTrack(1,false));
 modeBtn.addEventListener('click',()=>{
  mode=mode==='shuffle'?'sequence':mode==='sequence'?'one':'shuffle';
  syncUI();
 });
 muteBtn.addEventListener('click',()=>{
  muted=!muted;audio.muted=muted;syncUI();
 });
 const toggleQueue=()=>{
  qOpen=!qOpen;syncUI();
  if(qOpen&&rowEls[curIdx])setTimeout(()=>rowEls[curIdx].scrollIntoView({block:'nearest'}),60);
 };
 qBtn.addEventListener('click',toggleQueue);
 coverBtn.addEventListener('click',toggleQueue);
 nowBtn.addEventListener('click',toggleQueue);

 prog.addEventListener('input',()=>{
  const v=parseFloat(prog.value);
  if(Number.isFinite(v)){
   if(audio.src)audio.currentTime=v;
   setProg(v,audio.duration||TRACKS[curIdx]?.duration);
  }
 });

 document.addEventListener('pointerdown',e=>{
  if(!isOpen)return;
  if(e.target instanceof Node&&(card.contains(e.target)||orbWrap.contains(e.target)))return;
  closeCard();
 });
 addEventListener('keydown',e=>{if(e.key==='Escape'&&isOpen)closeCard()});

 setProg(0,TRACKS[curIdx].duration);
 syncUI();
})();

/* ===== Modal Preview & Real Route CTAs ===== */
const m=document.createElement('div');m.id='modal';m.innerHTML=`<div class="mbg"></div><article role="dialog" aria-modal="true" aria-label="内容预览"><button id="mclose" type="button" aria-label="关闭">返回 ×</button><div id="mcontent"></div><nav id="mnav"><button type="button" id="mprev" aria-label="上一项">←</button><span id="midx"></span><button type="button" id="mnext" aria-label="下一项">→</button></nav></article>`;document.body.appendChild(m);
let kind='',idx=0,prevf=null,oldY='',xj=null;
function show(k,i){if(!m.classList.contains('on')){prevf=document.activeElement;oldY=document.body.style.overflow;document.body.style.overflow='hidden';window.__lenis&&window.__lenis.stop()}kind=k;idx=i;m.classList.add('on');$('mcontent').innerHTML='';$('mnav').style.display=k==='book'||k==='sticker'||k==='note'?'flex':'none';$('mclose').focus();draw()}
function close(){m.classList.remove('on');document.body.style.overflow=oldY;window.__lenis&&window.__lenis.start();prevf&&prevf.focus();setTimeout(()=>{if(!m.classList.contains('on'))$('mcontent').innerHTML=''},500)}
function draw(){const c=$('mcontent');c.className=kind;
 if(kind==='book'){
  const rt=GUYU_ROUTES[idx]||'/guyu';
  c.innerHTML=`<div class="mcover"><img src="img/book${idx}.webp" alt="${BOOKS[idx]}"></div><div class="minfo"><span class="kick">故语 · 全套六本 · 预览封面</span><h3>${BOOKS[idx]}</h3><p>把旧日收好，等后来的人翻阅。<br>有些话，只适合留在纸页之间。</p><div class="macts"><a class="mbtn" href="${SITE}${rt}">翻开这一本 →</a><a class="mbtn ghost" href="${SITE}/guyu">故语书架 →</a></div></div>`;
  $('midx').textContent=`0${idx+1} / 06`;
 }
 if(kind==='sticker'){
  const z=idx===1,url=STICKER_URLS[z?1:0],qr=`img/st/${z?'qr-zhu':'qr-duomei'}.webp`,dl=z?'duomei-zhu-zhu-wechat-qr.webp':'duomei-wechat-qr.webp';
  c.innerHTML=`<div class="mqr"><img src="${qr}" alt="微信表情二维码"></div><div class="minfo"><span class="kick">微信表情包 · 扫码或复制链接添加</span><h3>${z?'多美猪猪':'多美'}</h3><p>微信扫一扫二维码，或复制链接粘贴到微信内打开。</p><div class="macts"><button type="button" class="mbtn m-stk-copy">复制微信链接</button><a class="mbtn ghost" href="${qr}" download="${dl}">保存二维码 ↓</a></div></div>`;
  const cpBtn=c.querySelector('.m-stk-copy');if(cpBtn)cpBtn.onclick=()=>handleStickerCopy(url,cpBtn);
  $('midx').textContent=`0${idx+1} / 02`;
 }
 if(kind==='xunji'){
  if(!xj){c.innerHTML='<p class="mload">正在翻开素材…</p>';fetch('xunji.json').then(r=>r.json()).then(j=>{xj=j;if(kind==='xunji'&&m.classList.contains('on'))draw()});return}
  const g=xj[idx];
  c.innerHTML=`<div class="mxj"><span class="kick">寻迹 · ${g.cat} · 2026-11-23</span><h3>${g.title}</h3><p class="msrc">${g.src}</p><ol>${g.p.map(p=>{const a=p.indexOf('：');return`<li><b>${p.slice(0,a)}</b>${p.slice(a+1)}</li>`}).join('')}</ol><div class="macts"><a class="mbtn" href="${SITE}/xunji">前往寻迹全文 →</a><a class="mbtn ghost" href="${SITE}/xunji/archive">往期寻迹 →</a></div></div>`;
 }
 if(kind==='skill'){
  const r=Q('#klist .kr')[idx];
  c.innerHTML=`<div class="mskill"><span class="kick">Skill · 0${idx+1} / 07</span><h3>${r.querySelector('b').textContent}</h3><p>${r.querySelector('p').textContent}</p><div class="mtg">${r.querySelector('.tg').innerHTML}</div><div class="macts"><a class="mbtn" href="${SITE}/skills">前往 Skill 详情页 →</a><a class="mbtn ghost" href="https://github.com/colorsugar/agent-skills" target="_blank" rel="noopener">GitHub 仓库 ↗</a></div></div>`;
 }
 if(kind==='note'){
  const card=Q('#cards .card')[idx],img=card&&card.querySelector('img'),slug=NOTE_SLUGS[idx]||'';
  c.innerHTML=`<div class="mcover">${img?`<img src="${img.currentSrc||img.src}" alt="">`:''}</div><div class="minfo"><span class="kick">小记 · 0${idx+1} / 08</span><h3>${card.querySelector('h4').textContent}</h3><p>${card.querySelector('p').textContent}</p><small>${card.querySelector('small').textContent}</small><div class="macts"><a class="mbtn" href="${SITE}/note/${slug}">阅读全文 →</a></div></div>`;
  $('midx').textContent=`0${idx+1} / 08`;
 }
}
$('mclose').onclick=close;Q('.mbg',m)[0].onclick=close;
const nlen=()=>kind==='book'?6:kind==='note'?8:2;$('mprev').onclick=()=>{idx=(idx-1+nlen())%nlen();draw()};$('mnext').onclick=()=>{idx=(idx+1)%nlen();draw()};
addEventListener('keydown',e=>{if(!m.classList.contains('on'))return;if(e.key==='Escape')close();if(e.key==='ArrowLeft'&&(kind==='book'||kind==='note'))$('mprev').click();if(e.key==='ArrowRight'&&(kind==='book'||kind==='note'))$('mnext').click();if(e.key==='Tab'){const fs=Q('button,a[href]',m).filter(x=>x.offsetParent);const i=fs.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();fs.at(-1).focus()}else if(!e.shiftKey&&i===fs.length-1){e.preventDefault();fs[0].focus()}}});
function clickify(els,cb){els.forEach((e,i)=>{e.tabIndex=0;e.setAttribute('role','button');e.addEventListener('click',ev=>{if(ev.target.closest('a,button')&&ev.target.closest('a,button')!==e)return;cb(i)});e.addEventListener('keydown',v=>{if(v.key==='Enter'||v.key===' '){v.preventDefault();cb(i)}})})}
clickify(Q('#shelf .bk'),i=>show('book',i));
clickify(Q('.stk'),i=>show('sticker',i));
clickify(Q('#xlist .xi'),i=>show('xunji',i));
clickify(Q('#xfeat .xf'),i=>show('xunji',i));
clickify(Q('#klist .kr'),i=>show('skill',i));
clickify(Q('#cards .card'),i=>{if(window.__xjDragged)return;show('note',i)});

// Atlas thumbnails slider
window.__atlasIndex=3;const MAPSRC=MAPS.map((p,i)=>i===3?(innerWidth<innerHeight?'img/map-guilin-m.webp':'img/map-guilin.webp'):p[2]);
clickify(Q('#alist li'),i=>{window.__atlasIndex=i;$('amap').style.opacity=.25;const im=new Image();im.onload=()=>{$('amap').src=im.src;$('amap').style.opacity=1};im.src=MAPSRC[i];$('ahead').querySelector('h3').textContent=MAPS[i][0];$('ahead').querySelector('p').textContent=MAPS[i][1];Q('#alist li').forEach((e,k)=>e.classList.toggle('on',k===i));$('apins').style.visibility=i===3?'visible':'hidden';$('alab').style.visibility=i===3?'visible':'hidden'});

// Footer minimal navigation
Q('.flinks a').forEach(a=>{
 if(a.dataset.go){
  a.tabIndex=0;
  a.addEventListener('click',e=>{
   e.preventDefault();
   if(window.__scrollToSec)window.__scrollToSec(a.dataset.go);
  });
  a.addEventListener('keydown',v=>{if(v.key==='Enter')a.click()});
 }
});
})();

;(()=>{const A=document.getElementById('acards');if(!A)return;let t;A.addEventListener('touchstart',()=>{A._touch=1;clearTimeout(t)},{passive:true});A.addEventListener('touchend',()=>{t=setTimeout(()=>A._touch=0,1500)},{passive:true})})();
