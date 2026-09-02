import { getState, saveState } from './lib/store.mjs';
import { fingerprint } from './lib/normalize.mjs';

const clean=v=>String(v||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
const nowISO=()=>new Date().toISOString();
const fetchWithTimeout=async(url,ms=15000)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);try{return await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept:'application/json','user-agent':'SAFEPLATE/1.0 (+https://safeplate-intelligence.netlify.app)'}})}finally{clearTimeout(t)}};
const rawRows=j=>Array.isArray(j?.results)?j.results:Array.isArray(j?.results?.items)?j.results.items:Array.isArray(j?.items)?j.items:Array.isArray(j?.data)?j.data:Array.isArray(j?.data?.results)?j.data.results:[];
const FOOD_RX=/foodborne|food safety|salmonella|listeria|e\.?\s*coli|norovirus|botulis|cyclospora|outbreak|recall/i;

async function pullCDC(){
  const queries=['foodborne outbreak','food safety outbreak','salmonella food','listeria food','E. coli food'];
  const found=new Map(),notes=[];
  for(const q of queries){
    const url=`https://tools.cdc.gov/api/v2/resources/media?q=${encodeURIComponent(q)}&max=75`;
    const r=await fetchWithTimeout(url);if(!r.ok){notes.push(`${q}: HTTP ${r.status}`);continue}
    const j=await r.json(),rows=rawRows(j);notes.push(`${q}: ${rows.length}`);
    for(const m of rows){
      const title=clean(m.name||m.title||m.description||''),summary=clean(m.description||m.summary||m.body||title),text=`${title} ${summary}`;
      if(!title||!FOOD_RX.test(text))continue;
      const id=`CDC-${m.id||fingerprint([title,m.lastUpdatedDate||m.datePublished||m.url])}`;
      found.set(id,{id,title,product:'Not yet resolved',company:'',hazard:'Foodborne outbreak / public-health signal',severity:'WATCH',status:'DETECTED',category:'CDC public-health signal',states:[],distribution:'',origin:null,source:'CDC Content Services',sourcePostedAt:m.lastUpdatedDate||m.datePublished||null,updatedAt:m.lastUpdatedDate||m.datePublished||nowISO(),verifiedAt:null,summary,lots:[],evidence:[{type:'AGENCY',status:'DETECTED',source:'CDC Content Services',text:summary,url:m.sourceUrl||m.targetUrl||m.url||'https://tools.cdc.gov/api'}],entities:[{id:`event-${id}`,type:'Incident',name:title}],links:[],workflowStep:1,rawSource:'cdc_content'});
    }
  }
  if(!found.size)throw new Error(`CDC multi-query validation returned zero usable foodborne records (${notes.join('; ')})`);
  return {rows:[...found.values()].slice(0,120),note:`${found.size} usable CDC foodborne/public-health records retrieved using multiple bounded queries (${notes.join('; ')})`};
}
function merge(existing,incoming,now){const m=new Map((existing||[]).map(x=>[x.id,x]));for(const x of incoming){const old=m.get(x.id);m.set(x.id,old?{...old,...x,firstSeenAt:old.firstSeenAt||now,lastObservedAt:now,observationCount:(old.observationCount||1)+1}:{...x,firstSeenAt:now,lastObservedAt:now,observationCount:1})}return [...m.values()].sort((a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0)).slice(0,1800)}

export default async()=>{
  const checked=nowISO(),state=await getState();let health,next=state;
  try{
    const r=await pullCDC();
    health={id:'cdc_content',name:'CDC Content Services — Public Foodborne Content',family:'Federal',status:'ONLINE',lastChecked:checked,note:r.note};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},incidents:merge(state.incidents||[],r.rows,checked),sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }catch(e){
    health={id:'cdc_content',name:'CDC Content Services — Public Foodborne Content',family:'Federal',status:'DEGRADED',lastChecked:checked,note:String(e?.message||e||'CDC validation failed')};
    next={...state,meta:{...(state.meta||{}),cdcRepairLastSync:checked},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='cdc_content'),health]};
  }
  await saveState(next);return Response.json(health,{headers:{'cache-control':'no-store'}});
};

export const config={path:'/api/cdc-foodborne-repair',schedule:'9,39 * * * *'};
