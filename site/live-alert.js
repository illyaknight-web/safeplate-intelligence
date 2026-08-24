(()=>{
  const STYLE_ID='safeplate-live-alert-style';
  const CARD_ID='safeplate-live-alert';

  function injectStyle(){
    if(document.getElementById(STYLE_ID)) return;
    const s=document.createElement('style');
    s.id=STYLE_ID;
    s.textContent=`
      #${CARD_ID}{position:absolute;left:22px;top:22px;z-index:6;width:min(410px,calc(100% - 44px));background:rgba(255,255,255,.96);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.65);box-shadow:0 20px 55px rgba(0,0,0,.24);border-radius:18px;padding:16px 17px 15px;color:#0a0d12;animation:safeplateAlertIn .35s ease-out}
      #${CARD_ID}[data-severity="CRITICAL"]{border-left:5px solid #b42318}
      #${CARD_ID}[data-severity="HIGH"]{border-left:5px solid #b54708}
      #${CARD_ID}[data-severity="WATCH"]{border-left:5px solid #175cd3}
      #${CARD_ID} .sp-alert-top{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px}
      #${CARD_ID} .sp-alert-label{display:flex;align-items:center;gap:7px;font-size:10px;letter-spacing:.15em;font-weight:900;text-transform:uppercase;color:#0b6b36}
      #${CARD_ID} .sp-alert-pulse{width:8px;height:8px;border-radius:50%;background:#ef4444;box-shadow:0 0 0 0 rgba(239,68,68,.45);animation:spPulse 1.8s infinite}
      #${CARD_ID} .sp-alert-time{font-size:10px;color:#64748b;font-weight:800}
      #${CARD_ID} h3{font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.08;font-weight:400;margin:4px 0 8px}
      #${CARD_ID} p{font-size:12px;line-height:1.45;color:#475569;margin:0 0 10px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
      #${CARD_ID} .sp-alert-meta{display:flex;flex-wrap:wrap;gap:6px;margin:9px 0 12px}
      #${CARD_ID} .sp-chip{font-size:9px;font-weight:900;border-radius:999px;padding:5px 7px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0}
      #${CARD_ID} .sp-alert-actions{display:flex;gap:8px;align-items:center}
      #${CARD_ID} .sp-view{border:0;border-radius:9px;padding:9px 11px;background:#0b6b36;color:#fff;font-weight:900;font-size:11px}
      #${CARD_ID} .sp-source{font-size:9px;color:#64748b;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px}
      @keyframes spPulse{0%{box-shadow:0 0 0 0 rgba(239,68,68,.45)}70%{box-shadow:0 0 0 8px rgba(239,68,68,0)}100%{box-shadow:0 0 0 0 rgba(239,68,68,0)}}
      @keyframes safeplateAlertIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}
      @media(max-width:980px){#${CARD_ID}{top:16px;left:16px;width:calc(100% - 32px)}}
    `;
    document.head.appendChild(s);
  }

  const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const relative=(mins)=> mins==null?'just detected': mins<2?'just detected':mins<60?`${mins} min ago`:`${Math.max(1,Math.round(mins/60))} hr ago`;

  function render(item){
    const art=document.querySelector('#home .hero-art');
    if(!art) return;
    injectStyle();
    let card=document.getElementById(CARD_ID);
    if(!card){card=document.createElement('div');card.id=CARD_ID;art.appendChild(card);}
    card.dataset.severity=item.severity||'WATCH';
    const label=item.isNew?'NEW LIVE ALERT':'IMPORTANT UPDATE';
    card.innerHTML=`
      <div class="sp-alert-top"><div class="sp-alert-label"><span class="sp-alert-pulse"></span>${label}</div><div class="sp-alert-time">${esc(relative(item.ageMinutes))}</div></div>
      <h3>${esc(item.title||item.product||'Food safety alert')}</h3>
      <p>${esc(item.summary||'SAFEPLATE detected a new food-safety intelligence record.')}</p>
      <div class="sp-alert-meta">
        ${item.severity?`<span class="sp-chip">${esc(item.severity)}</span>`:''}
        ${item.hazard?`<span class="sp-chip">${esc(item.hazard)}</span>`:''}
        ${item.product?`<span class="sp-chip">${esc(item.product)}</span>`:''}
      </div>
      <div class="sp-alert-actions"><button class="sp-view" type="button">View intelligence</button><span class="sp-source">Source: ${esc(item.source||'SAFEPLATE')}</span></div>`;
    card.querySelector('.sp-view')?.addEventListener('click',()=>{
      const btn=document.querySelector('[data-route="recalls"]');
      if(btn) btn.click(); else location.hash='recalls';
    });
  }

  function clear(){document.getElementById(CARD_ID)?.remove();}

  async function refresh(){
    try{
      const r=await fetch('/api/latest-intelligence',{cache:'no-store'});
      if(!r.ok) throw new Error('latest intelligence unavailable');
      const j=await r.json();
      const item=(j.alerts||[])[0];
      if(item) render(item); else clear();
    }catch(e){
      console.warn('SAFEPLATE live alert:',e);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',refresh,{once:true}); else refresh();
  setInterval(refresh,60000);
})();
