import {requireAdmin} from './lib/auth.mjs';
import {runEarlyWarning} from './early-warning.mjs';

export default async req=>{
  const auth=requireAdmin(req);
  if(!auth.ok)return auth.response;
  if(req.method!=='POST')return Response.json({error:'Method not allowed'},{status:405,headers:{allow:'POST'}});
  const state=await runEarlyWarning();
  return Response.json({
    completedAt:state.meta?.earlyWarningLastSync||new Date().toISOString(),
    protocolVersion:state.shadowValidation?.protocolVersion||'SAFEPLATE-SHADOW-1.0',
    releaseGate:state.shadowValidation?.releaseGate||'HOLD_PROSPECTIVE_VALIDATION',
    summary:state.shadowValidation?.summary||{open:0,adjudicated:0},
    sourcesChecked:state.earlyDetectionSummary?.systemPerformance?.sourcesChecked??null,
    recordsProcessed:state.earlyDetectionSummary?.systemPerformance?.recordsProcessed??null
  },{headers:{'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow','x-safeplate-shadow-protocol':'SAFEPLATE-SHADOW-1.0'}});
};

export const config={path:'/api/shadow-cycle'};
