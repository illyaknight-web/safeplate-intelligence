import { getState, saveState } from "./lib/store.mjs";
import * as cheerio from "cheerio";
import crypto from "node:crypto";

const SOURCE_IDS=["cdc_content","mn_health_food","wi_health_food"];
const STOP=new Set("food foods outbreak outbreaks recall recalled investigation investigations active warning alert alerts product products linked possible public health illness illnesses case cases current update updated brand brands company official state states multistate detected verified signal signals department agriculture health release releases news consumers people person reported reports reporting affected advisory advice".split(" "));
const HAZARD_STOP=new Set("salmonella listeria coli stec cyclospora botulism ebola hepatitis shigella vibrio".split(" "));
const FOOD_RE=/\b(?:food|outbreak|recall|salmonella|listeria|e\.?\s*coli|stec|cyclospora|botulism|sprout|jalape[nñ]o|moringa|produce|lettuce|fruit|vegetable|dairy|cheese|meat|poultry|egg|seafood|formula|pepper|onion|cucumber|melon|berry|berries)\b/i;
const MONTHS={january:0,february:1,march:2,april:3,may:4,june:5,july:6,august:7,september:8,october:9,november:10,december:11};

const clean=v=>String(v||"").replace(/\s+/g," ").trim();
const hash=v=>crypto.createHash("sha256").update(String(v)).digest("hex").slice(0,20);
async function fetchWithTimeout(url,{accept="text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8",ms=10000}={}){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{signal:c.signal,redirect:"follow",headers:{accept,"accept-language":"en-US,en;q=0.9","cache-control":"no-cache","user-agent":"Mozilla/5.0 (compatible; SAFEPLATE-EarlyWarning/1.0; +https://safeplate-intelligence.netlify.app)"}})}finally{clearTimeout(t)}
}
function sourceDate(text=""){
  const m=clean(text).match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(20\d{2})\b/i);
  if(!m)return null;return new Date(Date.UTC(+m[3],MONTHS[m[1].toLowerCase()],+m[2])).toISOString();
}
function hazard(text=""){
  const t=text.toLowerCase(),a=[];
  if(/e\.?\s*coli|stec/.test(t))a.push("E. coli/STEC");
  if(/salmonella/.test(t))a.push("Salmonella");
  if(/listeria/.test(t))a.push("Listeria");
  if(/cyclospora/.test(t))a.push("Cyclospora");
  if(/botul/.test(t))a.push("Botulism");
  return a.join(" + ")||"Foodborne illness / recall signal";
}
function signal({id,title,summary,source,url,state,postedAt,rawSource}){
  const hz=hazard(`${title} ${summary}`);
  return {id,title,product:title,company:"",hazard:hz,severity:/E\. coli|Listeria|Botul/i.test(hz)?"HIGH":"WATCH",status:"CORROBORATING",category:"Early-warning precursor signal",states:state?[state]:[],distribution:state||"",lat:null,lng:null,source,sourcePostedAt:postedAt,updatedAt:postedAt||new Date().toISOString(),verifiedAt:postedAt||new Date().toISOString(),summary:clean(summary).slice(0,2200),lots:[],evidence:[{type:"AGENCY",status:"VERIFIED",source,text:clean(summary).slice(0,2200),url}],entities:[{id:`event-${id}`,type:"Incident",name:title},...(state?[{id:`geo-${id}`,type:"Geography",name:state}]:[])],links:state?[[`event-${id}`,`geo-${id}`,"reported in"]]:[],workflowStep:1,rawSource,earlyWarningSignal:true};
}

