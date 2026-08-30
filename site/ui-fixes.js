(()=>{
'use strict';
const map={
'/assets/public-hero-1.webp':'/assets/public-hero-1-confirmed.jpg',
'/assets/public-hero-2.webp':'/assets/public-hero-2-confirmed.jpg',
'/assets/public-hero-3.webp':'/assets/public-hero-3-confirmed.jpg',
'/assets/public-hero-4.webp':'/assets/public-hero-4-confirmed.jpg',
'/assets/public-hero-5.webp':'/assets/public-hero-5-confirmed.jpg'
};
const fixLinks=()=>{
 document.querySelectorAll('a').forEach(a=>{
  const t=(a.textContent||'').trim();
  if(t==='Public View') a.href='/';
  if(t==='Advanced View') a.href='/unified-intelligence.html';
 });
};
const fixImages=()=>{
 document.querySelectorAll('img').forEach(img=>{
  try{const u=new URL(img.src,location.origin); const p=u.pathname; if(map[p]&&u.pathname!==map[p]) img.src=map[p]+'?v=20260830-clean';}catch(_){ }
 });
};
function enhanceAdvanced(){
 if(location.pathname!=='/unified-intelligence.html'||document.getElementById('safeplate-advanced-visual'))return;
 const host=document.querySelector('main')||document.body;
 const section=document.createElement('section');
 section.id='safeplate-advanced-visual';
 section.innerHTML=`<div class="spav-wrap"><div class="spav-copy"><span>ADVANCED INTELLIGENCE</span><h2>See the product, evidence, and journey together.</h2><p>SAFEPLATE Advanced connects verified recall records, source provenance, distribution evidence, and Food Journey tracing in one workspace.</p><a href="#recalls">Open Recall Center</a><a class="secondary" href="#journey">Open Food Journey</a></div><img src="/assets/safeplate-advanced-scan.jpg?v=20260830" alt="SAFEPLATE advanced product scan and food safety intelligence interface"></div>`;
 const css=document.createElement('style');css.textContent=`#safeplate-advanced-visual{padding:22px 24px 6px;background:#07110d;color:#eef7f1}.spav-wrap{max-width:1400px;margin:auto;display:grid;grid-template-columns:.75fr 1.25fr;gap:24px;align-items:center;border:1px solid #20362a;border-radius:22px;padding:22px;background:linear-gradient(135deg,#0d1b14,#08110d);overflow:hidden}.spav-copy span{font-size:10px;letter-spacing:.16em;font-weight:900;color:#55db88}.spav-copy h2{font:400 clamp(30px,4vw,52px)/1.02 Georgia,serif;margin:10px 0 14px}.spav-copy p{color:#a9beb2;line-height:1.55;max-width:600px}.spav-copy a{display:inline-block;margin:8px 8px 0 0;padding:11px 14px;border-radius:999px;background:#55db88;color:#04160b;text-decoration:none;font-weight:900;font-size:11px}.spav-copy a.secondary{background:#13231a;color:#dce9e1;border:1px solid #294234}.spav-wrap img{width:100%;display:block;border-radius:16px;max-height:560px;object-fit:cover}@media(max-width:760px){#safeplate-advanced-visual{padding:14px 10px 4px}.spav-wrap{grid-template-columns:1fr;padding:14px}.spav-copy{order:2}.spav-wrap img{order:1;max-height:none}}`;
 document.head.appendChild(css);
 host.prepend(section);
}
const run=()=>{fixLinks();fixImages();enhanceAdvanced()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
new MutationObserver(()=>{fixLinks();fixImages()}).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['src','href']});
})();
