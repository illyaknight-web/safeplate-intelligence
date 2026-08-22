import { getState } from "./lib/store.mjs";

export default async()=>{
  const s=await getState();
  const health=(s.sourceHealth||[]).filter(x=>["cdc_content","mn_health_food","wi_health_food"].includes(x.id));
  const lastSync=s.meta?.earlyWarningLastSync||null;
  const ageMinutes=lastSync?Math.floor((Date.now()-new Date(lastSync).getTime())/60000):null;
  const online=health.filter(x=>x.status==="ONLINE").length;
  const issues=health.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length;
  return Response.json({
    live:Boolean(lastSync)&&ageMinutes<=75&&online>0,
    stale:Boolean(lastSync)&&ageMinutes>75,
    lastSync,
    ageMinutes,
    cycleMinutes:30,
    sourcesOnline:online,
    sourceIssues:issues,
    sourcesChecked:health.filter(x=>x.lastChecked).length,
    investigations:(s.investigations||[]).length,
    sources:health
  },{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/early-warning-status"};
