(()=>{
  const frame=document.getElementById('advancedFrame');
  const STATIC_MAP='https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/export?bbox=-130,24,-65,50&bboxSR=4326&size=1200,650&imageSR=4326&format=png32&transparent=false&f=image';
  function install(){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.head)return;
      if(!doc.getElementById('safeplate-command-mobile-fix')){
        const style=doc.createElement('style');
        style.id='safeplate-command-mobile-fix';
        style.textContent=`@media(max-width:700px){
          .workspaceTitle{display:block!important;position:static!important;padding:4px 0 12px!important}
          .workspaceTitle h2{font-size:26px!important;line-height:1.06!important;margin:5px 0 9px!important}
          .workspaceTitle p{font-size:12px!important;line-height:1.45!important;margin:0!important;max-width:none!important}
          .commandMetrics{grid-template-columns:repeat(2,minmax(0,1fr))!important}
          .journeyControls{display:grid!important;grid-template-columns:1fr 1fr!important;align-items:stretch!important}
          .journeyControls button{width:100%!important;min-height:46px!important}
          .journeyGuide{grid-column:1/-1!important;margin:0!important}
          .journeyGrid{display:block!important}
          .journeyMap{height:390px!important;min-height:390px!important;margin-bottom:12px!important}
          .evidence{height:auto!important;min-height:220px!important;max-height:none!important}
          .fallbackLegend{max-width:calc(100% - 24px)!important}
          .workspaceInner{overflow-x:hidden!important}
        }`;
        doc.head.appendChild(style);
      }
      const upgradeFallbackMap=id=>{
        const el=doc.getElementById(id);
        if(!el||el.querySelector('canvas')||el.querySelector('.safeplate-real-static-basemap'))return;
        const svg=el.querySelector('svg[aria-label*="Schematic United States evidence map"]');
        if(!svg)return;
        const img=doc.createElement('img');
        img.className='safeplate-real-static-basemap';
        img.src=STATIC_MAP;
        img.alt='Geographic map of the United States';
        img.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;filter:brightness(.48) saturate(.72);';
        svg.replaceWith(img);
        const legend=el.querySelector('.fallbackLegend b');
        if(legend)legend.textContent='Verified geographic evidence · static basemap';
        if(!el.querySelector('.safeplate-map-attribution')){
          const attr=doc.createElement('div');
          attr.className='safeplate-map-attribution';
          attr.textContent='Basemap: Esri World Street Map';
          attr.style.cssText='position:absolute;right:8px;bottom:6px;z-index:6;background:#06110bcc;color:#dfe9e3;padding:4px 6px;border-radius:5px;font-size:7px;';
          el.appendChild(attr);
        }
      };
      const enhance=()=>['heroMap','journeyMap'].forEach(upgradeFallbackMap);
      enhance();
      if(!doc.documentElement.dataset.safeplateRealMapWatcher){
        doc.documentElement.dataset.safeplateRealMapWatcher='1';
        new MutationObserver(enhance).observe(doc.body,{childList:true,subtree:true});
      }
      [250,700,1600].forEach(delay=>setTimeout(enhance,delay));
    }catch{}
  }
  frame?.addEventListener('load',install);
  [0,200,600].forEach(delay=>setTimeout(install,delay));
})();
