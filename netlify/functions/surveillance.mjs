
import { getState,saveState } from "./lib/store.mjs";
import { SOURCE_REGISTRY } from "./lib/sources.mjs";
import { normalizeFDA,normalizeFSIS,fingerprint } from "./lib/normalize.mjs";
import * as cheerio from "cheerio";
import crypto from "node:crypto";

const MAX_SOURCE_MS = 10000;

const timeoutFetch=async(url,{ms=MAX_SOURCE_MS,accept="application/json",headers={}}={})=>{
 const c=new AbortController();const t=setTimeout(()=>c.abort(),ms);
 try{
   return await fetch(url,{
     signal:c.signal,redirect:"follow",
     headers:{
       "accept":accept,
       "accept-language":"en-US,en;q=0.9",
       "cache-control":"no-cache",
       "pragma":"no-cache",
       "user-agent":"Mozilla/5.0 (compatible; SAFEPLATE/0.35.13; +https://safeplate-intelligence.netlify.app)",
       ...headers
     }
   });
 } finally { clearTimeout(t) }
};

async function firstSuccessfulFetch(urls,options={}){
 let lastStatus=null,lastUrl=null;
 for(const url of urls){
   lastUrl=url;
   const r=await timeoutFetch(url,options);
   if(r.ok)return {response:r,url};
   lastStatus=r.status;
 }
 throw new Error(`Official source unavailable ${lastStatus||"unknown"} at ${lastUrl||"unknown URL"}`);
}

const newest=(a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0);
const stableHash=(obj)=>crypto.createHash("sha256").update(JSON.stringify(obj)).digest("hex").slice(0,24);
const sourceDateToISO=(v)=>{
  if(!v)return null;
  const s=String(v).trim();
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return new Date(Date.UTC(+m[3],+m[1]-1,+m[2])).toISOString();
  const d=new Date(s);return Number.isNaN(d.getTime())?null:d.toISOString();
};

function contentForHash(x){
  const clone={...x};
  delete clone.firstSeenAt;delete clone.lastObservedAt;delete clone.updatedAt;
  delete clone.contentHash;delete clone.observationCount;
  return clone;
}

function merge(existing,incoming,now,successfulSources){
 const m=new Map((existing||[]).map(x=>[x.id,x]));
 let added=0,changed=0,unchanged=0;

 for(const raw of incoming){
   const incomingHash=stableHash(contentForHash(raw));
   const old=m.get(raw.id);
   if(!old){
     m.set(raw.id,{
       ...raw,
       firstSeenAt:now,lastObservedAt:now,updatedAt:raw.updatedAt||now,
       contentHash:incomingHash,observationCount:1
     });
     added++;
     continue;
   }
   if(old.contentHash===incomingHash){
     m.set(raw.id,{
       ...old,
       lastObservedAt:now,
       observationCount:(old.observationCount||1)+1
     });
     unchanged++;
   } else {
     m.set(raw.id,{
       ...old,...raw,
       firstSeenAt:old.firstSeenAt||now,
       lastObservedAt:now,
       updatedAt:now,
       contentHash:incomingHash,
       observationCount:(old.observationCount||1)+1
     });
     changed++;
   }
 }

 // FDA active-outbreak board is an authoritative ACTIVE table.
 // If a previously-active FDA outbreak disappears after a successful board fetch,
 // mark it resolved rather than leaving it CORROBORATING forever.
 if(successfulSources.has("fda_outbreaks")){
   const liveIds=new Set(incoming.filter(x=>x.rawSource==="fda_outbreaks").map(x=>x.id));
   for(const [id,old] of m){
     if(old.rawSource==="fda_outbreaks" && !liveIds.has(id) && old.status!=="RESOLVED"){
       m.set(id,{
         ...old,status:"RESOLVED",updatedAt:now,
         evidence:[...(old.evidence||[]),{
           type:"AGENCY",status:"RESOLVED",source:"SAFEPLATE source reconciliation",
           text:"Record is no longer present in FDA's active-investigations table after a successful source check.",
           url:"https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks"
         }]
       });
       changed++;
     }
   }
 }

 return {items:[...m.values()].sort(newest).slice(0,1200),added,changed,unchanged};
}

