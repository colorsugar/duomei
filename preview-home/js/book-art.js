// 纸上山河 · pop-up pieces drawn as SVG in a gongbi / blue-green-landscape palette.
// Each piece: {w,h,svg}. Base sits on the bottom edge. A paper border is added with an SVG filter (rasterised inside the image).
(()=>{
const C={ink:'#2a2622',red:'#B3261E',ver:'#c2412d',gold:'#c9953f',jade:'#4f8a6e',azure:'#3d6f86',wall:'#f4efe6',tile:'#3a3d44',wood:'#86593a',pine:'#2f5a46',pine2:'#4f7f5c',pink:'#eaa3aa',pink2:'#d8616c',stone:'#a9a397'};
let seed=11;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647;
const BORDER=(id,r=5)=>`<filter id="${id}" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="${r+1.4}" result="o"/><feFlood flood-color="#cdbf9f"/><feComposite in2="o" operator="in" result="oc"/><feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/><feFlood flood-color="#FBF7EE"/><feComposite in2="d" operator="in" result="dc"/><feMerge><feMergeNode in="oc"/><feMergeNode in="dc"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
const SIL=(id,r=5)=>`<filter id="${id}" x="-12%" y="-12%" width="124%" height="124%"><feMorphology in="SourceAlpha" operator="dilate" radius="${r+1.4}" result="d"/><feFlood flood-color="#bfae8c"/><feComposite in2="d" operator="in"/></filter>`;
const wrap=(w,h,body,defs='',ply=false)=>{const pad=10,W=w+pad*2,H=h+pad*2;return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*2}" height="${H*2}" viewBox="${-pad} ${-pad} ${W} ${H}"><defs>${defs}${ply?SIL('f'):BORDER('f')}</defs><g filter="url(#f)">${body}</g></svg>`};
const A={};
// ---- tall karst peaks (3 silhouettes)
const KP=['M8,340 C18,262 30,190 48,128 C60,78 78,24 104,16 C134,8 150,62 158,112 C170,182 184,262 194,340Z',
 'M6,340 C14,280 22,236 40,200 C52,176 50,140 62,104 C76,62 98,30 120,34 C146,40 150,92 150,130 C152,170 170,196 180,236 C188,270 192,300 196,340Z',
 'M10,340 C24,280 22,220 36,170 C46,130 66,96 80,60 C92,32 112,10 132,22 C150,34 146,86 154,128 C164,186 186,250 190,340Z'];
A.karst=v=>{const id='k'+v,d=KP[v%3];let tex='';const r0=seed;seed=31+v*7;
 for(let i=0;i<9;i++){const x=40+rnd()*110,y=60+rnd()*230,l=26+rnd()*30;tex+=`<path d="M${x},${y} q${-8+rnd()*6},${l*.5} ${-4+rnd()*8},${l}" stroke="#25362f" stroke-opacity=".38" stroke-width="2.2" fill="none" stroke-linecap="round"/>`}
 for(let i=0;i<7;i++){const x=50+rnd()*100,y=50+rnd()*200;tex+=`<g fill="${C.pine}"><ellipse cx="${x}" cy="${y}" rx="7" ry="3.2"/><ellipse cx="${x+3}" cy="${y-4}" rx="5" ry="2.6" fill="${C.pine2}"/></g>`}
 seed=r0;
 return {w:200,h:340,body:`<defs><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3f7e7a"/><stop offset=".45" stop-color="#5f9a70"/><stop offset=".8" stop-color="#9aa774"/><stop offset="1" stop-color="#b79d6c"/></linearGradient><linearGradient id="${id}h" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#0d2420" stop-opacity=".22"/></linearGradient><clipPath id="${id}c"><path d="${d}"/></clipPath></defs>
 <path d="${d}" fill="url(#${id}g)"/><g clip-path="url(#${id}c)"><rect width="200" height="340" fill="url(#${id}h)"/>${tex}</g><path d="${d}" fill="none" stroke="#1f3a33" stroke-opacity=".55" stroke-width="2"/>`}};
// ---- pagoda (vermilion or white)
A.pagoda=v=>{const wall=v?'#eae6dc':'#e9d9b9',col=v?'#8d97a0':C.ver,roof=v?'#4b5560':'#3a3438',cx=100;let b='',y=430;
 b+=`<rect x="34" y="${y-16}" width="132" height="16" rx="2" fill="#b6a88e"/><rect x="26" y="${y-8}" width="148" height="8" fill="#9d8f76"/>`;y-=16;
 for(let i=0;i<7;i++){const th=48-i*2.6,bw=104-i*9,rw=bw+42;const yt=y-th;
  b+=`<rect x="${cx-bw/2}" y="${yt+12}" width="${bw}" height="${th-12}" fill="${wall}"/>`;
  for(let k=0;k<=4;k++)b+=`<rect x="${cx-bw/2+k*(bw-5)/4}" y="${yt+12}" width="5" height="${th-12}" fill="${col}"/>`;
  b+=`<rect x="${cx-7}" y="${yt+18}" width="14" height="${th-18}" rx="7" fill="#3b2c26" opacity=".85"/>`;
  b+=`<path d="M${cx-rw/2},${yt+16} Q${cx-rw/2+14},${yt+10} ${cx-bw/2+2},${yt+1} L${cx+bw/2-2},${yt+1} Q${cx+rw/2-14},${yt+10} ${cx+rw/2},${yt+16} Q${cx+rw/2-4},${yt+20} ${cx+rw/2-16},${yt+18} L${cx-rw/2+16},${yt+18} Q${cx-rw/2+4},${yt+20} ${cx-rw/2},${yt+16}Z" fill="${roof}"/>`;
  b+=`<path d="M${cx-rw/2+16},${yt+17} L${cx+rw/2-16},${yt+17}" stroke="${C.gold}" stroke-width="1.6"/>`;y=yt}
 b+=`<path d="M${cx},${y-62} L${cx+4},${y-30} L${cx+6},${y} L${cx-6},${y} L${cx-4},${y-30}Z" fill="${C.gold}"/>`;for(let k=0;k<4;k++)b+=`<ellipse cx="${cx}" cy="${y-10-k*9}" rx="${9-k*1.5}" ry="2.6" fill="#a6772c"/>`;
 return {w:200,h:430,body:b}};
// ---- white-wall black-tile house with horse-head gables
A.house=v=>{let b='';const w=280;
 b+=`<rect x="34" y="96" width="212" height="104" fill="${C.wall}"/><rect x="34" y="96" width="212" height="104" fill="url(#hw)"/>`;
 b+=`<path d="M22,98 Q30,90 44,70 L236,70 Q250,90 258,98 L246,100 L34,100Z" fill="${C.tile}"/>`;for(let x=50;x<236;x+=9)b+=`<path d="M${x},72 L${x-2},98" stroke="#5d626b" stroke-width="1.2"/>`;
 b+=`<path d="M18,98 L262,98" stroke="#22252b" stroke-width="3"/>`;
 const gable=(x,s)=>`<path d="M${x},200 L${x},100 L${x+s*0},86 L${x+s*18},86 L${x+s*18},62 L${x+s*38},62 L${x+s*38},44 L${x+s*54},44 L${x+s*54},200Z" fill="${C.wall}"/><path d="M${x-s*4},88 L${x+s*20},88 M${x+s*14},64 L${x+s*40},64 M${x+s*34},46 L${x+s*58},46" stroke="${C.tile}" stroke-width="6" stroke-linecap="round"/>`;
 b+=gable(26,1)+gable(254,-1);
 b+=`<circle cx="104" cy="146" r="22" fill="#3f403d"/><circle cx="104" cy="146" r="22" fill="none" stroke="#9c9789" stroke-width="3"/><path d="M90,146 H118 M104,132 V160 M94,136 L114,156 M114,136 L94,156" stroke="#8e8a7d" stroke-width="1.6"/>`;
 b+=`<rect x="160" y="136" width="36" height="64" fill="${C.wood}"/><path d="M178,136 V200" stroke="#5b3b25" stroke-width="2"/><rect x="152" y="130" width="52" height="6" fill="${C.tile}"/>`;
 b+=`<rect x="20" y="196" width="240" height="6" fill="#9a958a"/>`;
 return {w,h:204,body:b,defs:`<linearGradient id="hw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9c3b6" stop-opacity=".45"/><stop offset=".3" stop-color="#fff" stop-opacity="0"/></linearGradient>`}};
// ---- hexagonal pavilion
A.pavilion=v=>{let b='';b+=`<rect x="30" y="232" width="180" height="16" rx="2" fill="#bdb19c"/><rect x="22" y="246" width="196" height="8" fill="#9e937f"/>`;
 [52,94,146,188].forEach(x=>b+=`<rect x="${x-5}" y="120" width="10" height="114" fill="${C.ver}"/>`);
 b+=`<path d="M40,196 H200 M40,206 H200" stroke="#7a4a2c" stroke-width="3"/>`;for(let x=46;x<200;x+=12)b+=`<path d="M${x},196 V214" stroke="#7a4a2c" stroke-width="2"/>`;
 b+=`<path d="M40,124 H200" stroke="${C.gold}" stroke-width="4"/>`;
 b+=`<path d="M4,120 Q30,112 52,92 Q86,60 120,30 Q154,60 188,92 Q210,112 236,120 Q222,128 200,124 L40,124 Q18,128 4,120Z" fill="#33363c"/>`;
 b+=`<path d="M24,118 Q60,102 120,40 Q180,102 216,118" stroke="#5d626b" stroke-width="2" fill="none"/>`;for(let k=-4;k<=4;k++)b+=`<path d="M${120+k*20},${48+Math.abs(k)*14} L${120+k*24},${116}" stroke="#575c64" stroke-width="1.3"/>`;
 b+=`<path d="M120,30 L120,6" stroke="${C.gold}" stroke-width="5"/><circle cx="120" cy="8" r="7" fill="${C.gold}"/>`;
 return {w:240,h:256,body:b}};
// ---- stone arch bridge
A.bridge=v=>{let b=`<path fill-rule="evenodd" d="M0,150 L0,112 Q180,30 360,112 L360,150Z M104,150 A76,76 0 0 1 256,150Z" fill="url(#bg)"/>`;
 for(let i=0;i<12;i++){const a=Math.PI*(i/11),x=180-Math.cos(a)*88,y=150-Math.sin(a)*88,x2=180-Math.cos(a)*76,y2=150-Math.sin(a)*76;b+=`<path d="M${x},${y} L${x2},${y2}" stroke="#7e786b" stroke-width="1.6"/>`}
 b+=`<path d="M0,104 Q180,22 360,104" stroke="#8a8476" stroke-width="5" fill="none"/>`;for(let i=0;i<=10;i++){const x=i*36,y=104-Math.sin(Math.PI*i/10)*62;b+=`<rect x="${x-3}" y="${y-16}" width="6" height="16" fill="#8a8476"/>`}
 b+=`<path d="M0,92 Q180,10 360,92" stroke="#9d978a" stroke-width="3" fill="none"/>`;
 b+=`<path d="M40,118 q12,10 6,26 M318,118 q-10,12 -4,26" stroke="#6f9a55" stroke-width="3" fill="none"/>`;
 return {w:360,h:150,body:b,defs:`<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bdb6a6"/><stop offset="1" stop-color="#8f8a7c"/></linearGradient>`}};
// ---- wupeng boat
A.boat=v=>({w:300,h:120,body:`<path d="M6,72 Q150,112 294,64 L272,92 Q150,122 30,96Z" fill="${C.wood}"/><path d="M14,76 Q150,112 288,68" stroke="#5e3c24" stroke-width="2" fill="none"/>
 <path d="M86,80 Q100,30 150,28 Q200,30 214,78Z" fill="#2c2b2a"/><path d="M98,62 Q150,40 204,62 M92,72 Q150,52 210,72" stroke="#5c5852" stroke-width="1.6" fill="none"/>${[110,130,150,170,190].map(x=>`<path d="M${x},${32+Math.abs(x-150)*.2} L${x},${82}" stroke="#4a4744" stroke-width="1.2"/>`).join('')}
 <path d="M230,70 L292,10" stroke="#6b4a33" stroke-width="4" stroke-linecap="round"/>`});
// ---- trees
A.pine=v=>{let b=`<path d="M112,300 C104,252 124,222 108,182 C96,150 124,122 112,84 C108,66 116,50 122,40" stroke="#5e4330" stroke-width="16" fill="none" stroke-linecap="round"/><path d="M110,190 C140,176 160,170 178,150 M108,140 C84,128 66,120 48,104" stroke="#5e4330" stroke-width="8" fill="none" stroke-linecap="round"/>`;
 [[120,40,60],[176,146,52],[46,100,50],[96,92,56],[150,96,48],[118,150,40]].forEach(([x,y,w])=>{b+=`<path d="M${x-w},${y+6} Q${x-w*.6},${y-16} ${x},${y-14} Q${x+w*.6},${y-16} ${x+w},${y+6} Q${x},${y+16} ${x-w},${y+6}Z" fill="${C.pine}"/><path d="M${x-w*.8},${y-2} Q${x},${y-18} ${x+w*.8},${y-2}" stroke="${C.pine2}" stroke-width="5" fill="none"/>`;for(let k=-3;k<=3;k++)b+=`<path d="M${x+k*w*.25},${y-8} l${k*2},8" stroke="#1d3d30" stroke-width="1.4"/>`});
 return {w:224,h:300,body:b}};
const blossom=(cx,cy,R,n,c1,c2,trunkD,s0)=>{let b=`<path d="${trunkD}" stroke="#3a2e2a" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;const r0=seed;seed=s0;
 for(let i=0;i<n;i++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*R,x=cx+Math.cos(a)*r*1.25,y=cy+Math.sin(a)*r*.8,s=4+rnd()*5;b+=`<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${s.toFixed(1)}" fill="${rnd()<.35?c2:c1}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.4" fill="#fff6e8"/>`}seed=r0;return b};
A.plum=v=>({w:240,h:250,body:blossom(120,96,82,90,C.pink,C.pink2,'M118,250 C112,210 128,180 116,150 C106,124 80,110 58,80 M118,170 C140,150 170,140 188,104 M116,150 C120,110 136,80 130,46 M130,120 C150,100 176,84 196,62',5)});
A.sakura=v=>({w:240,h:240,body:`<path d="M60,104 Q120,10 186,92 Q236,110 200,150 Q120,186 40,150 Q4,120 60,104Z" fill="#f4c9cf" opacity=".95"/>`+blossom(120,104,80,80,'#f7d6db','#e48fa0','M120,240 C116,200 126,170 118,140 M118,170 C96,150 80,140 66,120 M120,160 C142,140 160,128 176,112',9)});
A.willow=v=>{let b=`<path d="M110,260 C106,210 118,170 110,120 C106,90 116,60 128,40" stroke="#5e4330" stroke-width="12" fill="none" stroke-linecap="round"/>`;const r0=seed;seed=21;for(let i=0;i<34;i++){const x=40+rnd()*150,y=30+rnd()*50,l=90+rnd()*90;b+=`<path d="M${x},${y} q${-10+rnd()*20},${l*.5} ${-6+rnd()*12},${l}" stroke="${rnd()<.5?'#7fa36a':'#9cbc7c'}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`}seed=r0;b+=`<path d="M40,46 Q120,0 196,46 Q120,70 40,46Z" fill="#7fa36a"/>`;return {w:230,h:260,body:b}};
A.bamboo=v=>{let b='';const r0=seed;seed=41;[60,84,112,138,160].forEach((x,i)=>{const h=180+i%2*40;b+=`<path d="M${x},230 L${x+(i-2)*3},${230-h}" stroke="#6f9a55" stroke-width="8" stroke-linecap="round"/>`;for(let y=210;y>230-h;y-=34)b+=`<path d="M${x-5},${y} h10" stroke="#47703a" stroke-width="2.4"/>`;for(let k=0;k<5;k++){const yy=230-h+rnd()*h*.7,s=rnd()<.5?-1:1;b+=`<path d="M${x},${yy} q${s*16},-6 ${s*34},4 q${-s*16},2 ${-s*34},-4Z" fill="${rnd()<.5?'#3f6b3a':'#5d8a4c'}"/>`}});seed=r0;return {w:220,h:232,body:b}};
A.rock=v=>({w:180,h:170,body:`<path d="M30,170 C10,130 34,104 26,74 C18,40 52,14 86,24 C114,6 150,24 150,58 C170,84 160,120 168,170Z" fill="#a8a59b"/><path fill="#7d7a72" d="M70,64 a12,16 0 1 0 1,0Z M112,96 a10,14 0 1 0 1,0Z M64,120 a14,10 0 1 0 1,0Z"/><path d="M40,80 q30,-10 40,10 M100,50 q20,10 30,40" stroke="#6f6c64" stroke-width="2" fill="none"/>`});
A.cottage=v=>({w:260,h:220,body:`<rect x="40" y="110" width="180" height="110" fill="#efe2c8"/><path d="M14,116 Q60,90 78,52 L182,52 Q200,90 246,116Z" fill="#40514f"/>${[...Array(14)].map((_,i)=>`<path d="M${84+i*7.3},54 L${30+i*15.5},114" stroke="#5f716d" stroke-width="1.2"/>`).join('')}<path d="M70,52 H190" stroke="#26302f" stroke-width="5" stroke-linecap="round"/>
 <rect x="112" y="148" width="40" height="72" fill="${C.wood}"/><rect x="58" y="140" width="38" height="34" fill="#3d3a33"/><path d="M58,157 H96 M77,140 V174" stroke="#c8b590" stroke-width="2"/><rect x="170" y="140" width="34" height="34" fill="#3d3a33"/><path d="M170,157 H204 M187,140 V174" stroke="#c8b590" stroke-width="2"/>
 <path d="M206,116 V128" stroke="#3a2e2a" stroke-width="2"/><ellipse cx="206" cy="138" rx="9" ry="11" fill="${C.red}"/><path d="M200,128 h12 M200,148 h12" stroke="${C.gold}" stroke-width="2"/>`});
A.cloud=v=>({w:240,h:110,body:`<path d="M20,96 C4,96 6,70 26,70 C24,46 52,36 70,50 C80,22 122,14 140,40 C156,24 196,30 198,58 C226,56 236,96 210,96Z" fill="#fbf8f2"/><path d="M70,66 a14,14 0 1 1 24,-6 M140,60 a16,16 0 1 1 26,-4 M40,84 h150" stroke="#c9b99a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`});
A.lantern=v=>({w:60,h:150,body:`<path d="M30,150 V40" stroke="#3a2e2a" stroke-width="4"/><path d="M30,40 Q44,20 56,30" stroke="#3a2e2a" stroke-width="3" fill="none"/><ellipse cx="54" cy="52" rx="12" ry="15" fill="${C.red}"/><path d="M46,38 h16 M46,66 h16" stroke="${C.gold}" stroke-width="3"/>`});
const enc=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);
window.BOOKART=(k,v=0)=>{const a=A[k](v);return {w:a.w+20,h:a.h+20,face:enc(wrap(a.w,a.h,a.body,a.defs||'')),ply:enc(wrap(a.w,a.h,a.body,a.defs||'',true))}};
window.BOOKART_KEYS=Object.keys(A);
})();
