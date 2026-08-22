import { getState, saveState } from "./lib/store.mjs";
import * as cheerio from "cheerio";
import crypto from "node:crypto";

const STATES=["Alabama","Alaska","Arizona","Arkansas","California","Colorado","Connecticut","Delaware","District of Columbia","Florida","Georgia","Hawaii","Idaho","Illinois","Indiana","Iowa","Kansas","Kentucky","Louisiana","Maine","Maryland","Massachusetts","Michigan","Minnesota","Mississippi","Missouri","Montana","Nebraska","Nevada","New Hampshire","New Jersey","New Mexico","New York","North Carolina","North Dakota","Ohio","Oklahoma","Oregon","Pennsylvania","Rhode Island","South Carolina","South Dakota","Tennessee","Texas","Utah","Vermont","Virginia","Washington","West Virginia","Wisconsin","Wyoming"];
const DIRECTORY="https://www.usa.gov/state-health";
const FOOD_RE=/\b(?:food|foods|foodborne|outbreak|recall|recalled|salmonella|listeria|e\.?\s*coli|stec|cyclospora|botul|sprout|jalape[nñ]o|produce|lettuce|fruit|vegetable|dairy|cheese|meat|poultry|egg|seafood|formula|pepper|onion|cucumber|melon|berry|berries|contaminat|illness|advisory)\b/i;
const NEWS_RE=/\b(?:news|press|media|alerts?|advisories|outbreaks?|recalls?|food\s*safety)\b/i;
const STOP=new Set("food foods foodborne outbreak outbreaks recall recalled investigation investigations active warning alert alerts product products linked possible public health illness illnesses case cases current update updated brand brands company official state states multistate detected verified signal signals department agriculture health release releases news consumers people person reported reports reporting affected advisory advice".split(" "));
const HAZARD_STOP=new Set("salmonella listeria coli stec cyclospora botulism ebola hepatitis shigella vibrio".split(" "));
const MONTHS={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};