async function pullFDA(){
 const configuredKey=globalThis.Netlify?.env?.get?.("FDA_API_KEY")||process.env.FDA_API_KEY||"";
 const key=configuredKey?`&api_key=${encodeURIComponent(configuredKey)}`:"";
 const url=`https://api.fda.gov/food/enforcement.json?limit=100&search=status:%22Ongoing%22${key}`;
 const r=await timeoutFetch(url,{accept:"application/json"});
 if(!r.ok)throw new Error(`FDA ${r.status}`);
 const j=await r.json();
 return (j.results||[]).map(normalizeFDA);
}

async function pullFSIS(){
 const apiUrl="https://www.fsis.usda.gov/fsis/api/recall/v/1";
 try{
   const api=await timeoutFetch(apiUrl,{accept:"application/json,text/plain;q=0.9,*/*;q=0.8",headers:{referer:"https://www.fsis.usda.gov/science-data/developer-resources/recall-api"}});
   if(api.ok){
     const j=await api.json();
     const rows=Array.isArray(j)?j:(j.results||j.data||j.rows||[]);
     const normalized=rows.slice(0,300).map(normalizeFSIS);
     if(normalized.length)return {rows:normalized,note:`${normalized.length} records retrieved directly from official FSIS Recall API`};
   }
 }catch(e){}

 const bridgeUrl="https://raw.githubusercontent.com/illyaknight-web/safeplate-intelligence/safeplate-command-center-staging/data/fsis-recalls.json";
 const bridge=await timeoutFetch(bridgeUrl,{accept:"application/json",ms:15000});
 if(!bridge.ok)throw new Error(`FSIS direct source blocked and authoritative bridge ${bridge.status}`);
 const payload=await bridge.json();
 const raw=Array.isArray(payload)?payload:(payload.records||[]);
 // GovDelivery's broad FSIS news feed can include non-recall press releases.
 // Only treat actual recalls/public-health alerts as FSIS incident records.
 const recallRows=raw.filter(x=>/\b(?:recall|public health alert)\b/i.test(`${x?.field_title||x?.title||""} ${x?.field_reason_for_recall||x?.description||""}`));
 const normalized=recallRows.slice(0,300).map(normalizeFSIS);
 if(!normalized.length)throw new Error("FSIS authoritative bridge returned 0 recall/public-health-alert records");
 const capturedAt=Array.isArray(payload)?null:payload.capturedAt;
 const sourceType=Array.isArray(payload)?"USDA/FSIS bridge":(payload.sourceType||"USDA/FSIS authoritative publication bridge");
 return {rows:normalized,note:`${normalized.length} recall/public-health-alert records from ${sourceType}${capturedAt?` (captured ${capturedAt})`:""}`};
}
function cleanText(v=""){return String(v).replace(/\s+/g," ").trim()}
function sevForOutbreak(pathogen="",cases=0){
 const p=pathogen.toLowerCase();
 if(/listeria|botulinum|e\.?\s*coli/.test(p)||cases>=100)return"HIGH";
 if(/salmonella|cyclospora/.test(p)||cases>=25)return"WATCH";
 return"EMERGING";
}

