import { getState, saveState } from './lib/store.mjs';

const nowISO=()=>new Date().toISOString();
const fetchWithTimeout=async(url,ms=15000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept:'application/json','user-agent':'SAFEPLATE/1.0 (+https://safeplate-intelligence.netlify.app)'}})}finally{clearTimeout(t)}};

async function pullNASS(){
  const key=Netlify.env.get('USDA_NASS_API_KEY');
  if(!key)throw new Error('USDA_NASS_API_KEY is not configured');
  const params=new URLSearchParams({key,commodity_desc:'BLUEBERRIES',agg_level_desc:'STATE',year__GE:String(new Date().getUTCFullYear()-2),format:'JSON'});
  const r=await fetchWithTimeout(`https://quickstats.nass.usda.gov/api/api_GET/?${params}`);if(!r.ok)throw new Error(`USDA NASS Quick Stats HTTP ${r.status}`);
  const j=await r.json(),rows=Array.isArray(j?.data)?j.data:[];
  if(!rows.length)throw new Error('USDA NASS Quick Stats returned zero validation records');
  return {count:rows.length,states:[...new Set(rows.map(x=>x.state_name||x.state_alpha).filter(Boolean))].slice(0,60)};
}

export async function runNassContext(){
  const checked=nowISO(),state=await getState();let item;
  try{
    const r=await pullNASS();
    item={id:'usda_nass_quickstats',name:'USDA NASS Quick Stats',family:'Farms / Growing Regions',status:'ONLINE',lastChecked:checked,note:`Authenticated production connection; ${r.count} bounded blueberry/state production-context records validated across ${r.states.length} states/areas. Agricultural context only — not contamination evidence.`};
    await saveState({...state,meta:{...(state.meta||{}),nassLastSync:checked,nassContextRecordCount:r.count,nassContextStates:r.states},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='usda_nass_quickstats'),item]});
  }catch(e){
    item={id:'usda_nass_quickstats',name:'USDA NASS Quick Stats',family:'Farms / Growing Regions',status:'DEGRADED',lastChecked:checked,note:String(e?.message||e||'NASS validation failed')};
    await saveState({...state,meta:{...(state.meta||{}),nassLastSync:checked},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='usda_nass_quickstats'),item]});
  }
  return item;
}

export default async()=>Response.json(await runNassContext(),{headers:{'cache-control':'no-store'}});
export const config={path:'/api/nass-context'};
