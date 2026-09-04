const VERSION='safeplate-booth-v1';
const SHELL=['/booth','/booth.html','/booth.js','/booth-manifest.webmanifest'];
self.addEventListener('install',event=>event.waitUntil(caches.open(VERSION).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('safeplate-booth-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  if(new URL(event.request.url).pathname==='/api/incidents'){
    event.respondWith(fetch(event.request).then(response=>{const copy=response.clone();caches.open(VERSION).then(cache=>cache.put(event.request,copy));return response}).catch(()=>caches.match(event.request)));
    return;
  }
  event.respondWith(caches.match(event.request).then(hit=>hit||fetch(event.request)));
});