async function pullFDAOutbreaks(){
 const canonical="https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks";
 const {response:r,url}=await firstSuccessfulFetch([
   canonical,
   `${canonical}?utm_source=safeplate`,
   `${canonical}/`
 ],{accept:"text/html,application/xhtml+xml,*/*;q=0.8",headers:{referer:"https://www.fda.gov/food/outbreaks-foodborne-illness"}});
 const html=await r.text(),$=cheerio.load(html),rows=[];

 $("table tbody tr").each((_,tr)=>{
   const tds=$(tr).find("td").map((__,td)=>cleanText($(td).text())).get();
   if(tds.length<7)return;
   const [datePosted,ref,pathogen,product,caseCount,investigationStatus,eventStatus,recall,traceback,inspection,sampling]=tds;
   if(!/^Active$/i.test(investigationStatus||""))return;

   const cases=parseInt((caseCount||"").replace(/[^\d]/g,""),10)||0;
   const id=`FDA-OUTBREAK-${ref||fingerprint([datePosted,pathogen,product])}`;
   const sourcePostedAt=sourceDateToISO(datePosted);
   const status=/ongoing/i.test(eventStatus||"")?"CORROBORATING":"RESOLVED";
   const summary=`FDA active outbreak investigation. Product: ${product||"Not yet identified"}. Cases: ${caseCount||"not stated"}. Traceback: ${traceback||"—"}; Inspection: ${inspection||"—"}; Sampling: ${sampling||"—"}.`;

   rows.push({
     id,title:`${pathogen||"Foodborne illness"} — ${product||"Not yet identified"}`,
     product:product||"Not yet identified",company:"",hazard:pathogen||"Foodborne illness",
     severity:sevForOutbreak(pathogen,cases),status,category:"Outbreak investigation",
     states:[],distribution:"",lat:null,lng:null,source:"FDA Active Outbreak Investigations",
     sourcePostedAt,updatedAt:sourcePostedAt||new Date().toISOString(),verifiedAt:sourcePostedAt||new Date().toISOString(),
     summary,lots:[],
     evidence:[{
       type:"AGENCY",status:"VERIFIED",source:"FDA Active Outbreak Investigations",
       text:summary,url
     }],
     entities:[
       {id:`incident-${id}`,type:"Incident",name:`FDA outbreak ${ref||""}`},
       {id:`hazard-${id}`,type:"Hazard",name:pathogen||"Foodborne illness"},
       {id:`food-${id}`,type:"Food",name:product||"Not yet identified"}
     ],
     links:[[`incident-${id}`,`hazard-${id}`,"caused by"],[`incident-${id}`,`food-${id}`,"linked product"]],
     workflowStep:/not yet identified/i.test(product||"")?2:3,
     rawSource:"fda_outbreaks",fdaReference:ref||null,caseCount:cases
   });
 });
 if(!rows.length)throw new Error("FDA outbreaks parser returned 0 active rows; page structure may have changed");
 return {rows,note:`${rows.length} active investigations retrieved from official FDA outbreak table`};
}

async function pullNOAAENSO(){
 const url="https://www.cpc.ncep.noaa.gov/products/analysis_monitoring/enso_advisory/ensodisc.html";
 const r=await timeoutFetch(url,{accept:"text/html,application/xhtml+xml"});
 if(!r.ok)throw new Error(`NOAA/CPC ${r.status}`);
 const text=cleanText(await r.text());
 const active=/ENSO Alert System Status:\s*El Niño Advisory/i.test(text)||/El Niño Advisory/i.test(text);
 const synopsis=(text.match(/Synopsis:.{0,900}/i)||[])[0]||text.slice(0,900);
 return {
   status:active?"WATCH":"MONITORED",
   lastChecked:new Date().toISOString(),
   signals:active?[{
     id:`CLIMATE-ENSO-${new Date().toISOString().slice(0,7)}`,
     type:"CLIMATE_CONTEXT",title:"El Niño Advisory",severity:"WATCH",
     confidence:"AUTHORITATIVE_CONTEXT",source:"NOAA Climate Prediction Center",sourceUrl:url,
     text:cleanText(synopsis),
     rule:"Contextual risk modifier only — not evidence that any food is contaminated."
   }]:[],
   note:active
     ?"NOAA/CPC El Niño Advisory is active and available to the early-warning layer."
     :"NOAA/CPC checked; no active El Niño Advisory phrase detected."
 };
}


