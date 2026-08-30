(()=>{
'use strict';
if(window.__SAFEPLATE_RECALL_ENTRY_ALERT__)return;
window.__SAFEPLATE_RECALL_ENTRY_ALERT__=true;

const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const strip=v=>String(v??'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const txt=x=>strip([x?.title,x?.product,x?.summary,x?.hazard,x?.category,x?.source,x?.rawSource].filter(Boolean).join(' '));
const when=x=>x?.sourcePostedAt||x?.updatedAt||x?.lastObservedAt||x?.verifiedAt||null;
const t=x=>{const d=new Date(when(x)||0);return Number.isNaN(d.getTime())?0:d.getTime()};
const isFood=x=>/\b(food|recall|public health alert|beef|pork|poultry|chicken|turkey|meat|egg|milk|dairy|cheese|seafood|fish|shrimp|salmon|produce|fruit|vegetable|lettuce|spinach|sprout|berry|blueberr|strawberr|nut|flour|spice|salmonella|listeria|e\.?\s*coli|allergen|contaminat|fsis|fda)\b/i.test(txt(x));
const isOfficial=x=>['fda_openfda','usda_fsis','cfia_recalls','uk_fsa_alerts'].includes(String(x?.rawSource||''))||(/\b(recall|public health alert)\b/i.test(txt(x))&&/VERIFIED|CORROBORATING/i.test(String(x?.status||'')));
const sourceUrl=x=>[x?.url,x?.sourceUrl,x?.source_url,x?.link,x?.webUrl,x?.web_url,...((x?.evidence||[]).map(e=>e?.url))].find(v=>/^https?:\/\//i.test(String(v||'')));
const label=x=>x?.product||x?.title||'Current food recall';

function styles(){
 if(document.getElementById('safeplate-recall-entry-style'))return;
 const s=document.createElement('style');s.id='safeplate-recall-entry-style';s.textContent=`
 #safeplate-recall-entry{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:18px;background:rgba(6,18,12,.58);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)}
 #safeplate-recall-entry .spra-card{width:min(560px,100%);max-height:min(82vh,720px);overflow:auto;background:#fffdf8;color:#142018;border-radius:26px;box-shadow:0 30px 90px rgba(0,0,0,.34);border:1px solid rgba(255,255,255,.7)}
 #safeplate-recall-entry .spra-top{display:flex;gap:14px;align-items:flex-start;padding:22px 22px 12px}
 #safeplate-recall-entry .spra-icon{flex:0 0 42px;width:42px;height:42px;border-radius:14px;background:#b42318;color:white;display:grid;place-items:center;font:900 20px/1 system-ui}
 #safeplate-recall-entry .spra-kicker{font:900 10px/1.2 Inter,system-ui,sans-serif;letter-spacing:.15em;color:#b42318;text-transform:uppercase;margin:2px 0 7px}
 #safeplate-recall-entry h2{font:500 clamp(25px,5vw,36px)/1.03 Georgia,serif;margin:0;color:#142018}
 #safeplate-recall-entry .spra-body{padding:0 22px 22px}
 #safeplate-recall-entry p{font:500 14px/1.55 Inter,system-ui,sans-serif;color:#59645c;margin:10px 0 0}
 #safeplate-recall-entry .spra-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:17px 0}
 #safeplate-recall-entry .spra-meta div{background:#f4f1ea;border-radius:14px;padding:11px}
 #safeplate-recall-entry .spra-meta span{display:block;font:800 9px/1.2 Inter,system-ui,sans-serif;color:#7a827b;text-transform:uppercase;letter-spacing:.08em}
 #safeplate-recall-entry .spra-meta strong{display:block;margin-top:5px;font:800 12px/1.3 Inter,system-ui,sans-serif;color:#253329}
 #safeplate-recall-entry .spra-actions{display:flex;gap:9px;flex-wrap:wrap}
 #safeplate-recall-entry .spra-actions a,#safeplate-recall-entry .spra-actions button{appearance:none;border:0;text-decoration:none;border-radius:999px;padding:11px 15px;font:900 11px/1 Inter,system-ui,sans-serif;cursor:pointer}
 #safeplate-recall-entry .spra-primary{background:#0b6b36;color:#fff}.spra-secondary{background:#edf3ee;color:#0b6b36}.spra-close{margin-left:auto;background:#ece9e2;color:#465049}
 #safeplate-recall-entry .spra-note{font-size:10px;color:#7b837d;margin-top:14px}
 @media(max-width:480px){#safeplate-recall-entry{padding:10px;align-items:end}#safeplate-recall-entry .spra-card{border-radius:24px 24px 18px 18px;max-height:86vh}#safeplate-recall-entry .spra-meta{grid-template-columns:1fr}}
 `;document.head.appendChild(s);
}
function close(){document.getElementById('safeplate-recall-entry')?.remove()}
function show(x){
 styles();
 const src=sourceUrl(x),name=label(x),date=when(x)?new Date(when(x)).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Date not published';
 const hazard=x?.hazard||x?.category||'See verified recall record';
 const company=x?.company||'Recalling firm not published';
 const detail=(x?.summary||'SAFEPLATE detected a current verified food recall. Open the record for the complete evidence and source details.').slice(0,420);
 const journey='/unified-intelligence.html?q='+encodeURIComponent(name);
 const el=document.createElement('div');el.id='safeplate-recall-entry';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label','Current SAFEPLATE recall alert');
 el.innerHTML=`<div class="spra-card"><div class="spra-top"><div class="spra-icon">!</div><div><div class="spra-kicker">Current recall alert</div><h2>${esc(name)}</h2></div></div><div class="spra-body"><p>${esc(detail)}</p><div class="spra-meta"><div><span>Issue / hazard</span><strong>${esc(hazard)}</strong></div><div><span>Recalling firm</span><strong>${esc(company)}</strong></div><div><span>Source date</span><strong>${esc(date)}</strong></div><div><span>Source</span><strong>${esc(x?.source||x?.rawSource||'Verified food-safety source')}</strong></div></div><div class="spra-actions">${src?`<a class="spra-primary" href="${esc(src)}" target="_blank" rel="noopener">Official source</a>`:''}<a class="spra-secondary" href="${journey}">Open Food Journey</a><button class="spra-close" type="button">Continue to SAFEPLATE</button></div><div class="spra-note">Shown once when this SAFEPLATE page loads. It will not repeat on a timer while you are using the page.</div></div></div>`;
 el.querySelector('.spra-close')?.addEventListener('click',close);
 el.addEventListener('click',e=>{if(e.target===el)close()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')close()},{once:true});
 document.body.appendChild(el);
}
async function boot(){
 try{
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),10000);
  const r=await fetch('/api/incidents',{cache:'no-store',signal:c.signal,headers:{accept:'application/json'}});clearTimeout(timer);
  if(!r.ok)return;
  const j=await r.json();
  const rows=(j?.incidents||j?.items||j?.records||[]).filter(isFood).filter(isOfficial).sort((a,b)=>t(b)-t(a));
  if(rows.length)show(rows[0]);
 }catch(_){/* Alert is additive; never block SAFEPLATE if feed is unavailable. */}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
