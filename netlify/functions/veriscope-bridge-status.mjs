import {getStore} from '@netlify/blobs';

export default async()=>{
  const outboundStore=getStore({name:'safeplate-veriscope-bridge',consistency:'strong'}),feedbackStore=getStore({name:'safeplate-veriscope-reviewed',consistency:'strong'});
  const [latest,feedback]=await Promise.all([outboundStore.get('status/latest',{type:'json'}).catch(()=>null),feedbackStore.get('status/latest',{type:'json'}).catch(()=>null)]);
  const body={
    status:latest?.status||'NOT_RUN',mode:latest?.mode||'SHADOW',lastCycleStartedAt:latest?.started_at||null,
    lastCycleCompletedAt:latest?.completed_at||null,recordsEvaluated:latest?.records_evaluated||0,
    checkpoint:latest?.checkpoint||null,contractVersion:latest?.contract_version||'safeplate.veriscope.batch.v1',
    cadenceMinutes:15,
    reviewedFeedback:feedback?{state:feedback.state,lastReceivedAt:feedback.lastReceivedAt,acceptedCount:feedback.acceptedCount||0,contractVersion:feedback.contractVersion}:{state:'READY',lastReceivedAt:null,acceptedCount:0,contractVersion:'veriscope.safeplate.finding.v1'},
    policy:'Only human-approved VERISCOPE findings are accepted back into SAFEPLATE.',
    failureIsolation:'SAFEPLATE remains operational when VERISCOPE is disabled or unavailable.'
  };
  return Response.json(body,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};
export const config={path:'/api/veriscope-bridge-status'};

