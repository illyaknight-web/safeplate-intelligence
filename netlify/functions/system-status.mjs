
import { getState } from "./lib/store.mjs";

export default async()=>{
 const s=await getState();
 const sources=s.sourceHealth||[];
 const lastSync=s.meta?.lastSync||null;
 const ageMinutes=lastSync?Math.floor((Date.now()-new Date(lastSync).getTime())/60000):null;
 const fresh=ageMinutes!==null && ageMinutes<=75;
 const online=sources.filter(x=>x.status==="ONLINE").length;
 const degraded=sources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length;
 const checked=sources.filter(x=>x.lastChecked).length;

 return Response.json({
   live:fresh && checked>0,
   stale:Boolean(lastSync)&&!fresh,
   lastSync,
   ageMinutes,
   cycleMinutes:30,
   incidents:(s.incidents||[]).length,
   sourcesOnline:online,
   sourceIssues:degraded,
   sourcesChecked:checked
 },{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/system-status"};
