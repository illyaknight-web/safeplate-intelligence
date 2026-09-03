import { getState, saveState } from './lib/store.mjs';
import * as cheerio from 'cheerio';

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const nowISO=()=>new Date().toISOString();
const fetchWithTimeout=async(url,ms=15000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept:'text/html,application/xhtml+xml,*/*;q=0.8','accept-language':'en-US,en;q=0.9','cache-control':'no-cache','user-agent':'Mozilla/5.0 (compatible; SAFEPLATE/1.0; +https://safeplate-intelligence.netlify.app)'}})}finally{clearTimeout(t)}};
const CURRENT_URL='https://www.cdc.gov/foodborne-outbreaks/outbreaks/index.html';

async function pullCDC(){
  const r=await fetchWithTimeout(CURRENT_URL);if(!r.ok)throw new Error(`CDC Current Outbreaks HTTP ${r.status}`);
  const html=await r.text(),$=cheerio.load(html),text=clean($('main').text()||$('body').text());
  const count=(rx)=>Number((text.match(rx)||[])[1]||0);
  const counts={campylobacter:count(/Campylobacter\s*:\s*(\d+)/i),ecoli:count(/E\.?\s*coli\s*:\s*(\d+)/i),listeria:count(/Listeria(?:\s+monocytogenes)?\s*:\s*(\d+)/i),salmonella:count(/Salmonella\s*:\s*(\d+)/i)};
  const total=Object.values(counts).reduce((a,b)=>a+b,0),updated=(text.match(/Last updated:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)||[])[1];
  if(!total)throw new Error('CDC Current Outbreaks page returned no parsable active-investigation counts');
  return {note:`CDC Current Outbreaks page validated; ${total} active multistate investigations — Campylobacter ${counts.campylobacter}, E. coli ${counts.ecoli}, Listeria ${counts.listeria}, Salmonella ${counts.salmonella} (${updated||'page date unavailable'}). Counts are source-health context; no product alert is created until CDC publishes one.`};
}

export async function runCDCRepair(){
  const checked=nowISO(),state=await getState();let health,next=state;
  try{
    const r=await pullCDC();
    health={id:'cdc_content',name:'CDC Current Multistate Foodborne Investigations',family:'Federal',status:'ONLINE',lastChecked:checked,note:r.note,url:CURRENT_URL};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},incidents:(state.incidents||[]).filter(x=>x?.rawSource!=='cdc_content'),sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }catch(e){
    health={id:'cdc_content',name:'CDC Current Multistate Foodborne Investigations',family:'Federal',status:'DEGRADED',lastChecked:checked,note:String(e?.message||e||'CDC validation failed'),url:CURRENT_URL};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }
  await saveState(next);return health;
}

export default async()=>Response.json(await runCDCRepair(),{headers:{'cache-control':'no-store'}});
export const config={path:'/api/cdc-foodborne-repair'};
