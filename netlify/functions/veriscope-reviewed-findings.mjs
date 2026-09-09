import crypto from 'node:crypto';
import {getStore} from '@netlify/blobs';
import {audit,json,rateLimit,readBody} from './lib/public-safety.mjs';
import {normalizeReviewedFinding} from './lib/veriscope-findings.mjs';

const env=name=>typeof Netlify!=='undefined'?(Netlify.env.get(name)||''):'';
const equalSecret=(actual,expected)=>{const a=Buffer.from(String(actual||'')),b=Buffer.from(String(expected||''));return a.length===b.length&&a.length>0&&crypto.timingSafeEqual(a,b)};

export default async function(req){
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(!await rateLimit(req,'veriscope-reviewed-findings',60,10))return json({error:'Rate limit exceeded'},429);
  const configured=env('SAFEPLATE_VERISCOPE_FINDINGS_TOKEN'),supplied=(req.headers.get('authorization')||'').replace(/^Bearer\s+/i,'');
  if(!configured)return json({error:'SERVICE_NOT_CONFIGURED'},503);
  if(!equalSecret(supplied,configured))return json({error:'UNAUTHORIZED'},401);
  try{
    const finding=normalizeReviewedFinding(await readBody(req,128000)),store=getStore({name:'safeplate-veriscope-reviewed',consistency:'strong'}),key=`findings/${finding.findingId}`,prior=await store.get(key,{type:'json'}).catch(()=>null);
    if(prior?.review?.reviewedAt===finding.review.reviewedAt)return json({accepted:true,duplicate:true,status:'REVIEWED_FINDING_ALREADY_STORED',findingId:finding.findingId,safeplateRecordId:finding.safeplateRecordId},200);
    await store.setJSON(key,finding);
    const previousStatus=await store.get('status/latest',{type:'json'}).catch(()=>null),status={state:'RECEIVED',lastReceivedAt:finding.receivedAt,lastFindingId:finding.findingId,lastSafeplateRecordId:finding.safeplateRecordId,acceptedCount:Number(previousStatus?.acceptedCount||0)+1,contractVersion:finding.contractVersion};
    await store.setJSON('status/latest',status);await audit('VERISCOPE_REVIEWED_FINDING_RECEIVED',req,{findingId:finding.findingId,safeplateRecordId:finding.safeplateRecordId,reviewedAt:finding.review.reviewedAt});
    return json({accepted:true,duplicate:false,status:'REVIEWED_FINDING_STORED',findingId:finding.findingId,safeplateRecordId:finding.safeplateRecordId},202);
  }catch(error){return json({error:error?.message||'INVALID_REVIEWED_FINDING'},error?.status||400)}
}

export const config={path:'/api/veriscope/reviewed-findings'};

