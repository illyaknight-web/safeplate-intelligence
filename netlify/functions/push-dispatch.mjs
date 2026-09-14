import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { getState } from './lib/store.mjs';
import { searchRecallRecords } from './lib/recall-search.mjs';

const env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name]||'';
const subscriptions=()=>getStore({name:'safeplate-push-subscriptions',consistency:'strong'});
const dispatchState=()=>getStore({name:'safeplate-push-dispatch',consistency:'strong'});
const b64url=input=>Buffer.from(input).toString('base64url');
const from64=s=>Buffer.from(String(s||''),'base64url');
const fingerprint=x=>crypto.createHash('sha256').update(JSON.stringify([x?.id,x?.eventId,x?.title,x?.product,x?.date,x?.sourceUrl])).digest('hex');

function vapidAuth(endpoint){
  const publicKey=env('SAFEPLATE_VAPID_PUBLIC_KEY'),privateKey=env('SAFEPLATE_VAPID_PRIVATE_KEY');
  if(!publicKey||!privateKey)throw new Error('VAPID keys missing');
  const pub=from64(publicKey);if(pub.length!==65||pub[0]!==4)throw new Error('Invalid VAPID public key');
  const jwk={kty:'EC',crv:'P-256',x:pub.subarray(1,33).toString('base64url'),y:pub.subarray(33,65).toString('base64url'),d:from64(privateKey).toString('base64url')};
  const header=b64url(JSON.stringify({typ:'JWT',alg:'ES256'}));
  const aud=new URL(endpoint).origin;
  const payload=b64url(JSON.stringify({aud,exp:Math.floor(Date.now()/1000)+60*60*12,sub:'mailto:functionmedia@gmail.com'}));
  const input=`${header}.${payload}`;
  const signature=crypto.sign('sha256',Buffer.from(input),{key:crypto.createPrivateKey({key:jwk,format:'jwk'}),dsaEncoding:'ieee-p1363'}).toString('base64url');
  return `vapid t=${input}.${signature}, k=${publicKey}`;
}

async function sendEmptyPush(endpoint){
  return fetch(endpoint,{method:'POST',headers:{TTL:'86400',Urgency:'high',Authorization:vapidAuth(endpoint)}});
}

export default async function(){
  const state=await getState();
  const found=searchRecallRecords(state?.incidents||[],{query:'current food recall',limit:1});
  const latest=found.records?.[0];
  if(!latest)return new Response(JSON.stringify({ok:true,status:'no-current-record'}),{headers:{'content-type':'application/json'}});
  const fp=fingerprint(latest),metaStore=dispatchState(),last=await metaStore.get('last-fingerprint',{type:'text'}).catch(()=>null);
  if(last===fp)return new Response(JSON.stringify({ok:true,status:'no-new-alert',record:latest.id||latest.eventId||latest.title}),{headers:{'content-type':'application/json'}});
  const store=subscriptions();
  const listed=await store.list({prefix:'sub:'});
  let sent=0,removed=0,failed=0;
  for(const item of listed.blobs||[]){
    const record=await store.get(item.key,{type:'json'}).catch(()=>null),endpoint=record?.subscription?.endpoint;
    if(!endpoint)continue;
    try{
      const res=await sendEmptyPush(endpoint);
      if(res.ok){sent++;continue}
      if(res.status===404||res.status===410){await store.delete(item.key);removed++;continue}
      failed++;
    }catch{failed++}
  }
  await metaStore.set('last-fingerprint',fp);
  await metaStore.setJSON('last-dispatch',{at:new Date().toISOString(),record:latest.id||latest.eventId||latest.title||null,sent,removed,failed});
  return new Response(JSON.stringify({ok:true,status:'dispatched',sent,removed,failed}),{headers:{'content-type':'application/json'}});
}

export const config={schedule:'*/30 * * * *'};
