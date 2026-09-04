import { getState } from "./lib/store.mjs";

const decode=s=>String(s||"")
 .replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&#039;/gi,"'")
 .replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&nbsp;/gi," ");
const clean=s=>decode(String(s||"").replace(/<[^>]*>/g," ")).replace(/\s+/g," ").trim();
const spanish=x=>{
 const t=`${x?.title||""} ${x?.summary||""}`.toLowerCase();
 const hits=[/\bretira\b/,/\bproductos\b/,/\bdebido\b/,/\bcontaminaci[oó]n\b/,/\bsin el beneficio\b/,/\bservicio de inocuidad\b/,/\baproximadamente\b/,/\bpodr[ií]an\b/,/\banunci[oó] hoy\b/].filter(r=>r.test(t)).length;
 return hits>=2;
};
const FOOD_SOURCES=new Set(["fda_openfda","usda_fsis","cfia_recalls","uk_fsa_alerts"]);
const INTERNATIONAL_SOURCES=new Set(["cfia_recalls","uk_fsa_alerts"]);
const foodTerms=/\b(food|foods|salmonella|listeria|e\.?\s*coli|campylobacter|botul|allergen|undeclared|milk|egg|peanut|soy|wheat|sesame|fish|shellfish|meat|beef|pork|chicken|turkey|produce|fruit|vegetable|berry|berries|blueberr|lettuce|cheese|dairy|seafood|shrimp|tuna|rice|flour|bread|snack|cereal|sauce|spice|frozen|ready-to-eat|rte|grocery|ingredient|produce|poultry)\b/i;
const foodEvents=/\b(recall|recalled|public health alert|food alert|food safety|outbreak|contamination|adulterat|misbrand|undeclared allergen|possible recall|potential recall|investigation)\b/i;
const reject=/\b(advisory board|committee meeting|hearing screening|interpreters for the deaf|breast cancer|opioid|mental health|behavioral health|medicaid|public meeting|screening program)\b/i;
const foodRecord=x=>{
 const t=`${x?.title||""} ${x?.product||""} ${x?.summary||""} ${x?.category||""} ${x?.hazard||""} ${x?.pathogen||""} ${x?.company||""} ${x?.source||""}`;
 if(reject.test(t)) return false;
 if(FOOD_SOURCES.has(x?.rawSource)) return true;
 return foodTerms.test(t)&&foodEvents.test(t);
};
const isUSRelevant=x=>{
 if(!INTERNATIONAL_SOURCES.has(x?.rawSource))return true;
 return ["VERIFIED","CORROBORATED"].includes(String(x?.usRelevanceStatus||"").toUpperCase());
};
const publicRecord=x=>({
 ...x,
 title:clean(x.title||x.product||"Food safety record"),
 product:clean(x.product||x.title||""),
 company:clean(x.company||""),
 summary:clean(x.summary||""),
 hazard:clean(x.hazard||""),
 category:clean(x.category||""),
 evidence:(x.evidence||[]).map(e=>({...e,text:clean(e.text||e.summary||""),summary:clean(e.summary||""),source:clean(e.source||e.type||"")})),
 distribution_channel:Array.isArray(x.distribution_channel)?x.distribution_channel:[/\b(?:tefap|food bank|food pantry|usda foods?|commodity)\b/i.test(`${x.distribution||""} ${x.summary||""}`)?"foodbank_tefap":/\b(?:school|cafeteria|child nutrition)\b/i.test(`${x.distribution||""} ${x.summary||""}`)?"school":"retail"],
 tefap_commodity_flag:Boolean(x.tefap_commodity_flag)||/\b(?:tefap|the emergency food assistance program|usda foods?|commodity distribution)\b/i.test(`${x.distribution||""} ${x.summary||""}`),
 upc:x.upc||x.identifiers?.find?.(v=>/^\d{8,14}$/.test(String(v)))||null,
 gtin:x.gtin||x.identifiers?.find?.(v=>/^\d{14}$/.test(String(v)))||null,
 last_synced:x.last_synced||x.lastObservedAt||x.updatedAt||null
});

export default async()=>{
 const s=await getState();
 const incidents=(s.incidents||[]).filter(x=>!x?.institutionalOnly&&!spanish(x)&&foodRecord(x)&&isUSRelevant(x)).map(publicRecord);
 return Response.json({meta:{...(s.meta||{}),last_synced:s.meta?.lastSuccessfulRun||s.meta?.surveillanceLastSync||incidents[0]?.last_synced||null},incidents,investigations:s.investigations||[],changes:s.changes||[]},{headers:{"cache-control":"public, max-age=0, must-revalidate","netlify-cdn-cache-control":"public, durable, max-age=60, stale-while-revalidate=120"}})
};
export const config={path:"/api/incidents"};
