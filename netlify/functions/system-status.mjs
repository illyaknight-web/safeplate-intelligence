import { getState } from "./lib/store.mjs";

const CURRENT_STATE_SCANNER_VERSION = "2.3";

async function kickStateScan(req, stateScanLastSync, scannerVersion){
  const age=stateScanLastSync?Math.floor((Date.now()-new Date(stateScanLastSync).getTime())/60000):9999;
  if(age<=35 && scannerVersion===CURRENT_STATE_SCANNER_VERSION)return false;
  const token=Netlify.env.get("SAFEPLATE_ADMIN_TOKEN");
  if(!token)return false;
  try{
    const origin=new URL(req.url).origin;
    const r=await fetch(`${origin}/.netlify/functions/state-scan-background`,{
      method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},body:"{}"
    });
    return r.ok||r.status===202;
  }catch{return false}
}

export default async(req)=>{
 const s=await getState(),sources=s.sourceHealth||[];
 const lastSync=s.meta?.lastSync||null,earlyWarningLastSync=s.meta?.earlyWarningLastSync||null,stateScanLastSync=s.meta?.stateScanLastSync||null;
 const ageMinutes=lastSync?Math.floor((Date.now()-new Date(lastSync).getTime())/60000):null;
 const earlyWarningAgeMinutes=earlyWarningLastSync?Math.floor((Date.now()-new Date(earlyWarningLastSync).getTime())/60000):null;
 const stateScanAgeMinutes=stateScanLastSync?Math.floor((Date.now()-new Date(stateScanLastSync).getTime())/60000):null;
 const fresh=ageMinutes!==null&&ageMinutes<=75,earlyWarningFresh=earlyWarningAgeMinutes!==null&&earlyWarningAgeMinutes<=75,stateScanFresh=stateScanAgeMinutes!==null&&stateScanAgeMinutes<=75;
 const stateSources=sources.filter(x=>String(x.id||"").startsWith("state_")),feedSources=sources.filter(x=>!String(x.id||"").startsWith("state_"));
 const online=feedSources.filter(x=>x.status==="ONLINE").length,degraded=feedSources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length,checked=feedSources.filter(x=>x.lastChecked).length;
 const precursorIds=new Set(["cdc_content","mn_health_food","wi_health_food"]),precursorSources=feedSources.filter(x=>precursorIds.has(x.id));
 const coverage=s.stateCoverage||{total:51,checked:0,online:0,degraded:0,signals:0,lastSync:null,scannerVersion:null};
 const scannerVersion=coverage.scannerVersion||s.meta?.stateScanVersion||null;
 const stateScanDispatched=await kickStateScan(req,stateScanLastSync,scannerVersion);
 return Response.json({
   live:fresh&&checked>0,stale:Boolean(lastSync)&&!fresh,lastSync,ageMinutes,cycleMinutes:30,incidents:(s.incidents||[]).length,investigations:(s.investigations||[]).length,sourcesOnline:online,sourceIssues:degraded,sourcesChecked:checked,stateScanDispatched,
   earlyWarning:{live:earlyWarningFresh&&precursorSources.some(x=>x.status==="ONLINE"),lastSync:earlyWarningLastSync,ageMinutes:earlyWarningAgeMinutes,cycleMinutes:30,sourcesOnline:precursorSources.filter(x=>x.status==="ONLINE").length,sourceIssues:precursorSources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length,sourcesChecked:precursorSources.filter(x=>x.lastChecked).length},
   stateSurveillance:{live:stateScanFresh&&coverage.checked===51&&scannerVersion===CURRENT_STATE_SCANNER_VERSION,scannerVersion,lastSync:stateScanLastSync,ageMinutes:stateScanAgeMinutes,cycleMinutes:30,jurisdictionsTotal:51,jurisdictionsChecked:coverage.checked||0,jurisdictionsOnline:coverage.online||0,jurisdictionIssues:coverage.degraded||0,stateSignals:coverage.signals||0,healthEntries:stateSources.length}
 },{headers:{"cache-control":"no-store"}})
};
export const config={path:"/api/system-status"};