async function pullCDC(){
  const url="https://tools.cdc.gov/api/v2/resources/media?q=foodborne%20outbreak&max=50&sort=-dateModified";
  const r=await fetchWithTimeout(url,{accept:"application/json"}); if(!r.ok)throw new Error(`CDC ${r.status}`);
  const j=await r.json(),rows=[];
  for(const m of (j.results||[])){
    const title=clean(m.name||m.title||m.description||""); if(!title||!FOOD_RE.test(title+" "+clean(m.description)))continue;
    const posted=m.lastUpdatedDate||m.dateModified||m.datePublished||null;
    rows.push(signal({id:`CDC-EW-${m.id||hash(title+posted)}`,title,summary:clean(m.description||m.summary||title),source:"CDC Content Services",url:m.url||"https://tools.cdc.gov/api",state:null,postedAt:posted,rawSource:"cdc_content"}));
  }
  if(!rows.length)throw new Error("CDC early-warning query returned 0 foodborne records");
  return {rows:rows.slice(0,50),note:`${rows.length} CDC foodborne public-health signals retrieved`};
}

async function pullMinnesota(){
  const indexUrl="https://www.health.state.mn.us/news";
  const r=await fetchWithTimeout(indexUrl); if(!r.ok)throw new Error(`Minnesota ${r.status}`);
  const $=cheerio.load(await r.text()),links=[];
  $("a[href*='/news/pressrel/']").each((_,a)=>{const title=clean($(a).text()),href=$(a).attr("href")||"";if(!title||!FOOD_RE.test(title))return;try{links.push({title,url:new URL(href,indexUrl).toString()})}catch{}});
  const unique=[...new Map(links.map(x=>[x.url,x])).values()].slice(0,12);
  const res=await Promise.allSettled(unique.map(async x=>{const rr=await fetchWithTimeout(x.url);if(!rr.ok)throw new Error(String(rr.status));const $$=cheerio.load(await rr.text());const title=clean($$("h1").first().text())||x.title;const body=clean($$("main").text()||$$("body").text());if(!FOOD_RE.test(title+" "+body))return null;return signal({id:`MN-EW-${hash(title+x.url)}`,title,summary:body,source:"Minnesota Department of Health / Agriculture",url:x.url,state:"Minnesota",postedAt:sourceDate(body),rawSource:"mn_health_food"})}));
  const rows=res.filter(x=>x.status==="fulfilled"&&x.value).map(x=>x.value);if(!rows.length)throw new Error("Minnesota parser returned 0 food-safety releases");
  return {rows,note:`${rows.length} Minnesota official food-safety signals retrieved`};
}

async function pullWisconsin(){
  const url="https://www.dhs.wisconsin.gov/outbreaks/index.htm";
  const r=await fetchWithTimeout(url);if(!r.ok)throw new Error(`Wisconsin ${r.status}`);
  const $=cheerio.load(await r.text()),rows=[];
  $("h2").each((_,h)=>{const title=clean($(h).text());if(!title||!FOOD_RE.test(title))return;let text=title,n=$(h).next();while(n.length&&String(n[0]?.tagName||"").toLowerCase()!=="h2"){text+=` ${clean(n.text())}`;n=n.next()}text=clean(text);if(!FOOD_RE.test(text))return;rows.push(signal({id:`WI-EW-${hash(title+url)}`,title,summary:text,source:"Wisconsin Department of Health Services",url,state:"Wisconsin",postedAt:sourceDate(text),rawSource:"wi_health_food"}))});
  if(!rows.length)throw new Error("Wisconsin parser returned 0 food-safety outbreaks");
  return {rows:rows.slice(0,30),note:`${rows.length} Wisconsin official outbreak/recall signals retrieved`};
}

