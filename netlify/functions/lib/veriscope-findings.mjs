const clean=(value,max=2000)=>String(value??'').replace(/[\u0000-\u001f<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);

export function normalizeReviewedFinding(body={}){
  if(body.contract_version!=='veriscope.safeplate.finding.v1')throw Object.assign(new Error('UNSUPPORTED_CONTRACT_VERSION'),{status:422});
  if(body.review?.human_approved!==true||String(body.review?.status).toUpperCase()!=='APPROVED')throw Object.assign(new Error('HUMAN_APPROVAL_REQUIRED'),{status:422});
  const findingId=clean(body.finding_id,180),recordId=clean(body.safeplate_record_id,180),reviewer=clean(body.review?.reviewer,180),reviewedAt=body.review?.reviewed_at;
  if(!findingId||!recordId||!reviewer||!reviewedAt)throw Object.assign(new Error('FINDING_ID_RECORD_ID_REVIEWER_AND_REVIEW_TIME_REQUIRED'),{status:422});
  if(!Array.isArray(body.evidence)||!body.evidence.length||!body.provenance)throw Object.assign(new Error('EVIDENCE_AND_PROVENANCE_REQUIRED'),{status:422});
  return {
    contractVersion:'veriscope.safeplate.finding.v1',findingId,safeplateRecordId:recordId,
    title:clean(body.title||body.assessment,500),assessment:clean(body.assessment,1600),explanation:clean(body.explanation,3000),
    confidence:Number.isFinite(Number(body.confidence))?Number(body.confidence):null,risk:body.risk||null,
    review:{status:'APPROVED',humanApproved:true,reviewer,notes:clean(body.review?.notes,3000),reviewedAt},
    provenance:body.provenance,evidence:body.evidence.slice(0,25).map(item=>({type:clean(item?.type,80),status:clean(item?.status,80),source:clean(item?.source,180),url:/^https:\/\//i.test(String(item?.url||''))?String(item.url):null,text:clean(item?.text,1600)})),
    receivedAt:new Date().toISOString(),sourceSystem:'VERISCOPE_CORE'
  };
}

