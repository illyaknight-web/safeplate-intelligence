const STOP=new Set('a an and any are can check current currently do does find food for have i in is it me my near of on please recall recalled recalls show tell the there this today what whether with'.split(' '));
const RECALL_SOURCES=new Set(['fda_openfda','fda_recall_announcements','fda_reconciliation','usda_fsis','fda_outbreaks']);
const RECENT_RECALL_DAYS=45;
const OFFICIAL_SOURCE_HOME={
  fda_openfda:'https://www.accessdata.fda.gov/scripts/ires/index.cfm#/enforcement-reports/',
  fda_recall_announcements:'https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts',
  fda_reconciliation:'https://www.fda.gov/food/recalls-outbreaks-emergencies/recalls-foods-dietary-supplements',
  fda_outbreaks:'https://www.fda.gov/food/outbreaks-foodborne-illness/investigations-foodborne-illness-outbreaks',
  usda_fsis:'https://www.fsis.usda.gov/recalls-alerts',
  cdc_content:'https://www.cdc.gov/foodborne-outbreaks/outbreaks/index.html',
  cfia_recalls:'https://recalls-rappels.canada.ca/en'
};

export const rootSearchWord=w=>w.length>4&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>4&&/(ches|shes|xes|zes|ses)$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
export const searchTerms=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x=>x.length>1&&!STOP.has(x)).map(rootSearchWord);
const recallAliases=x=>{
  const id=String(x?.id||'');
  const aliases=[id,x?.recallNumber,x?.recall_number,x?.officialRecordId];
  if(/^FDA-/i.test(id))aliases.push(id.replace(/^FDA-/i,''));
  return aliases.filter(Boolean);
};
const searchable=x=>[x.product,x.title,x.brand,x.company,x.manufacturer,x.upc,x.gtin,x.lot,x.lotNumber,...recallAliases(x),x.hazard,x.pathogen,x.distribution].filter(Boolean).join(' ');
export const isActionableRecall=x=>!x?.institutionalOnly&&(RECALL_SOURCES.has(x?.rawSource)||/\b(recall|recalled|public health alert|active outbreak|foodborne outbreak)\b/i.test(`${x?.title||''} ${x?.category||''} ${x?.status||''}`));
const parseTime=v=>{if(v==null||v==='')return 0;const s=String(v).trim();if(/^\d{8}$/.test(s))return Date.UTC(Number(s.slice(0,4)),Number(s.slice(4,6))-1,Number(s.slice(6,8)));const t=new Date(s).getTime();return Number.isFinite(t)?t:0};

// "Current" means recently made authoritative/public, not merely recently initiated.
// verifiedAt is authoritative for normalized FDA/openFDA records; never use internal
// observation/update timestamps such as updatedAt/lastObservedAt to make old recalls current.
export const recallRecordTime=x=>{
  for(const value of [x?.announcedDate,x?.sourcePostedAt,x?.publicationDate,x?.publishedAt,x?.report_date,x?.reportDate,x?.verifiedAt,x?.recallDate,x?.recall_initiation_date,x?.date]){
    const t=parseTime(value);if(t)return t;
  }
  return 0;
};
export const isCurrentRecall=(x,now=Date.now())=>{
  const status=String(x?.status||'').toLowerCase(),t=recallRecordTime(x);
  return !/(terminated|resolved|closed|retracted)/.test(status)&&t>now-RECENT_RECALL_DAYS*864e5&&t<=now+864e5;
};
export const asksForCurrentRecall=query=>/\b(current|currently|today|now|active|latest|recent)\b/i.test(String(query||''));
export const recallMatchScore=(x,need)=>{const all=new Set(searchTerms(searchable(x))),primary=new Set(searchTerms([x.product,x.title,x.brand,x.company,x.upc,x.gtin,x.lot,x.lotNumber,...recallAliases(x)].filter(Boolean).join(' ')));if(!need.length)return 1;if(!need.every(t=>all.has(t)))return 0;return need.reduce((n,t)=>n+(primary.has(t)?10:2),0)+(need.every(t=>primary.has(t))?20:0)};

const validOfficialUrl=value=>{try{const u=new URL(String(value||''));return /^https?:$/.test(u.protocol)?u.toString():null}catch{return null}};
export const recallSourceUrl=x=>{
  for(const value of [x?.sourceUrl,x?.source_url,x?.officialUrl,x?.official_url,x?.permalink,x?.recordUrl,x?.record_url,x?.url]){
    const url=validOfficialUrl(value);if(url)return {url,scope:'RECORD'};
  }
  for(const evidence of Array.isArray(x?.evidence)?x.evidence:[]){
    const url=validOfficialUrl(evidence?.url);if(url&&String(evidence?.type||'').toUpperCase()==='AGENCY')return {url,scope:'RECORD'};
  }
  const home=validOfficialUrl(OFFICIAL_SOURCE_HOME[x?.rawSource]);
  return home?{url:home,scope:'AGENCY_LANDING_PAGE'}:{url:null,scope:null};
};

export function searchRecallRecords(records,{query='',channel='',limit=25,now=Date.now()}={}){
  const need=searchTerms(query),max=Math.min(100,Math.max(1,Number(limit)||25));
  const currentIntent=asksForCurrentRecall(query);
  const matches=(Array.isArray(records)?records:[])
    .filter(isActionableRecall)
    .filter(x=>!channel||(x.distribution_channel||[]).includes(channel))
    .map(x=>({x,score:recallMatchScore(x,need),current:isCurrentRecall(x,now)}))
    .filter(v=>v.score>0&&(!currentIntent||v.current))
    .sort((a,b)=>Number(b.current)-Number(a.current)||b.score-a.score||recallRecordTime(b.x)-recallRecordTime(a.x))
    .slice(0,max)
    .map(v=>{const source=recallSourceUrl(v.x);return {...v.x,sourceUrl:source.url,sourceUrlScope:source.scope,search_match:need.length?(v.score>=20?'EXACT_OR_ALL_TERMS':'RELATED'):'UNFILTERED',temporal_match:v.current?'CURRENT':'HISTORICAL'}});
  return {need,currentIntent,records:matches};
}