const clean=v=>String(v||"").replace(/\s+/g," ").trim();
const hash=v=>crypto.createHash("sha256").update(String(v)).digest("hex").slice(0,20);
const slug=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");
async function f(url,ms=5500){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{signal:c.signal,redirect:"follow",headers:{accept:"text/html,application/xhtml+xml,*/*;q=0.8","accept-language":"en-US,en;q=0.9","cache-control":"no-cache","user-agent":"Mozilla/5.0 (compatible; SAFEPLATE-StateScan/1.0; +https://safeplate-intelligence.netlify.app)"}})}finally{clearTimeout(t)}
}
function dateFromText(text=""){
  const s=clean(text);
  let m=s.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/i);
  if(m)return new Date(Date.UTC(+m[3],MONTHS[m[1].toLowerCase()],+m[2])).toISOString();
  m=s.match(/\b(\d{1,2})\/(\d{1,2})\/(20\d{2})\b/);
  if(m)return new Date(Date.UTC(+m[3],+m[1]-1,+m[2])).toISOString();
  return null;
}
function hazard(text=""){
  const t=text.toLowerCase(),a=[];
  if(/e\.?\s*coli|stec/.test(t))a.push("E. coli/STEC");
  if(/salmonella/.test(t))a.push("Salmonella");
  if(/listeria/.test(t))a.push("Listeria");
  if(/cyclospora/.test(t))a.push("Cyclospora");
  if(/botul/.test(t))a.push("Botulism");
  return a.join(" + ")||"Food-safety signal";
}
function signalRow({state,title,url,context,sourcePostedAt}){
  const id=`STATE-${slug(state).toUpperCase()}-${hash(title+url)}`;
  const hz=hazard(`${title} ${context}`);
  return {id,title,product:title,company:"",hazard:hz,severity:/E\. coli|Listeria|Botul/i.test(hz)?"HIGH":"WATCH",status:"CORROBORATING",category:"State public-health precursor signal",states:[state],distribution:state,lat:null,lng:null,source:`${state} public health authority`,sourcePostedAt:sourcePostedAt||null,updatedAt:sourcePostedAt||new Date().toISOString(),verifiedAt:sourcePostedAt||null,summary:clean(context||title).slice(0,1800),lots:[],evidence:[{type:"AGENCY",status:"DETECTED",source:`${state} public health authority`,text:clean(context||title).slice(0,1800),url}],entities:[{id:`event-${id}`,type:"Incident",name:title},{id:`geo-${id}`,type:"Geography",name:state}],links:[[ `event-${id}`,`geo-${id}`,"reported in"]],workflowStep:1,rawSource:`state_${slug(state)}`,earlyWarningSignal:true};
}
function extractSignals(html,base,state){
  const $=cheerio.load(html),out=[];
  $("a[href]").each((_,a)=>{
    const title=clean($(a).text()); if(title.length<8||title.length>240||!FOOD_RE.test(title))return;
    let url;try{url=new URL($(a).attr("href"),base).toString()}catch{return}
    if(!/^https?:/i.test(url))return;
    const parent=clean($(a).parent().text());
    out.push(signalRow({state,title,url,context:parent||title,sourcePostedAt:dateFromText(parent)}));
  });
  return [...new Map(out.map(x=>[x.id,x])).values()].slice(0,12);
}
function findNewsUrl(html,base){
  const $=cheerio.load(html),c=[];
  $("a[href]").each((_,a)=>{
    const text=clean($(a).text()),href=$(a).attr("href")||"";
    if(!NEWS_RE.test(`${text} ${href}`))return;
    try{const u=new URL(href,base);if(u.protocol.startsWith("http"))c.push({url:u.toString(),score:(/outbreak|recall|food/i.test(`${text} ${href}`)?3:0)+(/news|press|alert/i.test(`${text} ${href}`)?1:0)})}catch{}
  });
  c.sort((a,b)=>b.score-a.score);return c[0]?.url||null;
}
function findOfficialUrl(html,base){
  const $=cheerio.load(html),baseHost=new URL(base).hostname,c=[];
  $("a[href]").each((_,a)=>{
    const text=clean($(a).text()),href=$(a).attr("href")||"";
    try{
      const u=new URL(href,base); if(!/^https?:$/.test(u.protocol)||u.hostname===baseHost)return;
      if(/facebook|twitter|x\.com|instagram|youtube|linkedin/i.test(u.hostname))return;
      const score=(/health|public health|department/i.test(text)?4:0)+(/\.gov$|\.gov\//i.test(u.hostname+u.pathname)?3:0)+(/health/i.test(u.hostname)?2:0);
      c.push({url:u.toString(),score});
    }catch{}
  });
  c.sort((a,b)=>b.score-a.score);return c[0]?.url||null;
}
async function discoverDirectory(){
  const r=await f(DIRECTORY,6500);if(!r.ok)throw new Error(`USAGov state-health directory ${r.status}`);
  const html=await r.text(),$=cheerio.load(html),map=new Map();
  $("a[href]").each((_,a)=>{
    const text=clean($(a).text());
    const state=STATES.find(s=>s.toLowerCase()===text.toLowerCase());if(!state)return;
    try{map.set(state,new URL($(a).attr("href"),DIRECTORY).toString())}catch{}
  });
  return map;
}
async function scanState(state,directoryUrl){
  const started=Date.now();
  try{
    if(!directoryUrl)throw new Error("State link not found in USAGov directory");
    const dr=await f(directoryUrl);if(!dr.ok)throw new Error(`directory detail ${dr.status}`);
    const dh=await dr.text();
    const official=findOfficialUrl(dh,directoryUrl)||directoryUrl;
    const ar=await f(official);if(!ar.ok)throw new Error(`official health page ${ar.status}`);
    const ah=await ar.text();let rows=extractSignals(ah,official,state);
    const news=findNewsUrl(ah,official);
    if(news&&news!==official){
      try{const nr=await f(news,4000);if(nr.ok)rows=[...rows,...extractSignals(await nr.text(),news,state)]}catch{}
    }
    rows=[...new Map(rows.map(x=>[x.id,x])).values()].slice(0,18);
    return {state,id:`state_${slug(state)}`,status:"ONLINE",officialUrl:official,signals:rows,note:`${rows.length} current food-safety link signals surfaced`,durationMs:Date.now()-started};
  }catch(e){return {state,id:`state_${slug(state)}`,status:"DEGRADED",officialUrl:null,signals:[],note:String(e?.message||e),durationMs:Date.now()-started}}
}
function merge(existing,incoming,now){
  const m=new Map((existing||[]).map(x=>[x.id,x]));let added=0,changed=0,unchanged=0;
  for(const raw of incoming){const h=hash(JSON.stringify({...raw,firstSeenAt:undefined,lastObservedAt:undefined,updatedAt:undefined,contentHash:undefined,observationCount:undefined,correlation:undefined,riskScore:undefined,detectionLagMinutes:undefined})),old=m.get(raw.id);
    if(!old){m.set(raw.id,{...raw,firstSeenAt:now,lastObservedAt:now,contentHash:h,observationCount:1});added++;continue}
    if(old.contentHash===h){m.set(raw.id,{...old,lastObservedAt:now,observationCount:(old.observationCount||1)+1});unchanged++}
    else{m.set(raw.id,{...old,...raw,firstSeenAt:old.firstSeenAt||now,lastObservedAt:now,updatedAt:now,contentHash:h,observationCount:(old.observationCount||1)+1});changed++}
  }
  return {items:[...m.values()].sort((a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0)).slice(0,1600),added,changed,unchanged};
}
function toks(v="",excludeHazards=false){return new Set(clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=4&&!STOP.has(x)&&(!excludeHazards||!HAZARD_STOP.has(x))))}
function ov(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n}
function srcClass(x){const s=String(x.source||"").toLowerCase();if(/fda|cdc|usda|fsis/.test(s))return"federal";if(/public health authority|minnesota|wisconsin|department|county|city/.test(s))return"state-local";if(/trader|retailer|supplier|manufacturer|whole foods|walmart|kroger/.test(s))return"industry";return"other"}
function correlate(items,now){
  const rows=(items||[]).filter(x=>!x.contextOnly).map(x=>({x,p:toks(`${x.product||""} ${x.title||""}`,true),h:toks(x.hazard||""),c:toks(x.company||"")}));
  const parent=rows.map((_,i)=>i),find=i=>parent[i]===i?i:(parent[i]=find(parent[i])),join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const index=new Map();rows.forEach((r,i)=>{for(const t of r.p){if(!index.has(t))index.set(t,[]);index.get(t).push(i)}});
  const pairs=new Set();for(const ids of index.values()){if(ids.length>100)continue;for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)pairs.add(`${ids[a]}:${ids[b]}`)}
  for(const pair of pairs){const [i,j]=pair.split(":").map(Number),a=rows[i],b=rows[j];if(a.x.source===b.x.source)continue;const po=ov(a.p,b.p),ho=ov(a.h,b.h),co=ov(a.c,b.c);if((po>=2&&ho>=1)||(po>=1&&ho>=1&&srcClass(a.x)!==srcClass(b.x))||(co>=1&&po>=1))join(i,j)}
  const groups=new Map();rows.forEach((r,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(r.x)}),byId=new Map(),clusters=[];
  for(const members of groups.values()){
    const sources=[...new Set(members.map(x=>x.source).filter(Boolean))];if(sources.length<2)continue;
    const federal=members.filter(x=>srcClass(x)==="federal"),classes=[...new Set(members.map(srcClass))];
    const signalDates=members.map(x=>x.sourcePostedAt).filter(Boolean).sort(),seenDates=members.map(x=>x.firstSeenAt).filter(Boolean).sort(),federalDates=federal.map(x=>x.sourcePostedAt).filter(Boolean).sort();
    const firstSignal=signalDates[0]||null,firstSeen=seenDates[0]||null,federalAt=federalDates[0]||null,clusterId=`CORR-${hash(members.map(x=>x.id).sort().join("|"))}`;
    const confidence=federal.length&&sources.length>=2?"HIGH":sources.length>=3?"HIGH":"MEDIUM",confirmation=federal.length?"OFFICIAL_CONFIRMATION":"MULTI_SOURCE_CORROBORATION",precursorLeadMinutes=firstSignal&&federalAt?Math.round((new Date(federalAt)-new Date(firstSignal))/60000):null;
    const timeline=members.map(x=>({id:x.id,title:x.title,source:x.source,sourcePostedAt:x.sourcePostedAt||null,firstSeenAt:x.firstSeenAt||null,status:x.status})).sort((a,b)=>new Date(a.sourcePostedAt||a.firstSeenAt||0)-new Date(b.sourcePostedAt||b.firstSeenAt||0));
    const cluster={clusterId,confidence,confirmation,independentSourceCount:sources.length,sources,sourceClasses:classes,firstSignalAt:firstSignal,safeplateFirstSeenAt:firstSeen,federalConfirmationAt:federalAt,precursorLeadMinutes,timeline,memberIds:members.map(x=>x.id),updatedAt:now};clusters.push(cluster);members.forEach(x=>byId.set(x.id,cluster));
  }
  const out=items.map(x=>{const c=byId.get(x.id),d=x.firstSeenAt&&x.sourcePostedAt?Math.round((new Date(x.firstSeenAt)-new Date(x.sourcePostedAt))/60000):null;if(!c)return {...x,detectionLagMinutes:d};const base=x.severity==="CRITICAL"?85:x.severity==="HIGH"?70:x.severity==="WATCH"?50:30;return {...x,detectionLagMinutes:d,riskScore:Math.min(100,base+Math.min(15,(c.independentSourceCount-1)*5)+(c.confirmation==="OFFICIAL_CONFIRMATION"?10:0)),correlation:{clusterId:c.clusterId,confidence:c.confidence,confirmation:c.confirmation,independentSourceCount:c.independentSourceCount,sources:c.sources,firstSignalAt:c.firstSignalAt,safeplateFirstSeenAt:c.safeplateFirstSeenAt,federalConfirmationAt:c.federalConfirmationAt,precursorLeadMinutes:c.precursorLeadMinutes}}});
  return {items:out,clusters:clusters.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,350)};
}

