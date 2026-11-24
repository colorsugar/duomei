// m12 · wires the category carousels (故语 D / 大陆 A / 云游 E) and the 纸上山河 storybook into the scroll timeline.
(()=>{
const $=id=>document.getElementById(id),cl=(x,a=0,b=1)=>Math.min(b,Math.max(a,x)),seg=(u,a,b)=>cl((u-a)/(b-a));
const F={D:{el:$('ifD'),src:'carousel.html?only=D&emb=1',load:10.6},A:{el:$('ifA'),src:'carousel.html?only=A&emb=1',load:18.6},B:{el:$('ifB'),src:'storybook.html?embed=1&home=1',load:21.6},E:{el:$('ifE'),src:'carousel.html?only=E&emb=1',load:22.6}};
const WORK=[0,2,1];let pend=null,seenE=0;
const go=(k,i)=>{const w=F[k].el.contentWindow;if(w&&w.__go)w.__go(k+'-'+(k==='D'?'故语':k==='A'?'大陆':'云游'),i)};
addEventListener('message',e=>{if(e.data&&e.data.yunyou!=null){pend={k:WORK[e.data.yunyou],t:performance.now()};scrollTo({top:32.3*innerHeight,behavior:'smooth'})}});
window.__afterRender=(u,clk)=>{
 for(const k in F){const f=F[k];if(!f.el.src&&u>f.load-2)f.el.src=f.src}
 F.D.el.classList.toggle('on',u>13.3&&u<17.6);
 F.A.el.classList.toggle('on',u>21.9&&u<23.9);const dh=$('dhead');if(dh)dh.style.opacity=(1-seg(u,21.75,22.05)).toFixed(3);$('dsh').style.opacity=seg(u,21.6,22.2)*(1-seg(u,23.7,24.2));
 F.B.el.classList.toggle('on',u>23.9&&u<31.4);F.E.el.classList.toggle('on',u>31.1&&u<34.9);
 const b=F.B.el.contentWindow;if(b&&b.__setT)b.__setT(seg(u,24.4,30.9));
 if(u>31.2&&!seenE){seenE=1;if(!pend)pend={k:0,t:performance.now()}}
 if(pend){go('E',pend.k);if(performance.now()-pend.t>4000)pend=null}
};
})();
