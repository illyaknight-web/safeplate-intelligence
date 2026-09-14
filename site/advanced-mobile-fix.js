(()=>{
  const frame=document.getElementById('advancedFrame');
  const STATIC_MAP='https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=-130,24,-65,50&bboxSR=4326&size=1200,650&imageSR=4326&format=png32&transparent=false&f=image';
  function installHeaderPulse(){
    try{
      const header=document.querySelector('.siteHeader'),meta=document.querySelector('.headerMeta');
      if(!header||!meta)return;
      if(!document.getElementById('safeplate-pulse-nav-style')){
        const style=document.createElement('style');
        style.id='safeplate-pulse-nav-style';
        style.textContent=`.siteHeader .headerMeta{display:flex;align-items:center;justify-content:flex-end;gap:8px;font-size:0!important}.siteHeader .headerMeta:before{content:'One site · three views · 30-minute live checks';font-size:10px;color:#7b8e83;white-space:nowrap}.safeplate-pulse-nav{display:inline-flex!important;align-items:center;justify-content:center;min-height:42px;padding:10px 14px!important;border:1px solid #72e49a!important;border-radius:999px!important;background:#72e49a!important;color:#06200f!important;text-decoration:none!important;font-size:11px!important;font-weight:950!important;letter-spacing:.035em!important;box-shadow:0 8px 24px rgba(114,228,154,.14)}.safeplate-pulse-nav:hover{filter:brightness(1.04)}@media(max-width:760px){.siteHeader .headerMeta{display:flex!important;position:absolute!important;right:10px!important;top:9px!important;z-index:30!important}.siteHeader .headerMeta:before{display:none!important}.safeplate-pulse-nav{min-height:38px!important;padding:8px 10px!important;font-size:10px!important}.siteHeader .brand{padding-right:132px!important}}`;
        document.head.appendChild(style);
      }
      let link=document.getElementById('safeplate-pulse-nav');
      if(!link){
        link=document.createElement('a');
        link.id='safeplate-pulse-nav';
        link.className='safeplate-pulse-nav';
        link.href='/safeplate-pulse.html';
        link.textContent='FOOD SAFETY PULSE';
        link.setAttribute('aria-label','Open SAFEPLATE Food Safety Pulse');
        meta.appendChild(link);
      }
    }catch(e){console.warn('SAFEPLATE Pulse navigation install skipped',e)}
  }
  function install(){
    try{
      installHeaderPulse();
      const doc=frame?.contentDocument;
      if(!doc?.head)return;
      if(!doc.getElementById('safeplate-command-mobile-fix')){
        const style=doc.createElement('style');
        style.id='safeplate-command-mobile-fix';
        style.textContent=`@media(max-width:700px){.workspaceTitle{display:block!important;position:static!important;padding:4px 0 12px!important}.workspaceTitle h2{font-size:26px!important;line-height:1.06!important;margin:5px 0 9px!important}.workspaceTitle p{font-size:12px!important;line-height:1.45!important;margin:0!important;max-width:none!important}.commandMetrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}.journeyControls{display:grid!important;grid-template-columns:1fr 1fr!important;align-items:stretch!important}.journeyControls button{width:100%!important;min-height:46px!important}.journeyGuide{grid-column:1/-1!important;margin:0!important}.journeyGrid{display:block!important}.journeyMap{height:390px!important;min-height:390px!important;margin-bottom:12px!important}.evidence{height:auto!important;min-height:220px!important;max-height:none!important}.fallbackLegend{max-width:calc(100% - 24px)!important}.workspaceInner{overflow-x:hidden!important}}
.safeplate-v18-tools{display:flex;gap:8px;flex-wrap:wrap;margin:10px 0 14px}.safeplate-v18-tools a,.safeplate-v18-tools button{border:1px solid #315b42;background:#0c2116;color:#e9f8ee;border-radius:999px;padding:9px 12px;font:800 9px/1 Inter,system-ui,sans-serif;letter-spacing:.07em;text-decoration:none}.safeplate-v18-tools a{background:#72e49a;color:#06200f;border-color:#72e49a}.safeplate-map-full{position:fixed!important;inset:0!important;z-index:99999!important;width:100vw!important;height:100vh!important;max-height:none!important;min-height:100vh!important;border-radius:0!important;margin:0!important}`;
        doc.head.appendChild(style);
      }
      const upgradeFallbackMap=id=>{
        const el=doc.getElementById(id);
        if(!el)return;
        if(!el.querySelector('canvas')&&!el.querySelector('.safeplate-real-static-basemap')){
          const svg=el.querySelector('svg[aria-label*="Schematic United States evidence map"]');
          if(svg){const img=doc.createElement('img');img.className='safeplate-real-static-basemap';img.src=STATIC_MAP;img.alt='Geographic map of the United States';img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.48) saturate(.72);';svg.replaceWith(img);const legend=el.querySelector('.fallbackLegend b');if(legend)legend.textContent='Verified geographic evidence · static basemap';if(!el.querySelector('.safeplate-map-attribution')){const attr=doc.createElement('div');attr.className='safeplate-map-attribution';attr.textContent='Basemap: Esri World Street Map';attr.style.cssText='position:absolute;right:8px;bottom:6px;z-index:6;background:#06110bcc;color:#dfe9e3;padding:4px 6px;border-radius:5px;font-size:7px;';el.appendChild(attr)}}
        }
        if(!el.dataset.v18Fullscreen){el.dataset.v18Fullscreen='1';const btn=doc.createElement('button');btn.type='button';btn.textContent='FULL SCREEN MAP';btn.setAttribute('aria-label','Expand intelligence map to full screen');btn.style.cssText='position:absolute;left:10px;bottom:10px;z-index:30;border:1px solid #72e49a;background:#07150de8;color:#eaffef;border-radius:999px;padding:9px 11px;font:850 9px Inter,system-ui,sans-serif;letter-spacing:.06em';btn.onclick=()=>{const on=el.classList.toggle('safeplate-map-full');btn.textContent=on?'CLOSE FULL SCREEN':'FULL SCREEN MAP';doc.body.style.overflow=on?'hidden':'';setTimeout(()=>frame.contentWindow?.dispatchEvent(new Event('resize')),80)};el.appendChild(btn)}
      };
      const addV18Tools=()=>{const host=doc.querySelector('.workspaceTitle')||doc.querySelector('.workspaceInner');if(!host||doc.getElementById('safeplate-v18-tools'))return;const tools=doc.createElement('div');tools.id='safeplate-v18-tools';tools.className='safeplate-v18-tools';tools.innerHTML='<a href="/safeplate-pulse.html" target="_top">FOOD SAFETY PULSE</a><button type="button" id="safeplate-gov-mode">GOVERNMENT / INSTITUTION MODE</button>';host.insertAdjacentElement('afterend',tools);tools.querySelector('#safeplate-gov-mode').onclick=()=>{doc.body.classList.toggle('safeplate-government-mode');const on=doc.body.classList.contains('safeplate-government-mode');tools.querySelector('#safeplate-gov-mode').textContent=on?'PUBLIC LANGUAGE MODE':'GOVERNMENT / INSTITUTION MODE';doc.querySelectorAll('.evidence,.panel,.workspaceInner').forEach(x=>x.dataset.audience=on?'government-institution':'public')};};
      const enhance=()=>{['heroMap','journeyMap'].forEach(upgradeFallbackMap);addV18Tools();installHeaderPulse()};
      enhance();
      if(!doc.documentElement.dataset.safeplateRealMapWatcher){doc.documentElement.dataset.safeplateRealMapWatcher='1';new MutationObserver(enhance).observe(doc.body,{childList:true,subtree:true})}
      [250,700,1600].forEach(delay=>setTimeout(enhance,delay));
    }catch(e){console.warn('SAFEPLATE V18 advanced enhancement skipped',e)}
  }
  frame?.addEventListener('load',install);
  [0,80,200,600,1200].forEach(delay=>setTimeout(()=>{installHeaderPulse();install()},delay));
})();
