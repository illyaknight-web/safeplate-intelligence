import { getState } from "./lib/store.mjs";
import { SOURCE_REGISTRY } from "./lib/sources.mjs";

const ageMinutes=value=>value?Math.floor((Date.now()-new Date(value).getTime())/60000):null;

export default async()=>{
 const s=await getState();
 const registry=new Map(SOURCE_REGISTRY.filter(Boolean).map(x=>[x.id,x]));
 const raw=(s.sourceHealth?.length?s.sourceHealth.filter(Boolean):SOURCE_REGISTRY.filter(Boolean).map(x=>({
   id:x.id,name:x.name,family:x.family,status:"PENDING",lastChecked:null,
   note:x.note||(x.active?"Not checked yet":"Connector pending")
 }))).filter(Boolean);

 // Reconciliation is persisted in meta so a later surveillance cycle cannot erase
 // completeness evidence merely by rebuilding sourceHealth.
 const reconLastAttempt=s.meta?.fdaReconciliationLastAttempt||s.meta?.fdaReconciliationLastSync||null;
 const reconLastSuccess=s.meta?.fdaReconciliationLastSync||null;
 const reconStatus=s.meta?.fdaReconciliationStatus||'PENDING';
 const reconAge=ageMinutes(reconLastAttempt);
 const reconFresh=reconAge!==null&&reconAge<=75;
 const reconHealthy=reconStatus==='RECONCILED'&&reconFresh&&Number(s.meta?.fdaReconciliationMissingAfter||0)===0;
 const reconciliation={
   id:'fda_reconciliation',name:'FDA authoritative reconciliation',family:'Federal',
   status:reconHealthy?'ONLINE':(reconLastAttempt?'DEGRADED':'PENDING'),lastChecked:reconLastAttempt,
   lastSuccess:reconLastSuccess,ageMinutes:reconAge,completenessState:reconHealthy?'RECONCILED':reconStatus,
   officialRecordCount:s.meta?.fdaReconciliationOfficialCount??null,
   announcementRecordCount:s.meta?.fdaReconciliationAnnouncementCount??null,
   openFDARecordCount:s.meta?.fdaReconciliationOpenFDACount??null,
   missingBefore:s.meta?.fdaReconciliationMissingBefore??null,
   backfilled:s.meta?.fdaReconciliationAdded??null,
   missingAfter:s.meta?.fdaReconciliationMissingAfter??null,
   error:s.meta?.fdaReconciliationError||null,
   note:reconHealthy?`${s.meta?.fdaReconciliationOfficialCount||0} authoritative FDA records reconciled; 0 missing after verification`:(s.meta?.fdaReconciliationError||'FDA reconciliation has not yet produced a fresh complete result')
 };
 const withoutRecon=raw.filter(x=>x?.id!=='fda_reconciliation');
 const combined=[...withoutRecon,reconciliation];

 // Public Source Health is an execution report, not a product roadmap.
 // Never present an unimplemented registry category as though it were a live source.
 const src=combined.filter(x=>{
   if(x.id==='fda_reconciliation')return true;
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
 const overall=!checked?"pending":age>75?"stale":(!reconHealthy||bad)?"degraded":"online";
 return Response.json({overall,lastSync,online,checked,issues:bad,completeness:{source:'FDA',state:reconciliation.completenessState,lastAttempt:reconLastAttempt,lastSuccessfulReconciliation:reconLastSuccess,ageMinutes:reconAge,officialRecordCount:reconciliation.officialRecordCount,missingBefore:reconciliation.missingBefore,backfilled:reconciliation.backfilled,missingAfter:reconciliation.missingAfter,error:reconciliation.error},sources:src,stateCoverage:s.stateCoverage||null},{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/source-health"};
