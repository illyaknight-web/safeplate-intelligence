import { getState } from "./lib/store.mjs";

export default async()=>{
 const s=await getState();
 const sources=s.sourceHealth||[];
 const lastSync=s.meta?.lastSync||null;
 const earlyWarningLastSync=s.meta?.earlyWarningLastSync||null;
 const stateScanLastSync=s.meta?.stateScanLastSync||null;
 const ageMinutes=lastSync?Math.floor((Date.now()-new Date(lastSync).getTime())/60000):null;
 const earlyWarningAgeMinutes=earlyWarningLastSync?Math.floor((Date.now()-new Date(earlyWarningLastSync).getTime())/60000):null;
 const stateScanAgeMinutes=stateScanLastSync?Math.floor((Date.now()-new Date(stateScanLastSync).getTime())/60000):null;
 const fresh=ageMinutes!==null && ageMinutes<=75;
 const earlyWarningFresh=earlyWarningAgeMinutes!==null && earlyWarningAgeMinutes<=75;
 const stateScanFresh=stateScanAgeMinutes!==null && stateScanAgeMinutes<=75;
 const online=sources.filter(x=>x.status==="ONLINE").length;
 const degraded=sources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length;
 const checked=sources.filter(x=>x.lastChecked).length;
 const precursorIds=new Set(["cdc_content","mn_health_food","wi_health_food"]);
 const precursorSources=sources.filter(x=>precursorIds.has(x.id));
 const stateSources=sources.filter(x=>String(x.id||"").startsWith("state_"));
 const coverage=s.stateCoverage||{total:51,checked:0,online:0,degraded:0,signals:0,lastSync:null};

 return Response.json({
   live:fresh && checked>0,
   stale:Boolean(lastSync)&&!fresh,
   lastSync,
   ageMinutes,
   cycleMinutes:30,
   incidents:(s.incidents||[]).length,
   investigations:(s.investigations||[]).length,
   sourcesOnline:online,
   sourceIssues:degraded,
   sourcesChecked:checked,
   earlyWarning:{
     live:earlyWarningFresh && precursorSources.some(x=>x.status==="ONLINE"),
     lastSync:earlyWarningLastSync,
     ageMinutes:earlyWarningAgeMinutes,
     cycleMinutes:30,
     sourcesOnline:precursorSources.filter(x=>x.status==="ONLINE").length,
     sourceIssues:precursorSources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length,
     sourcesChecked:precursorSources.filter(x=>x.lastChecked).length
   },
   stateSurveillance:{
     live:stateScanFresh && coverage.checked===51,
     lastSync:stateScanLastSync,
     ageMinutes:stateScanAgeMinutes,
     cycleMinutes:30,
     jurisdictionsTotal:51,
     jurisdictionsChecked:coverage.checked||0,
     jurisdictionsOnline:coverage.online||0,
     jurisdictionIssues:coverage.degraded||0,
     stateSignals:coverage.signals||0,
     healthEntries:stateSources.length
   }
 },{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/system-status"};
