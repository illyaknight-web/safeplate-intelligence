import { getState, saveState } from './lib/store.mjs';
import { normalizeFDA, fingerprint } from './lib/normalize.mjs';
import * as cheerio from 'cheerio';

const LIST='https://www.fda.gov/food/recalls-outbreaks-emergencies/recalls-foods-dietary-supplements';
const clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const iso=v=>{const d=new Date(v);return Number.isNaN(d.getTime())?null:d.toISOString()};
async function get(url){const c=new AbortController(),t=setTimeout(()=>c.abort(),15000);try{const r=await fetch(url,{signal:c.signal,redirect:'follow',headers:{accept:'text/html,application/xhtml+xml','cache-control':'no-cache','user-agent':'Mozilla/5.0 (compatible; SAFEPLATE FDA reconciliation; +https://safeplate-intelligence.netlify.app)'}});if(!r.ok)throw new Error(`FDA ${r.status} ${url}`);return r.text()}finally{clearTimeout(t)}}

function linksFrom(html){const $=cheerio.load(html),out=[];const add=(a,date='')=>{const href=$(a).attr('href'),title=clean($(a).text());if(!href||!title||!/recall|allergy alert/i.test(title))return;const url=new URL(href,LIST).toString();if(!url.includes('fda.gov/'))return;if(!out.some(x=>x.url===url))out.push({url,title,date:clean(date)})};
 $('article a[href], .lcds-card a[href]').each((_,a)=>add(a,$(a).closest('article,.lcds-card').find('time').first().text()));
 $('table tbody tr').each((_,tr)=>{const cells=$(tr).find('td');if(!cells.length)return;const date=clean(cells.first().text());$(tr).find('a[href]').each((__,a)=>add(a,date))});
 $('h2 a[href],h3 a[href],h4 a[href]').each((_,a)=>add(a,$(a).closest('div,section').find('time').first().text()));
 return out.slice(0,20);
}
async function detail(item){const html=await get(item.url),$=cheerio.load(html);const dt=label=>{let value='';$('dt').each((_,el)=>{if(!value&&clean($(el).text()).toLowerCase().startsWith(label.toLowerCase()))value=clean($(el).next('dd').text())});return value};
 const date=dt('Company Announcement Date')||clean($('time').first().attr('datetime'))||item.date;
 const company=dt('Company Name'),brand=dt('Brand Name'),product=dt('Product Description')||item.title,reason=dt('Reason for Announcement')||item.title;
 const body=clean($('#recall-announcement').text())||clean($('main').text()).slice(0,5000);
 const normalized=normalizeFDA({recall_number:`FDA-WEB-${fingerprint([item.url])}`,recalling_firm:company,product_description:[brand,product].filter(Boolean).join(' — '),reason_for_recall:reason,distribution_pattern:body,status:'Ongoing',report_date:date,recall_initiation_date:date});
 return {...normalized,id:`FDA-WEB-${fingerprint([item.url])}`,title:item.title,product:[brand,product].filter(Boolean).join(' — ')||product,company,brand,summary:reason||body.slice(0,1200),source:'FDA Food Recall Announcement',rawSource:'fda_reconciliation',sourceUrl:item.url,sourcePostedAt:iso(date),updatedAt:iso(date)||new Date().toISOString(),verifiedAt:new Date().toISOString(),evidence:[{type:'AGENCY',status:'VERIFIED',source:'U.S. Food and Drug Administration',text:reason||item.title,url:item.url}]};}
function key(x){return clean(x.sourceUrl).toLowerCase()||clean(`${x.company}|${x.product}|${x.sourcePostedAt||x.recallDate||''}`).toLowerCase()}
export async function reconcileFDA(){const started=new Date().toISOString(),links=linksFrom(await get(LIST));if(!links.length)throw new Error('FDA reconciliation found zero recall links; refusing false healthy state');const recent=[];for(const item of links){try{const r=await detail(item);const d=new Date(r.sourcePostedAt||r.updatedAt);if(!Number.isNaN(d)&&Date.now()-d.getTime()<=45*86400000)recent.push(r)}catch(e){console.error('FDA detail reconciliation failed',item.url,e.message)}}if(!recent.length)throw new Error('FDA reconciliation produced zero current records');
 const state=await getState(),existing=state.incidents||[],byKey=new Map(existing.map(x=>[key(x),x]));let added=0,refreshed=0;for(const r of recent){const k=key(r),old=byKey.get(k);if(old){byKey.set(k,{...old,...r,firstSeenAt:old.firstSeenAt||started,lastObservedAt:started,observationCount:(old.observationCount||0)+1});refreshed++}else{byKey.set(k,{...r,firstSeenAt:started,lastObservedAt:started,observationCount:1});added++}}
 const incidents=[...byKey.values()].sort((a,b)=>new Date(b.sourcePostedAt||b.updatedAt||0)-new Date(a.sourcePostedAt||a.updatedAt||0)).slice(0,1200);const sourceHealth=[...(state.sourceHealth||[]).filter(x=>x.id!=='fda_reconciliation'),{id:'fda_reconciliation',label:'FDA food recall reconciliation',status:'ONLINE',lastChecked:started,note:`${recent.length} current FDA announcement records reconciled; ${added} backfilled`}];const next={...state,meta:{...(state.meta||{}),fdaReconciliationLastSync:started,fdaReconciliationCount:recent.length,fdaReconciliationAdded:added},incidents,sourceHealth};await saveState(next);return {ok:true,status:'LIVE_RECONCILED',checkedAt:started,officialLinks:links.length,currentRecords:recent.length,added,refreshed};}
export default async()=>Response.json(await reconcileFDA(),{headers:{'Cache-Control':'no-store'}});
export const config={schedule:'11,41 * * * *'};
