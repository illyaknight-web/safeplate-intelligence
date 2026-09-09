import { getState } from './lib/store.mjs';
import { requireAdmin } from './lib/auth.mjs';
export default async req=>{
 const auth=requireAdmin(req);if(!auth.ok)return auth.response;
 const state=await getState(),now=Date.now(),day=now-864e5,health=(state.sourceHealth||[]).filter(x=>x.lastChecked),events=(state.changeEvents||[]).filter(x=>new Date(x.time).getTime()>=day),review=state.reviewQueue||[];
 const sources=health.map(x=>({...x,ageMinutes:Math.max(0,Math.floor((now-new Date(x.lastChecked).getTime())/60000))}));
 return Response.json({generatedAt:new Date().toISOString(),system:{lastFullSync:state.meta?.lastFullSync||state.meta?.lastSync||null,lastCriticalSync:state.meta?.lastCriticalSync||null,fullCycleMinutes:30,criticalCycleMinutes:15,records:(state.incidents||[]).length},last24Hours:{newRecords:events.filter(x=>x.type==='NEW_RECORD').length,materialUpdates:events.filter(x=>x.type==='MATERIAL_UPDATE').length},review:{total:review.length,distributionUnresolved:review.filter(x=>x.reasons?.includes('distribution_unresolved')).length,identityInsufficient:review.filter(x=>x.reasons?.includes('product_identity_insufficient')).length,officialImageMissing:review.filter(x=>x.reasons?.includes('official_image_missing')).length},sources:{checked:sources.length,online:sources.filter(x=>x.status==='ONLINE').length,degraded:sources.filter(x=>x.status!=='ONLINE').length,items:sources},recentChanges:events.slice(0,100)},{headers:{'cache-control':'no-store'}})
};
export const config={path:'/api/operations-status'};
