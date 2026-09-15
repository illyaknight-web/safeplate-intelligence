import { getState, saveState } from './lib/store.mjs';
import { normalizeFDA, fingerprint } from './lib/normalize.mjs';
import * as cheerio from 'cheerio';

const LIST='https://www.fda.gov/food/recalls-outbreaks-emergencies/recalls-foods-dietary-supplements';
const OPENFDA='https://api.fda.gov/food/enforcement.json';
const WINDOW_MS=45*86400000;
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const iso=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
const env=name=>process.env[name]||globalThis.Netlify?.env?.get?.(name)||'';

async function fetchText(url,accept='text/html,application/xhtml+xml'){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);
  try{
    const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept,'cache-control':'no-cache','user-agent':'Mozilla/5.0 (compatible; SAFEPLATE FDA reconciliation; +https://safeplate-intelligence.netlify.app)'}});
    if(!r.ok)throw new Error(`FDA ${r.status} ${url}`);
    return r.text();
  }finally{clearTimeout(t)}
}
async function fetchJSON(url){return JSON.parse(await fetchText(url,'application/json'))}

function linksFrom(html){
  const $=cheerio.load(html),out=[];
  const add=(a,date='')=>{
    const href=$(a).attr('href'),title=clean($(a).text());
    if(!href||!title||!/recall|allergy alert/i.test(title))return;
    const url=new URL(href,LIST).toString();
    if(!url.includes('fda.gov/'))return;
    if(!out.some(x=>x.url===url))out.push({url,title,date:clean(date)});
  };
  $('article a[href], .lcds-card a[href]').each((_,a)=>add(a,$(a).closest('article,.lcds-card').find('time').first().text()));
  $('table tbody tr').each((_,tr)=>{const cells=$(tr).find('td');if(!cells.length)return;const date=clean(cells.first().text());$(tr).find('a[href]').each((__,a)=>add(a,date))});
  $('h2 a[href],h3 a[href],h4 a[href]').each((_,a)=>add(a,$(a).closest('div,section').find('time').first().text()));
  return out.slice(0,30);
}

async function detail(item){
  const html=await fetchText(item.url),$=cheerio.load(html);
  const dt=label=>{let value='';$('dt').each((_,el)=>{if(!value&&clean($(el).text()).toLowerCase().startsWith(label.toLowerCase()))value=clean($(el).next('dd').text())});return value};
  const date=dt('Company Announcement Date')||clean($('time').first().attr('datetime'))||item.date;
  const company=dt('Company Name'),brand=dt('Brand Name'),product=dt('Product Description')||item.title,reason=dt('Reason for Announcement')||item.title;
  const body=clean($('#recall-announcement').text())||clean($('main').text()).slice(0,5000);
  const officialId=`FDA-WEB-${fingerprint([item.url])}`;
  const normalized=normalizeFDA({recall_number:officialId,recalling_firm:company,product_description:[brand,product].filter(Boolean).join(' — '),reason_for_recall:reason,distribution_pattern:body,status:'Ongoing',report_date:date,recall_initiation_date:date});
  return {...normalized,id:officialId,officialRecordId:officialId,title:item.title,product:[brand,product].filter(Boolean).join(' — ')||product,company,brand,summary:reason||body.slice(0,1200),source:'FDA Food Recall Announcement',rawSource:'fda_reconciliation',sourceUrl:item.url,sourcePostedAt:iso(date),updatedAt:iso(date)||new Date().toISOString(),verifiedAt:new Date().toISOString(),evidence:[{type:'AGENCY',status:'VERIFIED',source:'U.S. Food and Drug Administration',text:reason||item.title,url:item.url}]};
}

async function officialAnnouncementRecords(){
  const links=linksFrom(await fetchText(LIST));
  if(!links.length)throw new Error('FDA reconciliation found zero recall links; refusing false healthy state');
  const recent=[];
  for(const item of links){
    try{
      const r=await detail(item),d=new Date(r.sourcePostedAt||r.updatedAt);
      if(!Number.isNaN(d)&&Date.now()-d.getTime()<=WINDOW_MS)recent.push(r);
    }catch(e){console.error('FDA detail reconciliation failed',item.url,e.message)}
  }
  if(!recent.length)throw new Error('FDA reconciliation produced zero current announcement records');
  return {links,records:recent};
}

