import { getState, saveState } from './lib/store.mjs';
import * as cheerio from 'cheerio';
import crypto from 'node:crypto';
import { parseCDCNoticePage, parseCDCOutbreakIndex } from './lib/cdc-current-parser.mjs';

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const nowISO=()=>new Date().toISOString();
const fetchWithTimeout=async(url,ms=12000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept:'text/html,application/xhtml+xml,*/*;q=0.8','accept-language':'en-US,en;q=0.9','cache-control':'no-cache','user-agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.0; +https://safeplate-intelligence.netlify.app)'}})}finally{clearTimeout(t)}};
const CURRENT_URL='https://www.cdc.gov/foodborne-outbreaks/outbreaks/index.html';
const CDC_ORIGIN='https://www.cdc.gov';
const PATHOGEN_INDEXES=['campylobacter','ecoli','listeria','salmonella'].map(x=>`${CDC_ORIGIN}/${x}/outbreaks/index.html`);

const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);

async function mapLimit(items,limit,worker){
  const out=new Array(items.length);let next=0;
  await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(next<items.length){const i=next++;out[i]=await worker(items[i])}}));
  return out;
}

async function pullCDC(){
  const r=await fetchWithTimeout(CURRENT_URL);if(!r.ok)throw new Error(`CDC Current Outbreaks HTTP ${r.status}`);
  const html=await r.text(),$=cheerio.load(html),text=clean($('main').text()||$('body').text());
  const count=(rx)=>Number((text.match(rx)||[])[1]||0);
  const counts={campylobacter:count(/Campylobacter\s*:\s*(\d+)/i),ecoli:count(/E\.?\s*coli\s*:\s*(\d+)/i),listeria:count(/Listeria(?:\s+monocytogenes)?\s*:\s*(\d+)/i),salmonella:count(/Salmonella\s*:\s*(\d+)/i)};
  const total=Object.values(counts).reduce((a,b)=>a+b,0),updated=(text.match(/Last updated:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)||[])[1];
  if(!total)throw new Error('CDC Current Outbreaks page returned no parsable active-investigation counts');

  const indexResults=await Promise.allSettled(PATHOGEN_INDEXES.map(async url=>{const x=await fetchWithTimeout(url);if(!x.ok)throw new Error(`${url} HTTP ${x.status}`);return parseCDCOutbreakIndex(await x.text(),url)}));
  const successfulIndexes=indexResults.filter(x=>x.status==='fulfilled');
  if(!successfulIndexes.length)throw new Error('CDC pathogen outbreak indexes were unavailable');
  const detailUrls=[...new Set(successfulIndexes.flatMap(x=>x.value))].slice(0,48);
  const detailResults=await mapLimit(detailUrls,8,async url=>{try{const x=await fetchWithTimeout(url);if(!x.ok)return null;return parseCDCNoticePage(await x.text(),url)}catch{return null}});
  const incidents=detailResults.filter(Boolean);
  return {incidents,note:`CDC Current Outbreaks validated; ${total} active multistate investigations — Campylobacter ${counts.campylobacter}, E. coli ${counts.ecoli}, Listeria ${counts.listeria}, Salmonella ${counts.salmonella} (${updated||'page date unavailable'}). ${incidents.length} open product-level CDC notices ingested.`};
}

function mergeCDC(existing,incoming,checked){
  const oldById=new Map((existing||[]).filter(x=>x?.rawSource==='cdc_content').map(x=>[x.id,x]));
  return incoming.map(item=>{
    const old=oldById.get(item.id),contentHash=hash({...item,updatedAt:null,verifiedAt:null});
    return {...item,firstSeenAt:old?.firstSeenAt||checked,lastObservedAt:checked,updatedAt:old?.cdcContentHash===contentHash?(old.updatedAt||item.updatedAt):checked,cdcContentHash:contentHash,observationCount:(old?.observationCount||0)+1};
  });
}

export async function runCDCRepair(){
  const checked=nowISO(),state=await getState();let health,next=state;
  try{
    const r=await pullCDC(),incidents=mergeCDC(state.incidents,r.incidents,checked);
    health={id:'cdc_content',name:'CDC Current Multistate Foodborne Investigations',family:'Federal',status:'ONLINE',lastChecked:checked,note:r.note,url:CURRENT_URL,recordsRetrieved:incidents.length};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},incidents:[...(state.incidents||[]).filter(x=>x?.rawSource!=='cdc_content'),...incidents],sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }catch(e){
    health={id:'cdc_content',name:'CDC Current Multistate Foodborne Investigations',family:'Federal',status:'DEGRADED',lastChecked:checked,note:String(e?.message||e||'CDC validation failed'),url:CURRENT_URL};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }
  await saveState(next);return health;
}

export default async()=>Response.json(await runCDCRepair(),{headers:{'cache-control':'no-store'}});
export const config={path:'/api/cdc-foodborne-repair'};
