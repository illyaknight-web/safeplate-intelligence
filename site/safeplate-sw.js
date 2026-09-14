const CACHE='safeplate-app-v1';
const SHELL=['/','/safeplate-shell.html','/safeplate.webmanifest','/safeplate-icon.svg'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).catch(()=>null));self.skipWaiting()});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&k.startsWith('safeplate-app-')).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;const url=new URL(event.request.url);if(url.origin!==location.origin)return;if(url.pathname.startsWith('/.netlify/functions/'))return;event.respondWith(fetch(event.request).catch(()=>caches.match(event.request).then(r=>r||caches.match('/safeplate-shell.html'))))});
async function latestRecall(){
  try{
    const r=await fetch('/api/recall-service?q=current%20food%20recall&limit=1',{cache:'no-store'});
    if(!r.ok)throw new Error('recall fetch failed');
    const j=await r.json();
    const x=(j.records||j.results||j.items||[])[0];
    if(!x)return null;
    return {title:x.title||x.product||x.name||'New food safety alert',body:x.reason||x.summary||'SAFEPLATE has a new verified food safety update.',url:x.sourceUrl||'/safeplate-pulse.html',tag:x.id||x.eventId||x.title||'safeplate-recall'};
  }catch{return null}
}
self.addEventListener('push',event=>{
  event.waitUntil((async()=>{
    let payload=null;
    try{payload=event.data?event.data.json():null}catch{}
    const recall=payload||await latestRecall()||{title:'SAFEPLATE Food Safety Alert',body:'A new verified food safety update is available.',url:'/safeplate-pulse.html',tag:'safeplate-alert'};
    await self.registration.showNotification(recall.title||'SAFEPLATE Food Safety Alert',{
      body:recall.body||'Open SAFEPLATE for the latest verified details.',
      icon:'/safeplate-icon.svg',
      badge:'/safeplate-icon.svg',
      tag:String(recall.tag||'safeplate-alert'),
      renotify:true,
      data:{url:recall.url||'/safeplate-pulse.html'},
      actions:[{action:'view',title:'View alert'}]
    });
  })())
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  const target=new URL(event.notification.data?.url||'/safeplate-pulse.html',location.origin).href;
  event.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{for(const c of list){if('focus'in c){c.navigate(target);return c.focus()}}return clients.openWindow(target)}));
});
