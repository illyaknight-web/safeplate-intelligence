(()=>{
  if(window.__safeplatePwaInstalled)return;window.__safeplatePwaInstalled=true;
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
  let deferredPrompt=null;
  const b64ToBytes=s=>{const pad='='.repeat((4-s.length%4)%4),raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)))};
  async function registration(){if(!('serviceWorker'in navigator))throw new Error('Service workers are not supported');return navigator.serviceWorker.register('/safeplate-sw.js',{scope:'/'}).then(()=>navigator.serviceWorker.ready)}
  async function subscribePush(){
    if(!('Notification'in window)||!('PushManager'in window))throw new Error('Phone alerts are not supported in this browser');
    const permission=await Notification.requestPermission();
    if(permission!=='granted')throw new Error('Notifications were not allowed');
    const reg=await registration();
    const keyResp=await fetch('/.netlify/functions/push-subscribe',{cache:'no-store'});const keyData=await keyResp.json();
    if(!keyResp.ok||!keyData.publicKey)throw new Error(keyData.error||'Push service unavailable');
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToBytes(keyData.publicKey)});
    const save=await fetch('/.netlify/functions/push-subscribe',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({subscription:sub.toJSON(),preferences:{level:'essential'}})});
    if(!save.ok)throw new Error('Could not save alert subscription');
    await reg.showNotification('SAFEPLATE alerts are on',{body:'You’ll receive essential verified food recall and outbreak alerts on this phone.',icon:'/safeplate-icon.svg',badge:'/safeplate-icon.svg',tag:'safeplate-alerts-on',data:{url:'/safeplate-pulse.html'}});
    return true;
  }
  function build(){
    if(document.getElementById('safeplatePhonePanel'))return;
    const wrap=document.createElement('div');wrap.id='safeplatePhonePanel';wrap.innerHTML=`<button id="safeplatePhoneOpen" aria-expanded="false"><span>SAFEPLATE ON YOUR PHONE</span><b>Get recall alerts</b></button><section id="safeplatePhoneCard" hidden><button id="safeplatePhoneClose" aria-label="Close">×</button><small>SAFEPLATE™ PHONE ALERTS</small><h2>Know when your food is affected.</h2><p>Install SAFEPLATE and turn on essential verified recall and outbreak alerts for this phone.</p><div id="safeplatePhoneStatus"></div><button id="safeplateInstallBtn">${standalone?'SAFEPLATE IS INSTALLED':'GET SAFEPLATE ON MY PHONE'}</button><button id="safeplateAlertsBtn">TURN ON RECALL ALERTS</button><em>SAFEPLATE uses official-source evidence and will not invent alert details.</em></section>`;
    const css=document.createElement('style');css.textContent=`#safeplatePhonePanel{position:fixed;z-index:2147483000;right:18px;bottom:18px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}#safeplatePhoneOpen{border:1px solid #3e7656;background:#07150d;color:#fff;border-radius:16px;padding:10px 14px;box-shadow:0 18px 45px rgba(0,0,0,.38);text-align:left;cursor:pointer}#safeplatePhoneOpen span{display:block;font-size:8px;letter-spacing:.13em;color:#72e49a;font-weight:900}#safeplatePhoneOpen b{display:block;font-size:13px;margin-top:2px}#safeplatePhoneCard{position:absolute;right:0;bottom:58px;width:min(360px,calc(100vw - 28px));background:#07150d;border:1px solid #315640;border-radius:22px;padding:22px;box-shadow:0 28px 70px rgba(0,0,0,.55)}#safeplatePhoneCard small{color:#72e49a;font-weight:900;letter-spacing:.12em;font-size:9px}#safeplatePhoneCard h2{font-size:25px;line-height:1.05;margin:9px 0}#safeplatePhoneCard p{font-size:13px;line-height:1.55;color:#c9d7cf;margin:0 0 14px}#safeplatePhoneCard button:not(#safeplatePhoneClose){display:block;width:100%;border:0;border-radius:13px;padding:13px 12px;margin-top:9px;font-weight:900;cursor:pointer}#safeplateInstallBtn{background:#eafff0;color:#092015}#safeplateAlertsBtn{background:#12884a;color:#fff}#safeplatePhoneClose{position:absolute;right:10px;top:8px;border:0;background:transparent;color:#a8b7ae;font-size:25px;cursor:pointer}#safeplatePhoneCard em{display:block;font-style:normal;font-size:9px;line-height:1.45;color:#82968a;margin-top:11px}#safeplatePhoneStatus{font-size:11px;line-height:1.4;color:#9fefb8;min-height:0}#safeplatePhoneStatus.error{color:#ffb1a8}@media(max-width:760px){#safeplatePhonePanel{right:10px;bottom:10px}#safeplatePhoneOpen{padding:9px 11px}#safeplatePhoneCard{bottom:54px}}`;
    document.head.appendChild(css);document.body.appendChild(wrap);
    const open=wrap.querySelector('#safeplatePhoneOpen'),card=wrap.querySelector('#safeplatePhoneCard'),close=wrap.querySelector('#safeplatePhoneClose'),install=wrap.querySelector('#safeplateInstallBtn'),alerts=wrap.querySelector('#safeplateAlertsBtn'),status=wrap.querySelector('#safeplatePhoneStatus');
    open.onclick=()=>{card.hidden=false;open.setAttribute('aria-expanded','true')};close.onclick=()=>{card.hidden=true;open.setAttribute('aria-expanded','false')};
    install.onclick=async()=>{
      status.className='';
      if(standalone){status.textContent='SAFEPLATE is already installed on this phone.';return}
      if(deferredPrompt){deferredPrompt.prompt();const result=await deferredPrompt.userChoice;status.textContent=result.outcome==='accepted'?'SAFEPLATE installation started.':'Installation was not completed.';deferredPrompt=null;return}
      if(isIOS){status.textContent='On iPhone: tap Share, then “Add to Home Screen.” Open SAFEPLATE from the new icon, then turn on recall alerts.';return}
      status.textContent='Use your browser menu and choose “Install app” or “Add to Home screen.”';
    };
    alerts.onclick=async()=>{status.className='';alerts.disabled=true;alerts.textContent='TURNING ON ALERTS…';try{if(isIOS&&!standalone)throw new Error('On iPhone, first add SAFEPLATE to your Home Screen and open it from the SAFEPLATE icon. Then turn on alerts.');await subscribePush();status.textContent='Recall alerts are ON for this phone.';alerts.textContent='RECALL ALERTS ON'}catch(e){status.className='error';status.textContent=e.message||'Could not enable alerts.';alerts.textContent='TURN ON RECALL ALERTS';alerts.disabled=false}};
  }
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredPrompt=e});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
  registration().catch(()=>{});
})();
