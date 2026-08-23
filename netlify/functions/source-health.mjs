import { getState } from "./lib/store.mjs";
import { SOURCE_REGISTRY } from "./lib/sources.mjs";

export default async()=>{
 const s=await getState();
 const registry=new Map(SOURCE_REGISTRY.filter(Boolean).map(x=>[x.id,x]));
 const raw=(s.sourceHealth?.length?s.sourceHealth.filter(Boolean):SOURCE_REGISTRY.filter(Boolean).map(x=>({
   id:x.id,name:x.name,family:x.family,status:"PENDING",lastChecked:null,
   note:x.note||(x.active?"Not checked yet":"Connector pending")
 }))).filter(Boolean);

 // Public Source Health is an execution report, not a product roadmap.
 // Never present an unimplemented registry category as though it were a live source.
 const src=raw.filter(x=>{
   if(String(x.id||"").startsWith("state_"))return Boolean(x.lastChecked);
   const reg=registry.get(x.id);
   if(reg?.display===false)return false;
   return Boolean(x.lastChecked) || ["ONLINE","DEGRADED","OFFLINE"].includes(x.status);
 });

 const checked=src.filter(x=>x.lastChecked).length;
 const bad=src.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length;
 const online=src.filter(x=>x.status==="ONLINE").length;
 const lastSync=s.meta?.lastSync||null;
 const age=lastSync?(Date.now()-new Date(lastSync).getTime())/60000:null;
 const overall=!checked?"pending":age>75?"stale":bad?"degraded":"online";
 return Response.json({overall,lastSync,online,checked,issues:bad,sources:src,stateCoverage:s.stateCoverage||null},{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/source-health"};
