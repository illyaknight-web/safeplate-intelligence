(()=>{
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function render(){
    try{
      const r=await fetch('/api/source-audit',{cache:'no-store'}); if(!r.ok) return;
      const d=await r.json();
      const existing=document.getElementById('safeplate-source-status'); if(existing) existing.remove();
      const el=document.createElement('section'); el.id='safeplate-source-status';
      el.innerHTML=`<style>
      #safeplate-source-status{margin:18px auto;max-width:1180px;padding:0 14px;font-family:Inter,system-ui,sans-serif;color:#18221c}
      #safeplate-source-status .spbox{background:#f7f8f5;border:1px solid #dfe5df;border-radius:18px;padding:18px;box-shadow:0 12px 34px rgba(19,42,28,.08)}
      #safeplate-source-status h2{margin:0 0 5px;font-size:18px}#safeplate-source-status .sub{font-size:11px;color:#68726c;margin-bottom:14px}
      #safeplate-source-status .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:9px}.metric{background:white;border:1px solid #e3e7e3;border-radius:13px;padding:12px}.metric b{display:block;font-size:16px}.metric span{font-size:10px;color:#68726c}
      #safeplate-source-status details{margin-top:12px;background:white;border:1px solid #e3e7e3;border-radius:13px;padding:10px 12px}#safeplate-source-status summary{cursor:pointer;font-weight:800;font-size:12px}
      #safeplate-source-status .src{display:grid;grid-template-columns:1.6fr .7fr .7fr;gap:8px;padding:8px 0;border-top:1px solid #edf0ed;font-size:10px}.ok{color:#08783e;font-weight:800}.bad{color:#a34721;font-weight:800}.planned{color:#6d7470;font-weight:800}
      @media(max-width:650px){#safeplate-source-status .metrics{grid-template-columns:1fr 1fr}#safeplate-source-status .src{grid-template-columns:1fr}.metric b{font-size:14px}}
      </style><div class="spbox"><h2>SAFEPLATE Surveillance Coverage</h2><div class="sub">Execution status, not a marketing claim. Updated from the live source audit.</div><div class="metrics">
      <div class="metric"><b>${d.federal.online}/${d.federal.total} online</b><span>Federal sources · ${d.federal.checked} checked · ${d.federal.issues} issues</span></div>
      <div class="metric"><b>${d.jurisdictions.checked}/51 checked</b><span>States + DC · ${d.jurisdictions.online} online · ${d.jurisdictions.degraded} degraded</span></div>
      <div class="metric"><b>${d.lastAgeMinutes==null?'Pending':d.lastAgeMinutes+' min ago'}</b><span>Last federal surveillance cycle</span></div>
      <div class="metric"><b>${d.nextInMinutes==null?'Pending':'~'+d.nextInMinutes+' min'}</b><span>Next 30-minute surveillance cycle</span></div></div>
      <details><summary>Source-by-source coverage audit</summary>${(d.sources||[]).map(s=>`<div class="src"><span>${esc(s.name)}</span><span>${esc(s.connected?'CONNECTED':'PLANNED')}</span><span class="${s.executionStatus==='ONLINE'?'ok':s.executionStatus==='PLANNED'?'planned':'bad'}">${esc(s.executionStatus)}</span></div>`).join('')}</details></div>`;
      const target=document.querySelector('.app')||document.querySelector('main')||document.body; target.prepend(el);
    }catch(e){console.warn('SAFEPLATE source status unavailable',e)}
  }
  window.addEventListener('DOMContentLoaded',render);
})();
