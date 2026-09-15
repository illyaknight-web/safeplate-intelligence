import { getState } from "./lib/store.mjs";

const CURRENT_STATE_SCANNER_VERSION = "2.7";
const ageMinutes=value=>value?Math.floor((Date.now()-new Date(value).getTime())/60000):null;

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
 const lastSync=s.meta?.lastSync||null,criticalLastSync=s.meta?.lastCriticalSync||null,earlyWarningLastSync=s.meta?.earlyWarningLastSync||null,stateScanLastSync=s.meta?.stateScanLastSync||null;
 const surveillanceAge=ageMinutes(lastSync),earlyWarningAgeMinutes=ageMinutes(earlyWarningLastSync),stateScanAgeMinutes=ageMinutes(stateScanLastSync);
 const fresh=surveillanceAge!==null&&surveillanceAge<=75,earlyWarningFresh=earlyWarningAgeMinutes!==null&&earlyWarningAgeMinutes<=75,stateScanFresh=stateScanAgeMinutes!==null&&stateScanAgeMinutes<=75;
 const stateSources=sources.filter(x=>String(x.id||"").startsWith("state_")),feedSources=sources.filter(x=>!String(x.id||"").startsWith("state_")&&x.id!=='fda_reconciliation');
 const online=feedSources.filter(x=>x.status==="ONLINE").length,degraded=feedSources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length,checked=feedSources.filter(x=>x.lastChecked).length;
 const precursorIds=new Set(["cdc_content","mn_health_food","wi_health_food"]),precursorSources=feedSources.filter(x=>precursorIds.has(x.id));
 const coverage=s.stateCoverage||{total:51,checked:0,online:0,degraded:0,signals:0,lastSync:null,scannerVersion:null};
 const scannerVersion=coverage.scannerVersion||s.meta?.stateScanVersion||null;
 const stateScanDispatched=await kickStateScan(req,stateScanLastSync,scannerVersion);

 const reconciliationLastAttempt=s.meta?.fdaReconciliationLastAttempt||s.meta?.fdaReconciliationLastSync||null;
 const reconciliationAgeMinutes=ageMinutes(reconciliationLastAttempt);
 const reconciliationState=s.meta?.fdaReconciliationStatus||'PENDING';
 const completenessHealthy=reconciliationState==='RECONCILED'&&reconciliationAgeMinutes!==null&&reconciliationAgeMinutes<=75&&Number(s.meta?.fdaReconciliationMissingAfter||0)===0;
 const live=fresh&&checked>0;
 const overallState=!live?(lastSync?'STALE':'UNKNOWN'):completenessHealthy?'LIVE':'DEGRADED';

 return Response.json({
   state:overallState,live,stale:Boolean(lastSync)&&!fresh,reconciled:completenessHealthy,lastSync,ageMinutes:surveillanceAge,cycleMinutes:30,
   completeness:{source:'FDA',state:completenessHealthy?'RECONCILED':reconciliationState,lastAttempt:reconciliationLastAttempt,lastSuccessfulReconciliation:s.meta?.fdaReconciliationLastSync||null,ageMinutes:reconciliationAgeMinutes,officialRecordCount:s.meta?.fdaReconciliationOfficialCount??null,announcementRecordCount:s.meta?.fdaReconciliationAnnouncementCount??null,openFDARecordCount:s.meta?.fdaReconciliationOpenFDACount??null,missingBefore:s.meta?.fdaReconciliationMissingBefore??null,backfilled:s.meta?.fdaReconciliationAdded??null,missingAfter:s.meta?.fdaReconciliationMissingAfter??null,error:s.meta?.fdaReconciliationError||null},
   criticalSources:{lastSync:criticalLastSync,cycleMinutes:15,ageMinutes:ageMinutes(criticalLastSync)},incidents:(s.incidents||[]).length,investigations:(s.investigations||[]).length,sourcesOnline:online,sourceIssues:degraded,sourcesChecked:checked,stateScanDispatched,reviewQueue:(s.reviewQueue||[]).length,recentMaterialChanges:(s.changeEvents||[]).filter(x=>x.type==='MATERIAL_UPDATE'&&Date.now()-new Date(x.time).getTime()<864e5).length,
   earlyWarning:{live:earlyWarningFresh&&precursorSources.some(x=>x.status==="ONLINE"),lastSync:earlyWarningLastSync,ageMinutes:earlyWarningAgeMinutes,cycleMinutes:30,sourcesOnline:precursorSources.filter(x=>x.status==="ONLINE").length,sourceIssues:precursorSources.filter(x=>["DEGRADED","OFFLINE"].includes(x.status)).length,sourcesChecked:precursorSources.filter(x=>x.lastChecked).length},
   stateSurveillance:{live:stateScanFresh&&coverage.checked===51&&scannerVersion===CURRENT_STATE_SCANNER_VERSION,scannerVersion,lastSync:stateScanLastSync,ageMinutes:stateScanAgeMinutes,cycleMinutes:30,jurisdictionsTotal:51,jurisdictionsChecked:coverage.checked||0,jurisdictionsOnline:coverage.online||0,jurisdictionIssues:coverage.degraded||0,stateSignals:coverage.signals||0,healthEntries:stateSources.length}
 },{headers:{"cache-control":"no-store"}})
};
export const config={path:"/api/system-status"};