export async function runStateScan(){
  const state=await getState(),now=new Date().toISOString();
  let directory;
  try{directory=await discoverDirectory()}catch(e){directory=new Map()}
  const results=await Promise.all(STATES.map(s=>scanState(s,directory.get(s))));
  const incoming=results.flatMap(x=>x.signals),merged=merge(state.incidents||[],incoming,now),corr=correlate(merged.items,now);
  const health=[...(state.sourceHealth||[]).filter(x=>!String(x.id||"").startsWith("state_"))];
  for(const r of results)health.push({id:r.id,name:`${r.state} state public-health scan`,family:"State / Local",status:r.status,lastChecked:now,note:r.note,url:r.officialUrl});
  const online=results.filter(x=>x.status==="ONLINE").length,degraded=results.length-online;
  const coverage={total:STATES.length,checked:results.length,online,degraded,lastSync:now,signals:incoming.length,states:results.map(({state,status,note,officialUrl,durationMs})=>({state,status,note,officialUrl,durationMs}))};
  const next={...state,meta:{...(state.meta||{}),stateScanLastSync:now,stateScanCycleMinutes:30},incidents:corr.items,investigations:corr.clusters,sourceHealth:health,stateCoverage:coverage,changes:[{time:now,title:"51-jurisdiction state surveillance cycle complete",detail:`${online}/${STATES.length} state/DC surfaces online · ${degraded} degraded · ${incoming.length} state signals · ${corr.clusters.length} correlated investigations.`},...(state.changes||[])].slice(0,350)};
  await saveState(next);return next;
}

export default async()=>{await runStateScan()}
export const config={schedule:"3,33 * * * *"};
