import { getStore } from '@netlify/blobs';

export default async()=>{
  const latest=await getStore({name:'safeplate-veriscope-bridge',consistency:'strong'}).get('status/latest',{type:'json'}).catch(()=>null);
  const body=latest?{
    status:latest.status,mode:latest.mode||'SHADOW',lastCycleStartedAt:latest.started_at||null,
    lastCycleCompletedAt:latest.completed_at||null,recordsEvaluated:latest.records_evaluated||0,
    checkpoint:latest.checkpoint||null,contractVersion:latest.contract_version||'safeplate.veriscope.batch.v1',
    failureIsolation:'SAFEPLATE remains operational when VERISCOPE is disabled or unavailable.'
  }:{status:'NOT_RUN',mode:'SHADOW',recordsEvaluated:0,contractVersion:'safeplate.veriscope.batch.v1',failureIsolation:'SAFEPLATE remains operational when VERISCOPE is disabled or unavailable.'};
  return Response.json(body,{headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
};
export const config={path:'/api/veriscope-bridge-status'};
