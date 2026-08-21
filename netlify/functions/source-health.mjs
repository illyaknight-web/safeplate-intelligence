
import { getState } from "./lib/store.mjs";
import { SOURCE_REGISTRY } from "./lib/sources.mjs";

export default async()=>{
 const s=await getState();
 const src=(s.sourceHealth?.length?s.sourceHealth.filter(Boolean):SOURCE_REGISTRY.filter(Boolean).map(x=>({
   id:x.id,name:x.name,family:x.family,status:"PENDING",lastChecked:null,
   note:x.note||(x.active?"Not checked yet":"Connector pending")
 }))).filter(Boolean);
 const checked=src.filter(x=>x.lastChecked).length;
 const bad=src.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length;
 const lastSync=s.meta?.lastSync||null;
 const age=lastSync?(Date.now()-new Date(lastSync).getTime())/60000:null;
 const overall=!checked?"pending":age>75?"stale":bad?"degraded":"online";
 return Response.json({overall,lastSync,sources:src},{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/source-health"};
