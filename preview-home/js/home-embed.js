// Category carousels (故语 D / 大陆 A / 云游 E): mounted when their panel nears the viewport, shown and
// animating only while on screen, paused the rest of the time.
(()=>{
const $=id=>document.getElementById(id);
const F=[['ifD','carousel.html?only=D&emb=1'],['ifA','carousel.html?only=A&emb=1'],['ifE','carousel.html?only=E&emb=1']].map(([id,src])=>({el:$(id),src})).filter(f=>f.el);
const mount=f=>{if(!f.el.getAttribute('src'))f.el.src=f.src};
const pause=(f,p)=>{try{if(f.el.contentWindow)f.el.contentWindow.__paused=p}catch(_){}};
const near=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){mount(e.target.__f);near.unobserve(e.target)}}),{rootMargin:'120% 0px'});
const vis=new IntersectionObserver(es=>es.forEach(e=>{const f=e.target.__f;f.on=e.isIntersecting;f.el.classList.toggle('on',f.on);pause(f,!f.on)}),{threshold:.15});
F.forEach(f=>{f.el.__f=f;near.observe(f.el);vis.observe(f.el);f.el.addEventListener('load',()=>pause(f,!f.on))});
// 故语 is the first carousel; warm it once the page is idle
const warm=()=>mount(F[0]);'requestIdleCallback' in window?requestIdleCallback(()=>setTimeout(warm,600),{timeout:1500}):setTimeout(warm,1500);
addEventListener('message',e=>{if(e.data&&e.data.yunyou!=null){const p=document.querySelector('.yy-p2');if(p)window.__smoothTo(Math.round(p.getBoundingClientRect().top+scrollY))}});
})();