function contentHash(x){const c={...x};delete c.firstSeenAt;delete c.lastObservedAt;delete c.updatedAt;delete c.contentHash;delete c.observationCount;delete c.correlation;delete c.riskScore;delete c.detectionLagMinutes;return hash(JSON.stringify(c))}
function mergeSignals(existing,incoming,now){
  const m=new Map((existing||[]).map(x=>[x.id,x]));let added=0,changed=0,unchanged=0;
  for(const raw of incoming){const h=contentHash(raw),old=m.get(raw.id);if(!old){m.set(raw.id,{...raw,firstSeenAt:now,lastObservedAt:now,contentHash:h,observationCount:1});added++;continue}if(old.contentHash===h){m.set(raw.id,{...old,lastObservedAt:now,observationCount:(old.observationCount||1)+1});unchanged++}else{m.set(raw.id,{...old,...raw,firstSeenAt:old.firstSeenAt||now,lastObservedAt:now,updatedAt:now,contentHash:h,observationCount:(old.observationCount||1)+1});changed++}}
  return {items:[...m.values()].sort((a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0)).slice(0,1200),added,changed,unchanged};
}
function toks(v="",excludeHazards=false){return new Set(clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").split(/\s+/).filter(x=>x.length>=4&&!STOP.has(x)&&(!excludeHazards||!HAZARD_STOP.has(x))))}
function ov(a,b){let n=0;for(const x of a)if(b.has(x))n++;return n}
function srcClass(x){const s=String(x.source||"").toLowerCase();if(/fda|cdc|usda|fsis/.test(s))return"federal";if(/minnesota|wisconsin|department|county|city/.test(s))return"state-local";if(/trader|retailer|supplier|manufacturer|whole foods|walmart|kroger/.test(s))return"industry";return"other"}
function correlate(items,now){
  const rows=(items||[]).filter(x=>!x.contextOnly).map(x=>({x,p:toks(`${x.product||""} ${x.title||""}`,true),h:toks(x.hazard||""),c:toks(x.company||"")}));
  const parent=rows.map((_,i)=>i);const find=i=>parent[i]===i?i:(parent[i]=find(parent[i]));const join=(a,b)=>{a=find(a);b=find(b);if(a!==b)parent[b]=a};
  const index=new Map();rows.forEach((r,i)=>{for(const t of r.p){if(!index.has(t))index.set(t,[]);index.get(t).push(i)}});
  const pairs=new Set();for(const ids of index.values()){if(ids.length>80)continue;for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++)pairs.add(`${ids[a]}:${ids[b]}`)}
  for(const pair of pairs){const [i,j]=pair.split(":").map(Number),a=rows[i],b=rows[j];if(a.x.source===b.x.source)continue;const po=ov(a.p,b.p),ho=ov(a.h,b.h),co=ov(a.c,b.c);if((po>=2&&ho>=1)||(po>=1&&ho>=1&&srcClass(a.x)!==srcClass(b.x))||(co>=1&&po>=1))join(i,j)}
  const groups=new Map();rows.forEach((r,i)=>{const root=find(i);if(!groups.has(root))groups.set(root,[]);groups.get(root).push(r.x)});
  const byId=new Map(),clusters=[];
  for(const members of groups.values()){
    const sources=[...new Set(members.map(x=>x.source).filter(Boolean))];if(sources.length<2)continue;
    const federal=members.filter(x=>srcClass(x)==="federal"),classes=[...new Set(members.map(srcClass))];
    const signalDates=members.map(x=>x.sourcePostedAt).filter(Boolean).sort(),seenDates=members.map(x=>x.firstSeenAt).filter(Boolean).sort(),federalDates=federal.map(x=>x.sourcePostedAt).filter(Boolean).sort();
    const firstSignal=signalDates[0]||null,firstSeen=seenDates[0]||null,federalAt=federalDates[0]||null;
    const clusterId=`CORR-${hash(members.map(x=>x.id).sort().join("|"))}`;
    const confidence=federal.length&&sources.length>=2?"HIGH":sources.length>=3?"HIGH":"MEDIUM";
    const confirmation=federal.length?"OFFICIAL_CONFIRMATION":"MULTI_SOURCE_CORROBORATION";
    const precursorLeadMinutes=firstSignal&&federalAt?Math.round((new Date(federalAt)-new Date(firstSignal))/60000):null;
    const timeline=members.map(x=>({id:x.id,title:x.title,source:x.source,sourcePostedAt:x.sourcePostedAt||null,firstSeenAt:x.firstSeenAt||null,status:x.status})).sort((a,b)=>new Date(a.sourcePostedAt||a.firstSeenAt||0)-new Date(b.sourcePostedAt||b.firstSeenAt||0));
    const cluster={clusterId,confidence,confirmation,independentSourceCount:sources.length,sources,sourceClasses:classes,firstSignalAt:firstSignal,safeplateFirstSeenAt:firstSeen,federalConfirmationAt:federalAt,precursorLeadMinutes,timeline,memberIds:members.map(x=>x.id),updatedAt:now};clusters.push(cluster);members.forEach(x=>byId.set(x.id,cluster));
  }
  const out=items.map(x=>{const c=byId.get(x.id),d=x.firstSeenAt&&x.sourcePostedAt?Math.round((new Date(x.firstSeenAt)-new Date(x.sourcePostedAt))/60000):null;if(!c)return {...x,detectionLagMinutes:d};const base=x.severity==="CRITICAL"?85:x.severity==="HIGH"?70:x.severity==="WATCH"?50:30;const riskScore=Math.min(100,base+Math.min(15,(c.independentSourceCount-1)*5)+(c.confirmation==="OFFICIAL_CONFIRMATION"?10:0));return {...x,detectionLagMinutes:d,riskScore,correlation:{clusterId:c.clusterId,confidence:c.confidence,confirmation:c.confirmation,independentSourceCount:c.independentSourceCount,sources:c.sources,firstSignalAt:c.firstSignalAt,safeplateFirstSeenAt:c.safeplateFirstSeenAt,federalConfirmationAt:c.federalConfirmationAt,precursorLeadMinutes:c.precursorLeadMinutes}}});
  return {items:out,clusters:clusters.sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt)).slice(0,250)};
}

