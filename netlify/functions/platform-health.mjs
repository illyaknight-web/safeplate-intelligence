import { getStore } from '@netlify/blobs';
import { getState } from './lib/store.mjs';

const env=(name)=>process.env[name]||globalThis.Netlify?.env?.get?.(name)||null;
const ageMinutes=(value)=>value?Math.floor((Date.now()-new Date(value).getTime())/60000):null;

export default async()=>{
  const [state,bridge]=await Promise.all([
    getState(),
    getStore({name:'safeplate-veriscope-bridge',consistency:'strong'}).get('status/latest',{type:'json'}).catch(()=>null)
  ]);

  const lastSync=state.meta?.lastSync||null;
  const criticalLastSync=state.meta?.lastCriticalSync||null;
  const earlyWarningLastSync=state.meta?.earlyWarningLastSync||null;
  const stateScanLastSync=state.meta?.stateScanLastSync||null;
  const sources=Array.isArray(state.sourceHealth)?state.sourceHealth:[];
  const checked=sources.filter(x=>x.lastChecked).length;
  const coverage=state.stateCoverage||{};
  const bridgeCompleted=bridge?.completed_at||null;

  const health={
    checkedAt:new Date().toISOString(),
    deployment:{
      commit:env('COMMIT_REF'),
      deployId:env('DEPLOY_ID'),
      context:env('CONTEXT'),
      productionUrl:env('URL')||'https://safeplate-intelligence.netlify.app'
    },
    safeplate:{
      live:Boolean(lastSync)&&ageMinutes(lastSync)<=75&&checked>0,
      lastSync,
      ageMinutes:ageMinutes(lastSync),
      criticalSources:{lastSync:criticalLastSync,ageMinutes:ageMinutes(criticalLastSync),cycleMinutes:15},
      earlyWarning:{lastSync:earlyWarningLastSync,ageMinutes:ageMinutes(earlyWarningLastSync),live:Boolean(earlyWarningLastSync)&&ageMinutes(earlyWarningLastSync)<=75},
      stateSurveillance:{lastSync:stateScanLastSync,ageMinutes:ageMinutes(stateScanLastSync),checked:coverage.checked||0,total:coverage.total||51,scannerVersion:coverage.scannerVersion||state.meta?.stateScanVersion||null,live:Boolean(stateScanLastSync)&&ageMinutes(stateScanLastSync)<=75&&(coverage.checked||0)===51},
      sourcesChecked:checked
    },
    veriscope:{
      status:bridge?.status||'NOT_RUN',
      mode:bridge?.mode||'SHADOW',
      lastCycleStartedAt:bridge?.started_at||null,
      lastCycleCompletedAt:bridgeCompleted,
      ageMinutes:ageMinutes(bridgeCompleted),
      recordsEvaluated:bridge?.records_evaluated||0,
      error:bridge?.error||null,
      deadLetter:bridge?.dead_letter||null,
      cadenceMinutes:15
    }
  };

  const bridgeHealthy=['SHADOW_NO_CHANGES','SHADOW_DELIVERED'].includes(health.veriscope.status)&&health.veriscope.ageMinutes!==null&&health.veriscope.ageMinutes<=35&&!health.veriscope.error;
  health.healthy=health.safeplate.live&&health.safeplate.criticalSources.ageMinutes!==null&&health.safeplate.criticalSources.ageMinutes<=35&&health.safeplate.earlyWarning.live&&health.safeplate.stateSurveillance.live&&bridgeHealthy;

  return Response.json(health,{status:health.healthy?200:503,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
};

export const config={path:'/api/platform-health'};
