(()=>{
'use strict';
const SPRITE='/assets/safeplate-approved-sprite.jpg?v=20260830-approved';
const CELLS=[
 {x:0,y:0},{x:33.3333,y:0},{x:66.6667,y:0},{x:100,y:0},
 {x:0,y:100},{x:33.3333,y:100},{x:66.6667,y:100},{x:100,y:100}
];
const fixLinks=()=>{
 document.querySelectorAll('a').forEach(a=>{
  const t=(a.textContent||'').trim();
  if(t==='Public View') a.href='/';
  if(t==='Advanced View') a.href='/unified-intelligence.html';
 });
};
function cellStyle(el,index){
 const c=CELLS[index]||CELLS[0];
 el.style.backgroundImage=`url(${SPRITE})`;
 el.style.backgroundSize='400% 200%';
 el.style.backgroundPosition=`${c.x}% ${c.y}%`;
 el.style.backgroundRepeat='no-repeat';
 el.style.backgroundColor='#e9eee8';
}
function fixPublicCards(){
 if(location.pathname!=='/'&&location.pathname!=='/public-view-v1.html')return;
 const cards=[...document.querySelectorAll('.quick .choice .pic')];
 cards.forEach((pic,i)=>{
   cellStyle(pic,i+1);
   const img=pic.querySelector('img'); if(img) img.style.opacity='0';
 });
 const heroPhoto=document.querySelector('.hero-photo');
 const heroImg=document.getElementById('heroImage');
 if(!heroPhoto||heroPhoto.dataset.approvedSprite==='1')return;
 heroPhoto.dataset.approvedSprite='1';
 if(heroImg)heroImg.style.opacity='0';
 let idx=Number(sessionStorage.getItem('safeplateApprovedHero')||'-1');
 const paint=()=>{idx=(idx+1)%7;cellStyle(heroPhoto,idx);sessionStorage.setItem('safeplateApprovedHero',String(idx));};
 paint();
 if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)setInterval(paint,6000);
}
function enhanceAdvanced(){
 if(location.pathname!=='/unified-intelligence.html'||document.getElementById('safeplate-advanced-visual'))return;
 const host=document.querySelector('main')||document.body;
 const section=document.createElement('section'); section.id='safeplate-advanced-visual';
 section.innerHTML=`<div class="spav-wrap"><div class="spav-copy"><span>ADVANCED INTELLIGENCE</span><h2>Scan the product. See the evidence. Trace the journey.</h2><p>SAFEPLATE Advanced brings verified recalls, source provenance, product evidence, distribution, and Food Journey tracing into one intelligence workspace.</p><a href="#recalls">Open Recall Center</a><a class="secondary" href="#journey">Open Food Journey</a></div><div class="spav-image" role="img" aria-label="SAFEPLATE product scan and food safety intelligence interface"></div></div>`;
 const css=document.createElement('style'); css.textContent=`#safeplate-advanced-visual{padding:22px 24px 6px;background:#07110d;color:#eef7f1}.spav-wrap{max-width:1400px;margin:auto;display:grid;grid-template-columns:.75fr 1.25fr;gap:24px;align-items:center;border:1px solid #20362a;border-radius:22px;padding:22px;background:linear-gradient(135deg,#0d1b14,#08110d);overflow:hidden}.spav-copy span{font-size:10px;letter-spacing:.16em;font-weight:900;color:#55db88}.spav-copy h2{font:400 clamp(30px,4vw,52px)/1.02 Georgia,serif;margin:10px 0 14px}.spav-copy p{color:#a9beb2;line-height:1.55;max-width:600px}.spav-copy a{display:inline-block;margin:8px 8px 0 0;padding:11px 14px;border-radius:999px;background:#55db88;color:#04160b;text-decoration:none;font-weight:900;font-size:11px}.spav-copy a.secondary{background:#13231a;color:#dce9e1;border:1px solid #294234}.spav-image{width:100%;aspect-ratio:3/2;border-radius:16px;background-size:400% 200%;background-repeat:no-repeat;background-position:100% 100%;box-shadow:0 16px 48px rgba(0,0,0,.28)}@media(max-width:760px){#safeplate-advanced-visual{padding:14px 10px 4px}.spav-wrap{grid-template-columns:1fr;padding:14px}.spav-copy{order:2}.spav-image{order:1}}`;
 document.head.appendChild(css); host.prepend(section); cellStyle(section.querySelector('.spav-image'),7);
}
const run=()=>{fixLinks();fixPublicCards();enhanceAdvanced()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(()=>{fixLinks();fixPublicCards()}).observe(document.documentElement,{subtree:true,childList:true});
})();
