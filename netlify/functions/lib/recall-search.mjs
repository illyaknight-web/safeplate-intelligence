const STOP=new Set('a an and any are can check current currently do does find food for have i in is it me my near of on please recall recalled recalls show tell the there this today what whether with'.split(' '));
const RECALL_SOURCES=new Set(['fda_openfda','fda_recall_announcements','usda_fsis','fda_outbreaks']);

export const rootSearchWord=w=>w.length>4&&w.endsWith('ies')?w.slice(0,-3)+'y':w.length>4&&/(ches|shes|xes|zes|ses)$/.test(w)?w.slice(0,-2):w.length>3&&w.endsWith('s')&&!w.endsWith('ss')?w.slice(0,-1):w;
export const searchTerms=s=>String(s||'').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').split(/\s+/).filter(x=>x.length>1&&!STOP.has(x)).map(rootSearchWord);
const searchable=x=>[x.product,x.title,x.brand,x.company,x.manufacturer,x.upc,x.gtin,x.lot,x.lotNumber,x.recallNumber,x.hazard,x.pathogen,x.distribution].filter(Boolean).join(' ');
export const isActionableRecall=x=>!x?.institutionalOnly&&(RECALL_SOURCES.has(x?.rawSource)||/\b(recall|recalled|public health alert|active outbreak|foodborne outbreak)\b/i.test(`${x?.title||''} ${x?.category||''} ${x?.status||''}`));
export const recallMatchScore=(x,need)=>{const all=new Set(searchTerms(searchable(x))),primary=new Set(searchTerms([x.product,x.title,x.brand,x.company,x.upc,x.gtin,x.lot,x.lotNumber,x.recallNumber].filter(Boolean).join(' ')));if(!need.length)return 1;if(!need.every(t=>all.has(t)))return 0;return need.reduce((n,t)=>n+(primary.has(t)?10:2),0)+(need.every(t=>primary.has(t))?20:0)};

export function searchRecallRecords(records,{query='',channel='',limit=25}={}){
  const need=searchTerms(query),max=Math.min(100,Math.max(1,Number(limit)||25));
  const matches=(Array.isArray(records)?records:[]).filter(isActionableRecall).filter(x=>!channel||(x.distribution_channel||[]).includes(channel)).map(x=>({x,score:recallMatchScore(x,need)})).filter(v=>v.score>0).sort((a,b)=>b.score-a.score||new Date(b.x.recallDate||b.x.updatedAt||0)-new Date(a.x.recallDate||a.x.updatedAt||0)).slice(0,max).map(v=>({...v.x,search_match:need.length?(v.score>=20?'EXACT_OR_ALL_TERMS':'RELATED'):'UNFILTERED'}));
  return {need,records:matches};
}