export async function runEarlyWarning(){
  const state=await getState(),now=new Date().toISOString();
  const jobs=[{id:"cdc_content",name:"CDC Content Services",fn:pullCDC},{id:"mn_health_food",name:"Minnesota Health + Agriculture",fn:pullMinnesota},{id:"wi_health_food",name:"Wisconsin DHS",fn:pullWisconsin}];
  const results=await Promise.allSettled(jobs.map(x=>x.fn()));let incoming=[],events=[];
  const health=[...(state.sourceHealth||[])];
  for(let i=0;i<jobs.length;i++){
    const job=jobs[i],res=results[i];let h=health.find(x=>x.id===job.id);if(!h){h={id:job.id,name:job.name,family:job.id==="cdc_content"?"Federal":"State / Local",status:"PENDING",lastChecked:null,note:"Early-warning connector"};health.push(h)}h.lastChecked=now;
    if(res.status==="fulfilled"){h.status="ONLINE";h.note=res.value.note;incoming.push(...res.value.rows);events.push({time:now,title:`Early-warning source checked — ${job.name}`,detail:h.note})}else{h.status="DEGRADED";h.note=String(res.reason?.message||res.reason||"Unknown error");events.push({time:now,title:`EARLY-WARNING SOURCE DEGRADED — ${job.name}`,detail:h.note})}
  }
  const merged=mergeSignals(state.incidents||[],incoming,now),corr=correlate(merged.items,now);
  const next={...state,meta:{...(state.meta||{}),earlyWarningLastSync:now,earlyWarningCycleMinutes:30},incidents:corr.items,investigations:corr.clusters,sourceHealth:health,changes:[{time:now,title:"Early-warning correlation cycle complete",detail:`${incoming.length} precursor records processed · ${merged.added} new · ${merged.changed} changed · ${corr.clusters.length} multi-source clusters.`},...events,...(state.changes||[])].slice(0,300)};
  await saveState(next);return next;
}

export default async()=>{await runEarlyWarning()}
export const config={schedule:"1,31 * * * *"};