function adverseSeverity(outcomes=[]){
 const txt=(outcomes||[]).join(" ").toLowerCase();
 if(/death|life threatening|hospitalization|hospitalisation/.test(txt))return"HIGH";
 return"EMERGING";
}
async function pullFDAFoodEvents(){
 const configuredKey=globalThis.Netlify?.env?.get?.("FDA_API_KEY")||process.env.FDA_API_KEY||"";
 const key=configuredKey?`&api_key=${encodeURIComponent(configuredKey)}`:"";
 const url=`https://api.fda.gov/food/event.json?limit=100&sort=date_created:desc${key}`;
 const r=await timeoutFetch(url,{accept:"application/json"});
 if(!r.ok)throw new Error(`FDA food events ${r.status}`);
 const j=await r.json(),rows=[];
 for(const e of (j.results||[])){
   const products=(e.products||[]).map(p=>p.name||p.industry_name).filter(Boolean);
   const outcomes=(e.outcomes||[]).filter(Boolean);
   const symptoms=(e.reactions||[]).filter(Boolean);
   const id=`FDA-EVENT-${e.report_number||fingerprint([e.date_created,products.join("|"),symptoms.join("|")])}`;
   const title=`Food adverse event — ${products[0]||"Product not specified"}`;
   const summary=`FDA adverse-event report. Products: ${products.join(", ")||"not specified"}. Outcomes: ${outcomes.join(", ")||"not specified"}. Reactions: ${symptoms.slice(0,8).join(", ")||"not specified"}.`;
   rows.push({
     id,title,product:products.join(", ")||"Not specified",company:"",hazard:symptoms[0]||"Adverse event",
     severity:adverseSeverity(outcomes),status:"DETECTED",category:"Adverse event",
     states:[],distribution:"",lat:null,lng:null,source:"FDA Food Adverse Events",
     sourcePostedAt:e.date_created||null,updatedAt:e.date_created||new Date().toISOString(),verifiedAt:null,
     summary,lots:[],
     evidence:[{type:"AGENCY",status:"DETECTED",source:"FDA Food Adverse Events",text:summary,url:"https://open.fda.gov/apis/food/event/"}],
     entities:[{id:`event-${id}`,type:"Incident",name:title},{id:`food-${id}`,type:"Food",name:products[0]||"Unspecified food"}],
     links:[[ `event-${id}`,`food-${id}`,"reported product"]],
     workflowStep:1,rawSource:"fda_food_events"
   });
 }
 return rows;
}
async function pullCDCContent(){
 const url="https://tools.cdc.gov/api/v2/resources/media?q=foodborne%20outbreak&max=50";
 const r=await timeoutFetch(url,{accept:"application/json"});
 if(!r.ok)throw new Error(`CDC content ${r.status}`);
 const j=await r.json(),rows=[];
 for(const m of (j.results||[])){
   const title=cleanText(m.name||m.title||m.description||"CDC foodborne outbreak content");
   const id=`CDC-CONTENT-${m.id||fingerprint([title,m.lastUpdatedDate,m.url])}`;
   const summary=cleanText(m.description||m.summary||title);
   rows.push({
     id,title,product:"Not yet resolved",company:"",hazard:"Foodborne outbreak / public-health signal",
     severity:"WATCH",status:"DETECTED",category:"CDC public-health signal",
     states:[],distribution:"",lat:null,lng:null,source:"CDC Content Services",
     sourcePostedAt:m.lastUpdatedDate||m.datePublished||null,
     updatedAt:m.lastUpdatedDate||m.datePublished||new Date().toISOString(),
     verifiedAt:null,summary,lots:[],
     evidence:[{type:"AGENCY",status:"DETECTED",source:"CDC Content Services",text:summary,url:m.url||"https://tools.cdc.gov/api"}],
     entities:[{id:`event-${id}`,type:"Incident",name:title}],
     links:[],workflowStep:1,rawSource:"cdc_content"
   });
 }
 return rows;
}
async function pullNWSHazards(){
 const events=["Flood Warning","Extreme Heat Warning","Hurricane Warning","Tropical Storm Warning"];
 const urls=events.map(e=>`https://api.weather.gov/alerts/active?event=${encodeURIComponent(e)}`);
 const responses=await Promise.all(urls.map(u=>timeoutFetch(u,{accept:"application/geo+json"})));
 const rows=[];
 for(let i=0;i<responses.length;i++){
   const r=responses[i]; if(!r.ok)throw new Error(`NWS ${events[i]} ${r.status}`);
   const j=await r.json();
   for(const f of (j.features||[]).slice(0,100)){
     const p=f.properties||{},id=`NWS-${f.id||fingerprint([p.event,p.sent,p.areaDesc])}`;
     const summary=cleanText(p.description||p.headline||p.event||"NWS weather hazard");
     rows.push({
       id,title:`Weather context — ${p.event||events[i]}`,product:"Agriculture / food-system context",company:"",
       hazard:p.event||events[i],severity:/Hurricane|Extreme Heat/i.test(p.event||"")?"WATCH":"EMERGING",
       status:"DETECTED",category:"Climate / weather context",states:[],distribution:p.areaDesc||"",
       lat:null,lng:null,source:"National Weather Service",
       sourcePostedAt:p.sent||null,updatedAt:p.sent||new Date().toISOString(),verifiedAt:p.sent||null,
       summary,lots:[],
       evidence:[{type:"AGENCY",status:"VERIFIED",source:"National Weather Service",text:summary,url:p["@id"]||"https://api.weather.gov/alerts/active"}],
       entities:[{id:`weather-${id}`,type:"Incident",name:p.event||events[i]},{id:`geo-${id}`,type:"Geography",name:p.areaDesc||"Affected area"}],
       links:[[ `weather-${id}`,`geo-${id}`,"affects geography"]],
       workflowStep:0,rawSource:"nws_hazards",contextOnly:true
     });
   }
 }
 return rows;
}
async function pullTraderJoes(){
 const url="https://www.traderjoes.com/home/announcements?category=recalls";
 const r=await timeoutFetch(url,{accept:"text/html,application/xhtml+xml"});
 if(!r.ok)throw new Error(`Trader Joe's ${r.status}`);
 const html=await r.text(),$=cheerio.load(html),rows=[];
 $("a[href*='announcements']").each((_,a)=>{
   const href=$(a).attr("href")||"",title=cleanText($(a).text());
   if(!title||!/recall/i.test(title+" "+href))return;
   const full=new URL(href,url).toString();
   const id=`TJ-${fingerprint([title,full])}`;
   rows.push({
     id,title,product:title.replace(/^RECALL:\s*/i,""),company:"Trader Joe's",hazard:"Recall / withdrawal",
     severity:"WATCH",status:"CORROBORATING",category:"Retailer recall",
     states:[],distribution:"Trader Joe's retail network",lat:null,lng:null,source:"Trader Joe's",
     sourcePostedAt:null,updatedAt:new Date().toISOString(),verifiedAt:null,
     summary:`Trader Joe's recall announcement detected: ${title}`,lots:[],
     evidence:[{type:"SUPPLIER",status:"CORROBORATING",source:"Trader Joe's",text:title,url:full}],
     entities:[{id:`company-${id}`,type:"Retailer",name:"Trader Joe's"},{id:`food-${id}`,type:"Food",name:title}],
     links:[[ `company-${id}`,`food-${id}`,"recall notice"]],
     workflowStep:2,rawSource:"trader_joes_recalls"
   });
 });
 if(!rows.length)throw new Error("Trader Joe's parser returned 0 recall records; page structure may have changed");
 return rows.slice(0,50);
}
async function pullUKFSA(){
 const url="https://alerts.food.gov.uk/";
 const r=await timeoutFetch(url,{accept:"text/html,application/xhtml+xml"});
 if(!r.ok)throw new Error(`UK FSA ${r.status}`);
 const html=await r.text(),$=cheerio.load(html),rows=[];
 $("a[href*='/news-alerts/alert/']").each((_,a)=>{
   const href=$(a).attr("href")||"",title=cleanText($(a).text());
   if(!title||title.length<8)return;
   const full=new URL(href,url).toString();
   const ref=(full.match(/\/alert\/([^/?#]+)/)||[])[1]||fingerprint([title,full]);
   const id=`UKFSA-${ref}`;
   rows.push({
     id,title,product:title,company:"",hazard:"Food safety alert",
     severity:/listeria|salmonella|e\.?\s*coli|allergen|metal|glass/i.test(title)?"WATCH":"EMERGING",
     status:"VERIFIED",category:"International food alert",
     states:[],distribution:"United Kingdom",lat:null,lng:null,source:"UK Food Standards Agency",
     sourcePostedAt:null,updatedAt:new Date().toISOString(),verifiedAt:new Date().toISOString(),
     summary:title,lots:[],
     evidence:[{type:"AGENCY",status:"VERIFIED",source:"UK Food Standards Agency",text:title,url:full}],
     entities:[{id:`event-${id}`,type:"Incident",name:title}],
     links:[],workflowStep:3,rawSource:"uk_fsa_alerts"
   });
 });
 if(!rows.length)throw new Error("UK FSA parser returned 0 alerts; page structure may have changed");
 const seen=new Set();return rows.filter(x=>!seen.has(x.id)&&seen.add(x.id)).slice(0,60);
}

async function runSource(source){
 if(source.id==="fda_openfda")return {source,rows:await pullFDA()};
 if(source.id==="usda_fsis"){const x=await pullFSIS();return {source,...x}};
 if(source.id==="fda_outbreaks"){const x=await pullFDAOutbreaks();return {source,...x}};
 if(source.id==="fda_food_events")return {source,rows:await pullFDAFoodEvents()};
 if(source.id==="cdc_content")return {source,rows:await pullCDCContent()};
 if(source.id==="nws_hazards")return {source,rows:await pullNWSHazards()};
 if(source.id==="trader_joes_recalls")return {source,rows:await pullTraderJoes()};
 if(source.id==="uk_fsa_alerts")return {source,rows:await pullUKFSA()};
 if(source.id==="noaa_enso")return {source,climate:await pullNOAAENSO(),rows:[]};
 return {source,rows:[]};
}

export async function runSurveillance(){
 const state=await getState(),now=new Date().toISOString();
 const health=SOURCE_REGISTRY.filter(Boolean).map(s=>({
   id:s.id,name:s.name,family:s.family,status:"PENDING",lastChecked:null,
   note:s.note||(s.active?"Awaiting check":"Connector pending")
 }));
 const active=SOURCE_REGISTRY.filter(Boolean).filter(s=>s.active);
 const results=await Promise.allSettled(active.map(runSource));

 let incoming=[],events=[],successfulSources=new Set();

 for(let i=0;i<results.length;i++){
   const source=active[i],h=health.find(x=>x.id===source.id),result=results[i];
   h.lastChecked=now;
   if(result.status==="fulfilled"){
     successfulSources.add(source.id);
     if(result.value.climate){
       state.climateWatch=result.value.climate;
       h.status="ONLINE";h.note=result.value.climate.note;
       events.push({time:now,title:`${source.name} checked`,detail:result.value.climate.note});
     }else{
       const rows=result.value.rows||[];
       incoming.push(...rows);h.status="ONLINE";h.note=result.value.note||`${rows.length} records retrieved`;
       events.push({time:now,title:`${source.name} checked`,detail:h.note});
     }
   }else{
     h.status="DEGRADED";h.note=String(result.reason?.message||result.reason||"Unknown source error");
     events.push({time:now,title:`SOURCE DEGRADED — ${source.name}`,detail:h.note});
   }
 }

 const merged=merge(state.incidents||[],incoming,now,successfulSources);
 const next={
   ...state,
   meta:{...(state.meta||{}),lastSync:now,mode:"LIVE",cycleMinutes:30},
   incidents:merged.items,
   sourceHealth:health,
   climateWatch:state.climateWatch||null,
   changes:[
     {time:now,title:"Surveillance cycle complete",detail:`${merged.added} new · ${merged.changed} changed · ${merged.unchanged} unchanged · ${incoming.length} records processed.`},
     ...events,...(state.changes||[])
   ].slice(0,250)
 };
 await saveState(next);
 return next;
}

export default async()=>{await runSurveillance()}
export const config={schedule:"*/30 * * * *"};
