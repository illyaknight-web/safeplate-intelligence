(()=>{
  'use strict';

  const STYLE_ID='safeplate-live-alert-style';
  const CARD_ID='safeplate-live-alert';
  const ROUTES=['home','recalls','search','track','journey','command'];

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${CARD_ID}{position:fixed;right:22px;top:96px;z-index:1000;width:min(390px,calc(100% - 44px));background:rgba(255,255,255,.98);backdrop-filter:blur(14px);border:1px solid rgba(15,23,42,.12);box-shadow:0 24px 60px rgba(0,0,0,.22);border-radius:18px;padding:16px 17px 15px;color:#0a0d12;animation:safeplateAlertIn .35s ease-out}
      #${CARD_ID}[data-severity="CRITICAL"]{border-left:5px solid #b42318}
      #${CARD_ID}[data-severity="HIGH"]{border-left:5px solid #b54708}
      #${CARD_ID}[data-severity="WATCH"]{border-left:5px solid #175cd3}
      #${CARD_ID} .sp-alert-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      #${CARD_ID} .sp-alert-label{display:flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.15em;font-weight:900;text-transform:uppercase;color:#0b6b36}
      #${CARD_ID} .sp-alert-pulse{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.45);animation:spPulse 1.8s infinite}
      #${CARD_ID} .sp-alert-time{font-size:10px;color:#64748b;font-weight:800}
      #${CARD_ID} h3{font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.08;font-weight:400;margin:4px 0 8px}
      #${CARD_ID} p{font-size:12px;line-height:1.45;color:#475569;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      #${CARD_ID} .sp-alert-meta{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 12px}
      #${CARD_ID} .sp-chip{font-size:9px;font-weight:900;border-radius:999px;padding:5px 7px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}
      #${CARD_ID} .sp-alert-actions{display:flex;gap:8px;align-items:center}
      #${CARD_ID} .sp-view{border:0;border-radius:9px;padding:9px 11px;background:#0b6b36;color:#fff;font-weight:900;font-size:11px;cursor:pointer}
      #${CARD_ID} .sp-source{font-size:9px;color:#64748b;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}
      #${CARD_ID} .sp-close{border:0;background:transparent;color:#64748b;font-size:16px;line-height:1;cursor:pointer;padding:2px 4px}
      .sp-runtime-good{color:#0b6b36!important;border-color:#b9dcc3!important;background:#f4fbf6!important}
      .sp-runtime-bad{color:#9b2c21!important;border-color:#efc4bf!important;background:#fff8f7!important}
      @keyframes spPulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
      @keyframes safeplateAlertIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      @media(max-width:980px){#${CARD_ID}{right:16px;top:88px;width:calc(100% - 32px)}}
    `;
    document.head.appendChild(s);
  }

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const relative=(mins)=> mins==null?'just detected': mins<2?'just detected':mins<60?`${mins} min ago`:`${Math.max(1,Math.round(mins/60))} hr ago`;

  function setRoute(route,{pushHash=true}={}){
    if(!ROUTES.includes(route)) route='home';
    document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===route));
    document.querySelectorAll('[data-route]').forEach(btn=>btn.classList.toggle('on',btn.dataset.route===route));
    if(pushHash && location.hash!==`#${route}`){
      try{ history.replaceState(null,'',`#${route}`); }catch(_){ location.hash=route; }
    }
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function wireControls(){
    document.addEventListener('click',e=>{
      const routeBtn=e.target.closest('[data-route]');
      if(routeBtn){
        e.preventDefault();
        e.stopPropagation();
        setRoute(routeBtn.dataset.route||'home');
        return;
      }

      const filterBtn=e.target.closest('[data-filter]');
      if(filterBtn){
        filterBtn.parentElement?.querySelectorAll('[data-filter]').forEach(b=>b.classList.remove('on'));
        filterBtn.classList.add('on');
        const input=document.getElementById('recall-search');
        if(input) input.dispatchEvent(new Event('input',{bubbles:true}));
        return;
      }

      const cmdBtn=e.target.closest('.cmd-tabs button');
      if(cmdBtn){
        cmdBtn.parentElement?.querySelectorAll('button').forEach(b=>b.classList.remove('on'));
        cmdBtn.classList.add('on');
      }

      const closeBtn=e.target.closest('.close');
      if(closeBtn){
        closeBtn.closest('.detail-modal')?.classList.remove('open');
      }
    },true);

    window.addEventListener('hashchange',()=>setRoute((location.hash||'#home').slice(1),{pushHash:false}));
    setRoute((location.hash||'#home').slice(1),{pushHash:false});
  }

  function setText(id,text){ const el=document.getElementById(id); if(el) el.textContent=text; }
  function markPill(id,ok){ const el=document.getElementById(id); if(!el) return; el.classList.remove('sp-runtime-good','sp-runtime-bad','bad','warn'); el.classList.add(ok?'sp-runtime-good':'sp-runtime-bad'); }

  async function probeRuntime(){
    let incidentsOk=false, sourceOk=false, stateOk=false;
    let incidentData=null, sourceData=null, stateData=null;
    try{
      const [a,b,c]=await Promise.allSettled([
        fetch('/api/incidents',{cache:'no-store'}).then(r=>{if(!r.ok) throw new Error(`incidents ${r.status}`); return r.json();}),
        fetch('/api/source-health',{cache:'no-store'}).then(r=>{if(!r.ok) throw new Error(`source-health ${r.status}`); return r.json();}),
        fetch('/api/state-coverage',{cache:'no-store'}).then(r=>{if(!r.ok) throw new Error(`state-coverage ${r.status}`); return r.json();})
      ]);
      if(a.status==='fulfilled'){incidentsOk=true;incidentData=a.value;}
      if(b.status==='fulfilled'){sourceOk=true;sourceData=b.value;}
      if(c.status==='fulfilled'){stateOk=true;stateData=c.value;}
    }catch(_){ }

    const overall=incidentsOk && sourceOk;
    const feedText=document.getElementById('feed-text');
    const feedDot=document.getElementById('feed-dot');
    if(feedText) feedText.textContent=overall?'Feeds · live':'Feeds · degraded';
    if(feedDot){feedDot.classList.toggle('live',overall);feedDot.classList.toggle('bad',!overall);}
    markPill('feed-pill',overall);

    if(stateOk){
      const n=Number(stateData?.coveredStates ?? stateData?.coverage?.covered ?? stateData?.statesCovered ?? 0);
      setText('state-pill',`States · live ${Number.isFinite(n)&&n>0?n:'51'}/51`);
      markPill('state-pill',true);
    }else{
      setText('state-pill','States · degraded');
      markPill('state-pill',false);
    }

    const incidents=Array.isArray(incidentData)?incidentData:(incidentData?.incidents||incidentData?.items||incidentData?.records||[]);
    if(Array.isArray(incidents)){
      setText('home-incidents',String(incidents.length));
      const high=incidents.filter(x=>['CRITICAL','HIGH'].includes(String(x?.severity||'').toUpperCase())).length;
      setText('home-high',String(high));
    }
    if(sourceData){
      const sources=Array.isArray(sourceData)?sourceData:(sourceData?.sources||sourceData?.items||[]);
      if(Array.isArray(sources)) setText('home-sources',String(sources.filter(x=>String(x?.status||x?.state||'').toLowerCase()!=='offline').length));
    }
    if(stateOk) setText('home-states','51');

    try{
      const h=await fetch('/api/surveillance-history',{cache:'no-store'}).then(r=>r.ok?r.json():null);
      const last=h?.latest?.timestamp || h?.latest?.at || h?.lastRun || h?.lastSync || h?.history?.at(-1)?.timestamp || null;
      if(last){
        const mins=Math.max(0,Math.round((Date.now()-new Date(last).getTime())/60000));
        setText('home-sync',mins<2?'now':`${mins}m ago`);
      }
    }catch(_){ }

    const footer=[...document.querySelectorAll('footer *')].find(el=>/^Backend:\s*checking/i.test(el.textContent||''));
    if(footer) footer.textContent=overall?'Backend: live':'Backend: degraded';

    return overall;
  }

  function render(item){
    injectStyle();
    let card=document.getElementById(CARD_ID);
    if(!card){card=document.createElement('div');card.id=CARD_ID;document.body.appendChild(card);}
    card.dataset.severity=item.severity||'WATCH';
    const label=item.isNew?'NEW LIVE ALERT':'IMPORTANT UPDATE';
    card.innerHTML=`
      <div class="sp-alert-top"><div class="sp-alert-label"><span class="sp-alert-pulse"></span>${label}</div><div style="display:flex;align-items:center;gap:8px"><div class="sp-alert-time">${esc(relative(item.ageMinutes))}</div><button class="sp-close" aria-label="Dismiss alert">×</button></div></div>
      <h3>${esc(item.title||item.product||'Food safety alert')}</h3>
      <p>${esc(item.summary||'SAFEPLATE detected a new food-safety intelligence record.')}</p>
      <div class="sp-alert-meta">
        ${item.severity?`<span class="sp-chip">${esc(item.severity)}</span>`:''}
        ${item.hazard?`<span class="sp-chip">${esc(item.hazard)}</span>`:''}
        ${item.product?`<span class="sp-chip">${esc(item.product)}</span>`:''}
      </div>
      <div class="sp-alert-actions"><button class="sp-view" type="button">View intelligence</button><span class="sp-source">Source: ${esc(item.source||'SAFEPLATE')}</span></div>`;
    card.querySelector('.sp-close')?.addEventListener('click',()=>card.remove());
    card.querySelector('.sp-view')?.addEventListener('click',()=>{card.remove();setRoute('recalls');});
  }

  function clear(){document.getElementById(CARD_ID)?.remove();}

  async function refreshAlert(){
    try{
      const r=await fetch('/api/latest-intelligence',{cache:'no-store'});
      if(!r.ok) throw new Error('latest intelligence unavailable');
      const j=await r.json();
      const item=(j.alerts||[])[0];
      if(item) setTimeout(()=>render(item),700); else clear();
    }catch(e){
      console.warn('SAFEPLATE live alert:',e);
    }
  }

  function boot(){
    wireControls();
    probeRuntime();
    refreshAlert();
    setInterval(probeRuntime,60000);
    setInterval(refreshAlert,60000);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();
