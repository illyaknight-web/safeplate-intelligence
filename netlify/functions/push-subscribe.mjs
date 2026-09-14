import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';

const env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name]||'';
const json=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}});
const clean=(v,max=500)=>String(v??'').replace(/[\u0000-\u001f<>]/g,' ').trim().slice(0,max);
const store=()=>getStore({name:'safeplate-push-subscriptions',consistency:'strong'});
const keyFor=endpoint=>'sub:'+crypto.createHash('sha256').update(endpoint).digest('hex');

export default async function(req){
  if(req.method==='GET'){
    const publicKey=env('SAFEPLATE_VAPID_PUBLIC_KEY');
    return publicKey?json({ok:true,publicKey}):json({ok:false,error:'Push service is not configured'},503);
  }
  if(req.method==='POST'){
    let body={};
    try{body=await req.json()}catch{return json({ok:false,error:'Invalid JSON'},400)}
    const endpoint=clean(body?.subscription?.endpoint,2000);
    if(!endpoint||!/^https:\/\//i.test(endpoint))return json({ok:false,error:'Valid push subscription required'},400);
    const record={
      subscription:body.subscription,
      preferences:{level:clean(body?.preferences?.level||'essential',40),zip:clean(body?.preferences?.zip||'',12),state:clean(body?.preferences?.state||'',40)},
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
      userAgent:clean(req.headers.get('user-agent')||'',300)
    };
    await store().setJSON(keyFor(endpoint),record);
    return json({ok:true,status:'subscribed'});
  }
  if(req.method==='DELETE'){
    let body={};try{body=await req.json()}catch{}
    const endpoint=clean(body?.endpoint,2000);
    if(endpoint)await store().delete(keyFor(endpoint));
    return json({ok:true,status:'removed'});
  }
  return json({ok:false,error:'Method not allowed'},405);
}