async function officialOpenFDARecords(){
  const key=env('FDA_API_KEY');
  const url=`${OPENFDA}?limit=100&search=status:%22Ongoing%22${key?`&api_key=${encodeURIComponent(key)}`:''}`;
  const payload=await fetchJSON(url),rows=Array.isArray(payload?.results)?payload.results:[];
  if(!rows.length)throw new Error('openFDA reconciliation returned zero ongoing food enforcement records');
  const records=rows.map(r=>({...normalizeFDA(r),officialRecordId:r.recall_number||null,rawSource:'fda_openfda'})).filter(r=>{
    const d=new Date(r.updatedAt||r.recallDate||0);
    return !Number.isNaN(d)&&Date.now()-d.getTime()<=WINDOW_MS;
  });
  if(!records.length)throw new Error('openFDA reconciliation produced zero applicable current enforcement records');
  return records;
}

function key(x){
  return clean(x.sourceUrl).toLowerCase()||clean(x.officialRecordId).toLowerCase()||clean(x.id).toLowerCase()||clean(`${x.company}|${x.product}|${x.sourcePostedAt||x.recallDate||''}`).toLowerCase();
}

async function markFailure(error,started){
  const state=await getState();
  const message=clean(error?.message||error||'FDA reconciliation failed');
  const row={id:'fda_reconciliation',name:'FDA authoritative reconciliation',family:'Federal',status:'DEGRADED',lastChecked:started,note:message};
  await saveState({...state,meta:{...(state.meta||{}),fdaReconciliationLastAttempt:started,fdaReconciliationStatus:'DEGRADED',fdaReconciliationError:message},sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='fda_reconciliation'),row]});
}

export async function reconcileFDA(){
  const started=new Date().toISOString();
  try{
    const [announcements,openfda]=await Promise.all([officialAnnouncementRecords(),officialOpenFDARecords()]);
    const official=[...announcements.records,...openfda];
    if(!official.length)throw new Error('FDA authoritative reconciliation returned zero usable records');

    const state=await getState(),existing=state.incidents||[],byKey=new Map(existing.map(x=>[key(x),x]));
    const missingBefore=official.filter(r=>!byKey.has(key(r)));
    let added=0,refreshed=0;
    for(const r of official){
      const k=key(r),old=byKey.get(k);
      if(old){byKey.set(k,{...old,...r,firstSeenAt:old.firstSeenAt||started,lastObservedAt:started,observationCount:(old.observationCount||0)+1});refreshed++}
      else{byKey.set(k,{...r,firstSeenAt:started,lastObservedAt:started,observationCount:1});added++}
    }
    const missingAfter=official.filter(r=>!byKey.has(key(r)));
    const incidents=[...byKey.values()].sort((a,b)=>new Date(b.sourcePostedAt||b.updatedAt||0)-new Date(a.sourcePostedAt||a.updatedAt||0)).slice(0,1200);
    const status=missingAfter.length?'DEGRADED':'RECONCILED';
    const row={id:'fda_reconciliation',name:'FDA authoritative reconciliation',family:'Federal',status:missingAfter.length?'DEGRADED':'ONLINE',lastChecked:started,note:`${official.length} authoritative FDA records checked; ${missingBefore.length} missing before backfill; ${added} backfilled; ${missingAfter.length} missing after verification`};
    const next={...state,meta:{...(state.meta||{}),fdaReconciliationLastAttempt:started,fdaReconciliationLastSync:missingAfter.length?(state.meta?.fdaReconciliationLastSync||null):started,fdaReconciliationStatus:status,fdaReconciliationOfficialCount:official.length,fdaReconciliationAnnouncementCount:announcements.records.length,fdaReconciliationOpenFDACount:openfda.length,fdaReconciliationMissingBefore:missingBefore.length,fdaReconciliationMissingAfter:missingAfter.length,fdaReconciliationAdded:added,fdaReconciliationError:null},incidents,sourceHealth:[...(state.sourceHealth||[]).filter(x=>x?.id!=='fda_reconciliation'),row]};
    await saveState(next);
    if(missingAfter.length)throw new Error(`FDA reconciliation incomplete after backfill: ${missingAfter.length} authoritative records remain missing`);
    return {ok:true,status:'RECONCILED',checkedAt:started,officialLinks:announcements.links.length,officialRecords:official.length,announcementRecords:announcements.records.length,openFDARecords:openfda.length,missingBefore:missingBefore.length,backfilled:added,refreshed,missingAfter:0};
  }catch(error){
    await markFailure(error,started);
    throw error;
  }
}

export default async()=>Response.json(await reconcileFDA(),{headers:{'Cache-Control':'no-store'}});
export const config={schedule:'11,41 * * * *'};
