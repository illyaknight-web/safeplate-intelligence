(()=>{
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const ROUTES=['home','recalls','search','track','command'];
const data={incidents:[],sources:[],status:null,coverage:null,filter:'official'};

const strip=(v='')=>String(v).replace(/<[^>]*>/g,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&#039;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const esc=(v='')=>strip(v).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'}[m]));
const dt=x=>{const d=new Date(x||0);return Number.isNaN(d.getTime())?0:d.getTime()};
const when=x=>x?.sourcePostedAt||x?.updatedAt||x?.lastObservedAt||x?.verifiedAt||null;
const ago=x=>{if(!x)return'never';const m=Math.max(0,Math.floor((Date.now()-dt(x))/60000));return m<1?'just now':m<60?m+'m ago':m<1440?Math.floor(m/60)+'h ago':Math.floor(m/1440)+'d ago'};
const sorted=rows=>[...rows].sort((a,b)=>dt(when(b))-dt(when(a)));
const text=x=>strip([x?.title,x?.product,x?.summary,x?.category,x?.hazard,x?.company,x?.distribution,x?.source,x?.rawSource,...(x?.states||[])].filter(Boolean).join(' ')).toLowerCase();
const match=(q,x)=>text(x).includes(String(q||'').trim().toLowerCase());

const OFFICIAL_FOOD_SOURCES=new Set(['fda_openfda','usda_fsis','fda_outbreaks','fda_food_events','cfia_recalls','uk_fsa_alerts']);
const BLOCKED_NONFOOD=/\b(breast cancer|cancer control|advisory board|interpreters? for the deaf|hearing screening|behavioral health|mental health|public meeting|committee meeting|board meeting|report a disease or outbreak|outbreak reporting|immunization|medicaid|dental|opioid|tobacco|maternal health)\b/i;
const FOOD_CONTEXT=/\b(food|foods|foodborne|recall|public health alert|beef|pork|poultry|chicken|turkey|meat|egg|milk|dairy|cheese|seafood|fish|shrimp|salmon|produce|fruit|vegetable|lettuce|spinach|sprout|berry|blueberr|strawberr|nut|pecan|almond|flour|spice|cinnamon|salmonella|listeria|e\.?\s*coli|cyclospora|allergen|undeclared|contaminat|foreign material|fsis|fda food)\b/i;
function isFoodRecord(x){
  if(OFFICIAL_FOOD_SOURCES.has(String(x?.rawSource||'')))return true;
  const t=text(x);
  if(BLOCKED_NONFOOD.test(t))return false;
  return FOOD_CONTEXT.test(t);
}
const isSpanish=x=>{const t=text(x);return [/\bretira\b/,/\bproductos\b/,/\bdebido\b/,/\bcontaminaci[oó]n\b/,/\bsin el beneficio\b/,/\bservicio de inocuidad\b/,/\baproximadamente\b/,/\bpodr[ií]an\b/].filter(r=>r.test(t)).length>=2};
const isOfficialRecall=x=>['fda_openfda','usda_fsis','cfia_recalls','uk_fsa_alerts'].includes(x.rawSource)||(/\b(recall|public health alert)\b/i.test(text(x))&&/VERIFIED|CORROBORATING/i.test(x.status||''));
const isInvestigation=x=>/\b(outbreak|adverse event|signal|investigation|possible recall|potential recall)\b/i.test(text(x));

async function getJSON(url){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),20000);
  try{const r=await fetch(url,{cache:'no-store',signal:c.signal,headers:{accept:'application/json'}});if(!r.ok)throw new Error(url+' → HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}
}
function closeTransient(){
  $('#modal')?.classList.remove('open');
  document.getElementById('safeplate-live-alert')?.remove();
}
function setRoute(id,{hash=true}={}){
  if(id==='journey'){location.href='/unified-intelligence.html';return}
  if(!ROUTES.includes(id))id='home';
  closeTransient();
  $$('.screen').forEach(x=>x.classList.toggle('active',x.id===id));
  $$('[data-route]').forEach(x=>x.classList.toggle('on',x.dataset.route===id));
  if(hash&&location.hash!==`#${id}`){try{history.replaceState(null,'',`#${id}`)}catch(_){location.hash=id}}
  window.scrollTo({top:0,behavior:'auto'});
}
function sevClass(s=''){s=String(s).toLowerCase();return s==='critical'?'critical':s==='high'?'high':'watch'}
function ss(){return data.status?.stateSurveillance||{}}
function stateText(){const s=ss();return `${s.jurisdictionsChecked??data.coverage?.checked??0}/${s.jurisdictionsTotal??data.coverage?.total??51}`}

function recordCard(x){
  const tags=[x.category,x.hazard,...(x.states||[])].filter(Boolean).slice(0,6);
  return `<article class="recall"><div class="eyebrow ${sevClass(x.severity)}">${esc(x.severity||'WATCH')} · ${esc(x.status||'DETECTED')} · ${esc(x.source||'Source')}</div><h3>${esc(x.title||x.product||'Food safety record')}</h3><p>${esc(x.summary||'Source-backed SAFEPLATE food-safety record.')}</p><div class="tags">${tags.map(v=>`<span class="tag">${esc(v)}</span>`).join('')}</div><div class="facts"><div class="fact"><span>Company</span><strong>${esc(x.company||'Not published')}</strong></div><div class="fact"><span>Source date</span><strong>${esc(when(x)?new Date(when(x)).toLocaleDateString('en-US'):'Unknown')}</strong></div><div class="fact"><span>Observed</span><strong>${esc(ago(x.lastObservedAt||x.updatedAt))}</strong></div></div><button class="details" data-open="${esc(x.id)}">View evidence</button></article>`;
}
function bindDetails(){$$('[data-open]').forEach(b=>b.onclick=()=>openDetail(b.dataset.open))}
function openDetail(id){
  const x=data.incidents.find(r=>String(r.id)===String(id));if(!x)return;
  const ev=x.evidence||[],ents=x.entities||[];
  const body=$('#modal-body');
  if(body)body.innerHTML=`<div class="kicker">SAFEPLATE RECORD</div><h2>${esc(x.title||x.product)}</h2><p>${esc(x.summary||'')}</p><div class="facts"><div class="fact"><span>Status</span><strong>${esc(x.status||'')}</strong></div><div class="fact"><span>Severity</span><strong>${esc(x.severity||'')}</strong></div><div class="fact"><span>Source</span><strong>${esc(x.source||'')}</strong></div></div><div class="modal-actions"><a class="details modal-journey" href="/unified-intelligence.html?q=${encodeURIComponent(x.product||x.title||'')}">Open Food Journey</a></div><h3>Evidence</h3>${ev.length?ev.map(e=>`<div class="row"><strong>${esc(e.source||e.type||'Evidence')}</strong><span>${esc(e.text||e.summary||'')}</span>${e.url?`<span><a href="${esc(e.url)}" target="_blank" rel="noopener">Open official source ↗</a></span>`:''}</div>`).join(''):'<p>No evidence objects published for this record.</p>'}<h3>Connected entities</h3>${ents.length?ents.map(e=>`<div class="row"><strong>${esc(e.name||'Entity')}</strong><span>${esc(e.type||'')}</span></div>`).join(''):'<p>No connected entities published yet.</p>'}`;
  $('#modal')?.classList.add('open');
}

function renderHome(){
  const rows=sorted(data.incidents),st=data.status||{};
  if($('#home-incidents'))$('#home-incidents').textContent=rows.length;
  if($('#home-high'))$('#home-high').textContent=rows.filter(x=>['CRITICAL','HIGH'].includes(String(x.severity||'').toUpperCase())).length;
  if($('#home-sources'))$('#home-sources').textContent=st.sourcesOnline??data.sources.filter(x=>x.status==='ONLINE').length;
  if($('#home-states'))$('#home-states').textContent=stateText();
  if($('#home-sync'))$('#home-sync').textContent=st.lastSync?ago(st.lastSync):'Never';
  if($('#home-feed'))$('#home-feed').innerHTML=rows.length?rows.slice(0,6).map(recordCard).join(''):'<div class="empty">No current food-safety records are available.</div>';
  bindDetails();
}
function recallRows(){
  const q=$('#recall-search')?.value||'';let rows=data.incidents;
  if(data.filter==='official')rows=rows.filter(isOfficialRecall);else if(data.filter==='investigations')rows=rows.filter(isInvestigation);
  if(q)rows=rows.filter(x=>match(q,x));return sorted(rows);
}
function renderRecalls(){
  const rows=recallRows(),names={official:'Latest official recalls',investigations:'Food investigations & emerging signals',all:'All food-safety records'};
  if($('#recall-heading'))$('#recall-heading').textContent=names[data.filter];
  if($('#recall-count'))$('#recall-count').textContent=`${rows.length} record${rows.length===1?'':'s'}`;
  if($('#recall-status'))$('#recall-status').textContent=data.status?.live?`LIVE · updated ${ago(data.status.lastSync)}`:data.status?.stale?`STALE · ${ago(data.status.lastSync)}`:'NOT CURRENT';
  if($('#recall-featured'))$('#recall-featured').innerHTML='';
  if($('#recall-list'))$('#recall-list').innerHTML=rows.length?rows.slice(0,100).map(recordCard).join(''):'<div class="empty"><strong>No food records match this view.</strong><br>Try another filter or search term.</div>';
  bindDetails();
}
function renderSearch(){
  const q=$('#global-search')?.value.trim()||'',rows=q?sorted(data.incidents.filter(x=>match(q,x))):[];
  if($('#search-results'))$('#search-results').innerHTML=!q?'<div class="empty ux-empty"><strong>Search across SAFEPLATE food-safety evidence.</strong><br>Try a product, company, pathogen, lot or state — for example “chicken”, “Listeria” or “California”.</div>':rows.length?rows.slice(0,100).map(recordCard).join(''):'<div class="empty ux-empty"><strong>No food-safety record matched.</strong><br>Try a broader product, company, pathogen or state.</div>';
  bindDetails();
}
function trackText(x){return strip([x.product,x.title,x.company,...(x.lots||[]),x.upc,x.ingredient,x.ingredients].flat().filter(Boolean).join(' ')).toLowerCase()}
function renderTrack(){
  const q=$('#track-input')?.value.trim().toLowerCase()||'',rows=q?sorted(data.incidents.filter(x=>trackText(x).includes(q))):[];
  if($('#track-output'))$('#track-output').innerHTML=!q?'<div class="empty ux-empty"><strong>Track Product is for a specific food.</strong><br>Enter a product, brand/company, lot, UPC or ingredient. Use Search for broader food-safety research.</div>':rows.length?`<div class="section-title"><h2>${rows.length} product-linked match${rows.length===1?'':'es'}</h2></div><div class="recall-grid">${rows.slice(0,30).map(recordCard).join('')}</div>`:'<div class="empty ux-empty"><strong>No product-linked record matched.</strong><br>Check the spelling or use Search for a broader lookup.</div>';
  bindDetails();
}
function renderCommand(){
  const rows=sorted(data.incidents),official=rows.filter(isOfficialRecall),high=rows.filter(x=>['CRITICAL','HIGH'].includes(String(x.severity||'').toUpperCase())),st=data.status||{},s=ss();
  const set=(id,v)=>{if($(id))$(id).textContent=v};
  set('#kpi-records',rows.length);set('#kpi-recalls',official.length);set('#kpi-high',high.length);set('#kpi-online',st.sourcesOnline??data.sources.filter(x=>x.status==='ONLINE').length);set('#kpi-states',stateText());set('#kpi-sync',st.lastSync?ago(st.lastSync):'Never');
  if($('#priority-list'))$('#priority-list').innerHTML=rows.length?rows.slice(0,12).map(x=>`<div class="row"><strong>${esc(x.title||x.product)}</strong><span>${esc(x.severity||'WATCH')} · ${esc(x.source||'')} · ${esc(ago(x.lastObservedAt||x.updatedAt))}</span></div>`).join(''):'<div class="empty">No food incident data loaded.</div>';
  if($('#system-health'))$('#system-health').innerHTML=`<div class="coverage"><strong>U.S. jurisdiction scan: ${esc(stateText())}</strong><span>${s.live?'Current coverage window complete.':st.stateScanDispatched?'Background scan dispatched.':'Coverage is incomplete.'}</span></div><div class="row"><strong>Surveillance: ${st.live?'LIVE':'NOT CURRENT'}</strong><span>Last sync: ${esc(st.lastSync?ago(st.lastSync):'never')} · 30-minute cycle</span></div>`;
  if($('#incident-list'))$('#incident-list').innerHTML=rows.length?rows.map(x=>`<div class="row"><strong>${esc(x.title||x.product)}</strong><span>${esc(x.status||'')} · ${esc(x.source||'')}</span></div>`).join(''):'<div class="empty">No food incidents loaded.</div>';
  const evidence=rows.flatMap(x=>(x.evidence||[]).map(e=>({...e,_incident:x.title||x.product}))).slice(0,200);
  if($('#evidence-list'))$('#evidence-list').innerHTML=evidence.length?evidence.map(e=>`<div class="row"><strong>${esc(e.source||e.type||'Evidence')}</strong><span>${esc(e._incident)} — ${esc(e.text||e.summary||'')}</span></div>`).join(''):'<div class="empty">No evidence loaded.</div>';
  const feeds=data.sources.filter(x=>!String(x.id||'').startsWith('state_')&&x.lastChecked&&x.status!=='PENDING');
  if($('#source-list'))$('#source-list').innerHTML=`<div class="coverage"><strong>State/DC coverage ${esc(stateText())}</strong><span>${esc(s.jurisdictionsOnline??data.coverage?.online??0)} online · ${esc(s.jurisdictionIssues??data.coverage?.degraded??0)} issues</span></div>`+(feeds.length?feeds.map(x=>`<div class="source"><strong>${esc(x.name||x.id)}</strong><span>${esc(x.status||'')}</span><span>${esc(ago(x.lastChecked))}</span></div>`).join(''):'<div class="empty">No executed source-health records loaded.</div>');
}
function setStatus(){
  const st=data.status||{},s=ss(),live=!!st.live;
  if($('#feed-dot'))$('#feed-dot').className='dot '+(live?'live':'bad');
  if($('#cmd-dot'))$('#cmd-dot').className='dot '+(live?'live':'bad');
  const ft=live?`Feeds · ${st.sourcesOnline??data.sources.filter(x=>x.status==='ONLINE').length} online${st.sourceIssues?` · ${st.sourceIssues} issue${st.sourceIssues===1?'':'s'}`:''}`:(st.stale?'Feeds · stale':'Feeds · not current');
  if($('#feed-text'))$('#feed-text').textContent=ft;if($('#cmd-live-text'))$('#cmd-live-text').textContent=ft;
  if($('#footer-status'))$('#footer-status').textContent=`System: ${live?'LIVE':'DEGRADED'} · States ${stateText()}`;
  if($('#state-pill')){$('#state-pill').textContent=s.live?`States · ${stateText()} LIVE`:st.stateScanDispatched?`States · scanning ${stateText()}`:`States · ${stateText()}`;$('#state-pill').className='status-pill state-pill '+(s.live?'':(s.jurisdictionsChecked??0)>0?'warn':'bad')}
}

function wire(){
  document.addEventListener('click',e=>{
    const r=e.target.closest('[data-route]');if(r){e.preventDefault();e.stopPropagation();setRoute(r.dataset.route);return}
    const f=e.target.closest('[data-filter]');if(f){data.filter=f.dataset.filter;$$('[data-filter]').forEach(x=>x.classList.toggle('on',x===f));renderRecalls();return}
    const c=e.target.closest('[data-cmd]');if(c){$$('[data-cmd]').forEach(x=>x.classList.toggle('on',x===c));$$('.cmd-view').forEach(v=>v.classList.add('hidden'));$('#cmd-'+c.dataset.cmd)?.classList.remove('hidden');return}
    if(e.target.closest('#global-search-btn')){renderSearch();return}
    if(e.target.closest('#track-btn')){renderTrack();return}
    if(e.target.closest('#modal-close')||e.target.classList.contains('close')){$('#modal')?.classList.remove('open')}
  },true);
  $('#recall-search')?.addEventListener('input',renderRecalls);
  $('#global-search')?.addEventListener('keydown',e=>{if(e.key==='Enter')renderSearch()});
  $('#track-input')?.addEventListener('keydown',e=>{if(e.key==='Enter')renderTrack()});
  $('#modal')?.addEventListener('click',e=>{if(e.target.id==='modal')$('#modal').classList.remove('open')});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTransient()});
  window.addEventListener('hashchange',()=>{const id=(location.hash||'#home').slice(1);if(id==='journey')location.replace('/unified-intelligence.html');else setRoute(id,{hash:false})});
}
async function load(){
  const results=await Promise.allSettled([
    getJSON('/api/incidents'),
    getJSON('/api/source-health'),
    getJSON('/api/system-status'),
    getJSON('/api/state-coverage')
  ]);
  const [incR,healthR,statusR,coverageR]=results;
  if(incR.status==='fulfilled'){
    const inc=incR.value||{};
    data.incidents=(inc.incidents||inc.items||inc.records||[]).filter(isFoodRecord).filter(x=>!isSpanish(x));
  }
  if(healthR.status==='fulfilled'){
    const health=healthR.value||{};
    data.sources=health.sources||health.items||[];
  }
  if(statusR.status==='fulfilled') data.status=statusR.value||{};
  else data.status={...(data.status||{}),live:false,stale:true,stateSurveillance:(data.status||{}).stateSurveillance||{jurisdictionsChecked:data.coverage?.checked??0,jurisdictionsTotal:data.coverage?.total??51}};
  if(coverageR.status==='fulfilled') data.coverage=coverageR.value||null;
  const failures=results.map((r,i)=>r.status==='rejected'?['incidents','source-health','system-status','state-coverage'][i]:null).filter(Boolean);
  if(failures.length) console.warn('SAFEPLATE partial data degradation:',failures.join(', '));
  if(incR.status==='rejected'&&!data.incidents.length) console.error('SAFEPLATE incident feed unavailable',incR.reason);
  setStatus();renderHome();renderRecalls();renderSearch();renderTrack();renderCommand();
}
function boot(){wire();const id=(location.hash||'#home').slice(1);if(id==='journey')location.replace('/unified-intelligence.html');else setRoute(id,{hash:false});load();setInterval(load,30000)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();