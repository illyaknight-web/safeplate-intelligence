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
const publicRecord=x=>({
 ...x,
 title:clean(x.title||x.product||"Food safety record"),
 product:clean(x.product||x.title||""),
 company:clean(x.company||""),
 summary:clean(x.summary||""),
 hazard:clean(x.hazard||""),
 category:clean(x.category||""),
 evidence:(x.evidence||[]).map(e=>({...e,text:clean(e.text||e.summary||""),summary:clean(e.summary||""),source:clean(e.source||e.type||"")}))
});

export default async()=>{
 const s=await getState();
 const incidents=(s.incidents||[]).filter(x=>!spanish(x)).map(publicRecord);
 return Response.json({meta:s.meta||{},incidents,investigations:s.investigations||[],changes:s.changes||[]},{headers:{"cache-control":"no-store"}})
};
export const config={path:"/api/incidents"};
