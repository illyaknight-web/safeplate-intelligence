import crypto from 'node:crypto';
import { getStore } from '@netlify/blobs';
import { getState } from './store.mjs';

const env=name=>globalThis.Netlify?.env?.get?.(name)||process.env[name]||'';
const enabled=name=>/^(1|true|yes)$/i.test(env(name));
const text=(value,max=1200)=>String(value??'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);
const array=value=>Array.isArray(value)?value:[];
const digest=value=>crypto.createHash('sha256').update(String(value)).digest('hex');
const occurredAt=record=>record.updatedAt||record.lastObservedAt||record.verifiedAt||record.sourcePostedAt||record.announcedDate||record.recallDate||null;

function publicEvidence(record){
  return array(record.evidence).slice(0,25).map(item=>({
    type:text(item?.type,80),status:text(item?.status,80),source:text(item?.source,180),
    source_url:/^https:\/\//i.test(String(item?.url||''))?String(item.url):null,
    published_at:item?.publishedAt||item?.date||null,text:text(item?.text||item?.summary,1600)
  }));
}

function intelligenceClass(record){
  const value=`${record.status||''} ${record.category||''} ${record.rawSource||''}`;
  if(/emerging|early.?warning|signal|operational.?context|inspection/i.test(value))return 'EMERGING';
  if(/corroborat|investigat|monitor|review|association/i.test(value))return 'CORRELATED';
  return 'OFFICIAL';
}

function contractRecord(record){
  return {
    safeplate_record_id:text(record.id,180),schema_version:'safeplate.veriscope.record.v1',
    record_type:text(record.category||record.status||'food_safety_record',120),
    intelligence_class:intelligenceClass(record),
    source:text(record.source||record.rawSource,220),source_record_id:text(record.sourceRecordId||record.recallNumber||record.id,180),
    source_url:[record.url,record.sourceUrl,record.source_url,record.link,...publicEvidence(record).map(x=>x.source_url)].find(x=>/^https:\/\//i.test(String(x||'')))||null,
    published_at:record.sourcePostedAt||record.announcedDate||record.recallDate||null,
    retrieved_at:record.lastObservedAt||record.updatedAt||null,updated_at:occurredAt(record),
    organization:{name:text(record.company||record.firm||record.recallingFirm||record.manufacturer,240)},
    facility:record.facility&&typeof record.facility==='object'?{name:text(record.facility.name,240),address:text(record.facility.address,360),identifier:text(record.facility.identifier||record.facility.establishmentNumber,120)}:null,
    product:{name:text(record.product||record.title,500),brand:text(record.brand,180),upc:text(record.upc,32),gtin:text(record.gtin,32),packaging:text(record.packaging||record.size,180)},
    lot:array(record.lots).slice(0,60).map(x=>text(typeof x==='string'?x:x?.value||x?.lot,120)).filter(Boolean),
    distribution:{states:[...new Set([...array(record.states),...array(record.distributionStates),...array(record.affectedStates)].map(x=>text(x,80)).filter(Boolean))],description:text(record.distribution,1600)},
    hazard:text(record.hazard||record.reason||record.pathogen,1000),status:text(record.status,100),
    evidence:publicEvidence(record),lineage:{source_layer:'SAFEPLATE',derived:false,human_verified:Boolean(record.humanVerified)}
  };
}

async function writeEvent(store,event,data={}){
  const time=new Date().toISOString(),id=crypto.randomUUID();
  const head=await store.get('audit/head',{type:'json'}).catch(()=>null),entry={event,time,previous_hash:head?.entry_hash||null,...data};
  entry.entry_hash=digest(JSON.stringify(entry));
  const key=`audit/${time.slice(0,10)}/${time}-${id}`;
  await store.setJSON(key,entry);
  await store.setJSON('audit/head',{key,entry_hash:entry.entry_hash,time});
  return key;
}

async function postBatch(url,token,payload,key){
  let lastError='Unknown publish failure';
  for(let attempt=1;attempt<=3;attempt++){
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
      const response=await fetch(url,{method:'POST',signal:controller.signal,headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':key,'user-agent':'SAFEPLATE-VERISCOPE-Bridge/1.0'},body:JSON.stringify(payload)}).finally(()=>clearTimeout(timer));
      if(response.ok)return {ok:true,status:response.status,attempt};
      lastError=`VERISCOPE ingest HTTP ${response.status}`;
      if(response.status<500&&response.status!==429)break;
    }catch(error){lastError=error?.name==='AbortError'?'VERISCOPE ingest timed out':text(error?.message,300)}
    if(attempt<3)await new Promise(resolve=>setTimeout(resolve,attempt*750));
  }
  return {ok:false,error:lastError};
}

export async function runVeriscopeBridge(){
  const store=getStore({name:'safeplate-veriscope-bridge',consistency:'strong'}),startedAt=new Date().toISOString();
  const base={cycle_id:crypto.randomUUID(),started_at:startedAt,mode:'SHADOW',contract_version:'safeplate.veriscope.batch.v1'};
  if(!enabled('VERISCOPE_BRIDGE_ENABLED')){
    const status={...base,status:'DISABLED',reason:'VERISCOPE_BRIDGE_ENABLED is not active',completed_at:new Date().toISOString(),records_evaluated:0};
    await store.setJSON('status/latest',status);await writeEvent(store,'BRIDGE_DISABLED',{cycleId:base.cycle_id});return status;
  }
  const url=env('VERISCOPE_INGEST_URL'),token=env('VERISCOPE_INGEST_TOKEN');
  if(!url||!token){
    const status={...base,status:'AWAITING_CONFIGURATION',reason:'Secure VERISCOPE endpoint or token is missing',completed_at:new Date().toISOString(),records_evaluated:0};
    await store.setJSON('status/latest',status);await writeEvent(store,'BRIDGE_CONFIGURATION_MISSING',{cycleId:base.cycle_id});return status;
  }
  let endpoint;try{endpoint=new URL(url);if(endpoint.protocol!=='https:')throw Error('HTTPS required')}catch{
    const status={...base,status:'CONFIGURATION_ERROR',reason:'VERISCOPE_INGEST_URL must be HTTPS',completed_at:new Date().toISOString(),records_evaluated:0};
    await store.setJSON('status/latest',status);await writeEvent(store,'BRIDGE_CONFIGURATION_REJECTED',{cycleId:base.cycle_id});return status;
  }
  const checkpoint=await store.get('checkpoint/latest',{type:'json'}).catch(()=>null),since=checkpoint?.through||'1970-01-01T00:00:00.000Z',state=await getState();
  const changed=array(state.incidents).filter(record=>{const when=occurredAt(record);return when&&new Date(when)>new Date(since)}).sort((a,b)=>new Date(occurredAt(a))-new Date(occurredAt(b))).slice(0,250);
  const records=changed.map(contractRecord),through=changed.length?occurredAt(changed.at(-1)):since;
  if(!records.length){
    const status={...base,status:'SHADOW_NO_CHANGES',completed_at:new Date().toISOString(),checkpoint:since,records_evaluated:0};
    await store.setJSON('status/latest',status);await writeEvent(store,'SHADOW_CYCLE_NO_CHANGES',{cycleId:base.cycle_id,checkpoint:since});return status;
  }
  const payload={...base,producer:'SAFEPLATE',created_at:new Date().toISOString(),records},idempotencyKey=digest(JSON.stringify({since,through,ids:records.map(x=>x.safeplate_record_id)}));
  await writeEvent(store,'SHADOW_BATCH_PREPARED',{cycleId:base.cycle_id,idempotencyKey,records:records.length,since,through});
  const sent=await postBatch(endpoint.toString(),token,payload,idempotencyKey);
  if(!sent.ok){
    const deadKey=`dead-letter/${startedAt.slice(0,10)}/${startedAt}-${base.cycle_id}`;
    await store.setJSON(deadKey,{payload,error:sent.error,failed_at:new Date().toISOString(),retryable:true});
    const status={...base,status:'SHADOW_DELIVERY_FAILED',completed_at:new Date().toISOString(),records_evaluated:records.length,error:sent.error,dead_letter:deadKey};
    await store.setJSON('status/latest',status);await writeEvent(store,'SHADOW_DELIVERY_FAILED',{cycleId:base.cycle_id,idempotencyKey,error:sent.error,deadLetter:deadKey});return status;
  }
  await store.setJSON('checkpoint/latest',{through,cycle_id:base.cycle_id,updated_at:new Date().toISOString(),idempotency_key:idempotencyKey});
  const status={...base,status:'SHADOW_DELIVERED',completed_at:new Date().toISOString(),records_evaluated:records.length,checkpoint:through,delivery_status:sent.status,attempts:sent.attempt};
  await store.setJSON('status/latest',status);await writeEvent(store,'SHADOW_DELIVERED',{cycleId:base.cycle_id,idempotencyKey,records:records.length,through});return status;
}
