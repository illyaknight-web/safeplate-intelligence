import { getState, saveState } from "./lib/store.mjs";
import { fingerprint } from "./lib/normalize.mjs";
import * as cheerio from "cheerio";

const nowISO=()=>new Date().toISOString();
const clean=v=>String(v||"").replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
const toISO=v=>{const d=new Date(v||0);return Number.isNaN(d.getTime())?null:d.toISOString()};
const fetchWithTimeout=async(url,{accept="application/json",ms=12000,headers={}}={})=>{
  const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);
  try{return await fetch(url,{signal:c.signal,redirect:"follow",headers:{accept,"accept-language":"en-US,en;q=0.9","cache-control":"no-cache","user-agent":"Mozilla/5.0 (compatible; SAFEPLATE/0.35.13; +https://safeplate-intelligence.netlify.app)",...headers}})}finally{clearTimeout(t)}
};
const hazardFrom=t=>{const s=String(t||"").toLowerCase();if(s.includes("listeria"))return"Listeria";if(s.includes("salmonella"))return"Salmonella";if(/e\.?\s*coli/.test(s))return"E. coli";if(/allerg|undeclared/.test(s))return"Undeclared allergen";if(/stone|glass|metal|foreign/.test(s))return"Foreign material";return"Food safety alert"};
const severity=t=>/listeria|salmonella|e\.?\s*coli|botulin/i.test(String(t||""))?"HIGH":"WATCH";
const norm=v=>clean(v).toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const toks=v=>new Set(norm(v).split(" ").filter(x=>x.length>=5));
const overlap=(a,b)=>{const A=toks(a),B=toks(b);if(!A.size||!B.size)return 0;let n=0;for(const x of A)if(B.has(x))n++;return n/Math.min(A.size,B.size)};
const explicitUS=t=>/\b(?:united states(?: of america)?|u\.s\.|u\.s\b|usa\b|us market|american consumers|distributed in (?:the )?(?:united states|u\.s\.|usa)|sold in (?:the )?(?:united states|u\.s\.|usa)|import(?:ed|er|ation)? (?:into|to) (?:the )?(?:united states|u\.s\.|usa))\b/i.test(String(t||""));

async function pullCFIA(){
  const url="https://recalls-rappels.canada.ca/en/feed/cfia-alerts-recalls";
  const r=await fetchWithTimeout(url,{accept:"application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.8"});if(!r.ok)throw new Error(`CFIA feed HTTP ${r.status}`);
  const xml=await r.text(),$=cheerio.load(xml,{xmlMode:true}),rows=[];
  $("item").each((_,el)=>{const title=clean($(el).find("title").first().text()),link=clean($(el).find("link").first().text()),desc=clean($(el).find("description").first().text()),date=toISO($(el).find("pubDate").first().text()),text=`${title} ${desc}`;if(!title||!link)return;const id=`CFIA-${fingerprint([title,link])}`;rows.push({id,title,product:title,company:"",hazard:hazardFrom(text),severity:severity(text),status:"VERIFIED",category:"International food signal",states:[],distribution:"Canada",origin:null,lat:null,lng:null,source:"Canadian Food Inspection Agency",sourcePostedAt:date,updatedAt:date||nowISO(),verifiedAt:date||nowISO(),summary:desc||title,lots:[],evidence:[{type:"AGENCY",status:"VERIFIED",source:"Canada recalls and safety alerts",text:desc||title,url:link}],entities:[{id:`event-${id}`,type:"Incident",name:title}],links:[],workflowStep:2,rawSource:"cfia_recalls",usRelevanceStatus:"UNCONFIRMED"});});
  if(!rows.length)throw new Error("CFIA official feed returned zero usable food recall records");
  return {rows:rows.slice(0,75),note:`${rows.length} CFIA food recall/feed records retrieved`};
}

async function pullUKFSA(){
  const since=new Date(Date.now()-180*86400000).toISOString();
  const url=`https://data.food.gov.uk/food-alerts/id?since=${encodeURIComponent(since)}&_view=full`;
  const r=await fetchWithTimeout(url);if(!r.ok)throw new Error(`UK FSA Food Alerts API HTTP ${r.status}`);
  const j=await r.json();
  const raw=Array.isArray(j.items)?j.items:Array.isArray(j.results)?j.results:Array.isArray(j)?j:[];
  const rows=raw.map(a=>{const title=clean(a.title||a.shortTitle||a.SMStext||a.description||"UK FSA food alert"),problem=clean(a.problem?.riskStatement||a.problem?.description||a.consumerAdvice||a.actionTaken||a.reason||""),brand=clean(a.productDetails?.brand||a.brand||a.business?.commonName||""),sourceUrl=typeof a.alertURL==="string"?a.alertURL:(a.alertURL?.['@id']||a.shortURL||"https://alerts.food.gov.uk/"),date=toISO(a.modified||a.created||a.notation||a.date),id=`UKFSA-${fingerprint([a['@id']||a.id||title,sourceUrl])}`,text=`${title} ${problem}`;return {id,title,product:title,company:brand,hazard:hazardFrom(text),severity:severity(text),status:"VERIFIED",category:"International food signal",states:[],distribution:"United Kingdom",origin:null,lat:null,lng:null,source:"UK Food Standards Agency",sourcePostedAt:date,updatedAt:date||nowISO(),verifiedAt:date||nowISO(),summary:problem||title,lots:[],evidence:[{type:"AGENCY",status:"VERIFIED",source:"UK Food Standards Agency Food Alerts API",text:problem||title,url:sourceUrl}],entities:[{id:`event-${id}`,type:"Incident",name:title}],links:[],workflowStep:2,rawSource:"uk_fsa_alerts",usRelevanceStatus:"UNCONFIRMED"}}).filter(x=>x.title.length>4);
  if(!rows.length)throw new Error("UK FSA Food Alerts API returned zero usable records");
  return {rows:rows.slice(0,100),note:`${rows.length} UK FSA alerts retrieved from official API`};
}

