import crypto from 'node:crypto';
const array=v=>Array.isArray(v)?v:[];
const clean=v=>String(v||'').trim();
const hash=v=>crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,24);
const iso=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d.toISOString():null};

function matchKey(record){return clean(record.canonicalProductId)||clean(record.correlation?.clusterId)||clean(record.fdaReference)||clean(record.id)}
function evidenceSnapshot(record,observedAt){return {capturedAt:observedAt,hash:hash(JSON.stringify({id:record.id,title:record.title,summary:record.summary,evidence:record.evidence,earlyDetection:record.earlyDetection})),sourceUrls:[...new Set(array(record.evidence).map(x=>x?.url).filter(Boolean))],score:record.earlyDetection?.earlySignalScore??null,status:record.earlyDetection?.earlySignalStatus??null,classification:record.earlyDetection?.evidenceClassification??null}}

export function updateShadowLedger(existing={},records=[],now=new Date().toISOString()){
  const observedAt=iso(now),entries={...((existing||{}).entries||{})};
  for(const record of records){
    const early=record.earlyDetection;if(!early)continue;
    const key=matchKey(record);if(!key)continue;
    const prior=entries[key],snapshot=evidenceSnapshot(record,observedAt);
    if(!prior&&early.qualifiesAsEarlyDetection){entries[key]={key,recordIds:[record.id],firstQualifiedAt:observedAt,firstSignalAt:early.earliestCredibleSignalAt||observedAt,initialScore:early.earlySignalScore,latestScore:early.earlySignalScore,state:'OPEN_SHADOW',outcome:null,humanAdjudicationRequired:true,snapshots:[snapshot]};continue}
    if(!prior)continue;
    const changed=prior.snapshots?.at(-1)?.hash!==snapshot.hash;
    const formal=early.formalRecallIssued===true;
    entries[key]={...prior,recordIds:[...new Set([...array(prior.recordIds),record.id])],latestScore:early.earlySignalScore,lastObservedAt:observedAt,state:formal?'CONFIRMED_AFTER_SIGNAL':prior.state,outcome:formal?'TRUE_POSITIVE':prior.outcome,confirmedAt:formal?(early.earliestConventionalAlertAt||observedAt):prior.confirmedAt,snapshots:changed?[...array(prior.snapshots),snapshot].slice(-50):array(prior.snapshots)};
  }
  return buildShadowReport(entries,observedAt);
}

export function adjudicateShadowEntry(ledger={},key,decision,reviewer,notes='',now=new Date().toISOString()){
  const allowed=new Set(['TRUE_POSITIVE','FALSE_POSITIVE','FALSE_NEGATIVE','TRUE_NEGATIVE','INCONCLUSIVE']);
  if(!allowed.has(decision))throw new Error('Unsupported adjudication decision');
  if(!clean(reviewer))throw new Error('Reviewer identity is required');
  const entries={...(ledger.entries||{})},entry=entries[key];if(!entry)throw new Error('Shadow entry not found');
  entries[key]={...entry,state:'ADJUDICATED',outcome:decision,adjudication:{reviewer:clean(reviewer),notes:clean(notes),decidedAt:iso(now)}};
  return buildShadowReport(entries,iso(now));
}

function buildShadowReport(entries,generatedAt){
  const rows=Object.values(entries),adjudicated=rows.filter(x=>x.state==='ADJUDICATED'||x.state==='CONFIRMED_AFTER_SIGNAL');
  const count=o=>adjudicated.filter(x=>x.outcome===o).length,tp=count('TRUE_POSITIVE'),fp=count('FALSE_POSITIVE'),fn=count('FALSE_NEGATIVE'),tn=count('TRUE_NEGATIVE');
  const leads=adjudicated.filter(x=>x.outcome==='TRUE_POSITIVE'&&x.firstSignalAt&&x.confirmedAt).map(x=>(new Date(x.confirmedAt)-new Date(x.firstSignalAt))/3600000).filter(x=>Number.isFinite(x)&&x>=0);
  const minimum={prospectiveAdjudicatedEvents:20,prospectiveTruePositives:5,prospectiveNegativeControls:5,measurableLeadTimes:5,minimumObservationDays:90};
  const first=rows.map(x=>new Date(x.firstQualifiedAt).getTime()).filter(Number.isFinite).sort()[0],days=first?Math.floor((new Date(generatedAt)-first)/86400000):0;
  const eligible=adjudicated.length>=minimum.prospectiveAdjudicatedEvents&&tp>=minimum.prospectiveTruePositives&&(fp+tn)>=minimum.prospectiveNegativeControls&&leads.length>=minimum.measurableLeadTimes&&days>=minimum.minimumObservationDays;
  return {protocolVersion:'SAFEPLATE-SHADOW-1.0',generatedAt,entries,summary:{open:rows.filter(x=>x.state==='OPEN_SHADOW').length,adjudicated:adjudicated.length,truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn,inconclusive:count('INCONCLUSIVE'),observationDays:days,meanLeadTimeHours:leads.length?+(leads.reduce((a,b)=>a+b,0)/leads.length).toFixed(2):null},minimum,releaseGate:eligible?'ELIGIBLE_FOR_INDEPENDENT_REVIEW':'HOLD_PROSPECTIVE_VALIDATION'};
}
