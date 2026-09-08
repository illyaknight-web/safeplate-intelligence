(()=>{
  const frame=document.getElementById('advancedFrame');
  function install(){
    try{
      const doc=frame?.contentDocument;
      if(!doc?.head||doc.getElementById('safeplate-command-mobile-fix'))return;
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
    }catch{}
  }
  frame?.addEventListener('load',install);
  [0,200,600].forEach(delay=>setTimeout(install,delay));
})();