async function pullUSDAAMS(){
  const key=globalThis.Netlify?.env?.get?.("USDA_AMS_API_KEY")||process.env.USDA_AMS_API_KEY;
  if(!key)throw new Error("USDA_AMS_API_KEY is not configured");
  const auth=`Basic ${Buffer.from(`${key}:`).toString('base64')}`;
  const url="https://marsapi.ams.usda.gov/services/v1.2/reports";
  const r=await fetchWithTimeout(url,{headers:{authorization:auth}});if(!r.ok)throw new Error(`USDA AMS MyMarketNews HTTP ${r.status}`);
  const j=await r.json();
  const raw=Array.isArray(j)?j:Array.isArray(j.results)?j.results:Array.isArray(j.data)?j.data:[];
  if(!raw.length)throw new Error("USDA AMS MyMarketNews returned zero report metadata records");
  return {rows:[],note:`Authenticated successfully; ${raw.length} USDA AMS Market News report metadata records available`};
}

function applyUSRelevance(rows,existing){
  const domestic=(existing||[]).filter(x=>["fda_openfda","usda_fsis"].includes(x.rawSource)||String(x.rawSource||"").startsWith("state_"));
  return rows.map(x=>{
    if(!["cfia_recalls","uk_fsa_alerts"].includes(x.rawSource))return x;
    const allText=[x.title,x.product,x.company,x.summary,x.distribution,...(x.evidence||[]).map(e=>e.text)].join(" ");
    if(explicitUS(allText))return {...x,usRelevanceStatus:"VERIFIED",usRelevanceReason:"Official international source explicitly references U.S. distribution/import/sale.",workflowStep:3,evidence:[...(x.evidence||[]),{type:"US_RELEVANCE",status:"VERIFIED",source:"SAFEPLATE U.S. relevance rule",text:"Official source explicitly references the United States."}]};
    const hit=domestic.find(d=>{
      const sameCompany=x.company&&d.company&&norm(x.company)===norm(d.company);
      const sameTitle=norm(x.title)&&norm(x.title)===norm(d.title||d.product);
      const strongProduct=overlap(`${x.title} ${x.product}`,`${d.title} ${d.product}`)>=0.8;
      const sameHazard=x.hazard&&d.hazard&&norm(x.hazard)===norm(d.hazard);
      return sameTitle||(sameCompany&&sameHazard&&strongProduct);
    });
    if(hit)return {...x,usRelevanceStatus:"CORROBORATED",usRelevanceReason:`Matched U.S. record ${hit.id} from ${hit.source||hit.rawSource}.`,workflowStep:3,evidence:[...(x.evidence||[]),{type:"US_RELEVANCE",status:"CORROBORATED",source:hit.source||"U.S. food-safety source",text:`Matched U.S. food-safety record ${hit.id}.`} ]};
    return {...x,usRelevanceStatus:"UNCONFIRMED",usRelevanceReason:"International signal retained for correlation; no verified U.S. distribution/import evidence found in the current cycle."};
  });
}

function mergeIncidents(existing,incoming,now){const m=new Map((existing||[]).map(x=>[x.id,x]));for(const x of incoming){const old=m.get(x.id);m.set(x.id,old?{...old,...x,firstSeenAt:old.firstSeenAt||now,lastObservedAt:now,observationCount:(old.observationCount||1)+1}:{...x,firstSeenAt:now,lastObservedAt:now,observationCount:1})}return [...m.values()].sort((a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0)).slice(0,1800)}

export default async()=>{
  // CDC is owned by the dedicated cdc-foodborne-repair scheduled function. Keeping
  // it out of this batch prevents the retired Content Services API from overwriting
  // a successful current-outbreak-page health result one minute before each repair.
  const started=nowISO(),tests=[['usda_ams','USDA AMS MyMarketNews','Federal',pullUSDAAMS],['cfia_recalls','Canada Food Recalls & Safety Alerts','International',pullCFIA],['uk_fsa_alerts','UK Food Standards Agency Alerts','International',pullUKFSA]];
  const results=await Promise.allSettled(tests.map(x=>x[3]()));let incoming=[],health=[];
  results.forEach((res,i)=>{const [id,name,family]=tests[i];if(res.status==='fulfilled'){incoming.push(...res.value.rows);health.push({id,name,family,status:'ONLINE',lastChecked:started,note:res.value.note})}else health.push({id,name,family,status:'DEGRADED',lastChecked:started,note:String(res.reason?.message||res.reason||'Unknown source error')})});
  const state=await getState();
  incoming=applyUSRelevance(incoming,state.incidents||[]);
  const oldHealth=(state.sourceHealth||[]).filter(x=>!health.some(h=>h.id===x.id)),incidents=mergeIncidents(state.incidents||[],incoming,started),online=health.filter(x=>x.status==='ONLINE').length,usLinked=incoming.filter(x=>["VERIFIED","CORROBORATED"].includes(x.usRelevanceStatus)).length;
  await saveState({...state,meta:{...(state.meta||{}),extendedGovernmentLastSync:started,extendedGovernmentCycleMinutes:30},incidents,sourceHealth:[...oldHealth,...health],changes:[{time:started,title:'Extended government source validation complete',detail:`${online}/${tests.length} sources online · ${incoming.length} records processed · ${usLinked} international records linked to verified/corroborated U.S. relevance.`},...(state.changes||[])].slice(0,350)});
};

export const config={schedule:"8,38 * * * *"};
