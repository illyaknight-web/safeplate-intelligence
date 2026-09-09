import { getState,saveState } from './lib/store.mjs';
import { requireAdmin } from './lib/auth.mjs';
const DECISIONS=new Set(['ACKNOWLEDGED','RESOLVED','DISMISSED']);
export default async req=>{
  const auth=requireAdmin(req);if(!auth.ok)return auth.response;
  const state=await getState();
  if(req.method==='GET')return Response.json({generatedAt:new Date().toISOString(),count:(state.reviewQueue||[]).length,items:(state.reviewQueue||[]).slice(0,250),recentDecisions:(state.reviewDecisions||[]).slice(0,100)},{headers:{'cache-control':'no-store'}});
  if(req.method!=='POST')return Response.json({error:'GET or POST required'},{status:405});
  let body;try{body=await req.json()}catch{return Response.json({error:'Valid JSON required'},{status:400})}
  const recordId=String(body.recordId||'').trim(),decision=String(body.decision||'').toUpperCase(),note=String(body.note||'').trim().slice(0,1000);
  if(!recordId||!DECISIONS.has(decision))return Response.json({error:'recordId and a valid decision are required'},{status:422});
  const item=(state.reviewQueue||[]).find(x=>x.id===recordId);if(!item)return Response.json({error:'Review item not found'},{status:404});
  const entry={recordId,decision,note,decidedAt:new Date().toISOString(),reasons:item.reasons||[]};
  state.reviewDecisions=[entry,...(state.reviewDecisions||[])].slice(0,1000);state.reviewQueue=(state.reviewQueue||[]).filter(x=>x.id!==recordId);await saveState(state);
  return Response.json({ok:true,...entry});
};
export const config={path:'/api/review-queue'};
