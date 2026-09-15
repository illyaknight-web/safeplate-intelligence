const array=v=>Array.isArray(v)?v:[];
const date=v=>{const d=v?new Date(v):null;return d&&!Number.isNaN(d.getTime())?d:null};
const norm=v=>String(v||'').toLowerCase();

function timelineDate(entry,pattern){const hit=array(entry.timeline).find(x=>Array.isArray(x)&&pattern.test(norm(x[1])));return date(hit?.[0])}
export function evaluateHistoricalCase(entry={}){
  const earliest=date(entry.earliest_credible_signal_at)||timelineDate(entry,/earliest credible|notified .*partner|investigation|traceback/);
  const recall=date(entry.recall_published_at)||timelineDate(entry,/\brecall\b/);
  const explicitlyLabeled=typeof entry.ground_truth_positive==='boolean';
  const hasObservation=typeof entry.safeplate_would_escalate==='boolean'||Boolean(earliest);
  if(!explicitlyLabeled&&!recall||!hasObservation)return {id:entry.id||null,outcome:'INSUFFICIENT_DATA',earliestCredibleSignalAt:earliest?.toISOString()||null,recallPublishedAt:recall?.toISOString()||null,leadTimeHours:null,temporallyValid:false,limitations:[...array(entry.limitations),'Missing a dated pre-recall observation and/or explicit ground-truth label.']};
  const predicted=entry.safeplate_would_escalate===true||Boolean(earliest);
  const actual=entry.ground_truth_positive===true||Boolean(recall)||/ongoing|confirmed/i.test(String(entry.status||''));
  const outcome=predicted&&actual?'TRUE_POSITIVE':predicted&&!actual?'FALSE_POSITIVE':!predicted&&actual?'FALSE_NEGATIVE':'TRUE_NEGATIVE';
  const leadTimeHours=earliest&&recall?+((recall-earliest)/3600000).toFixed(2):null;
  return {id:entry.id||null,outcome,earliestCredibleSignalAt:earliest?.toISOString()||null,recallPublishedAt:recall?.toISOString()||null,leadTimeHours,temporallyValid:leadTimeHours===null||leadTimeHours>=0,limitations:array(entry.limitations)};
}

export function runBacktest(corpus={}){
  const cases=array(corpus.cases).map(evaluateHistoricalCase),valid=cases.filter(x=>x.temporallyValid&&x.outcome!=='INSUFFICIENT_DATA');
  const count=k=>valid.filter(x=>x.outcome===k).length,tp=count('TRUE_POSITIVE'),fp=count('FALSE_POSITIVE'),fn=count('FALSE_NEGATIVE'),tn=count('TRUE_NEGATIVE');
  const leads=valid.map(x=>x.leadTimeHours).filter(Number.isFinite);
  const sensitivity=tp+fn?tp/(tp+fn):null,precision=tp+fp?tp/(tp+fp):null,falsePositiveRate=fp+tn?fp/(fp+tn):null;
  const adequate=valid.length>=10&&(fp+tn)>=3&&leads.length>=3;
  return {protocolVersion:'SAFEPLATE-BACKTEST-1.0',generatedAt:new Date().toISOString(),caseCount:cases.length,validCaseCount:valid.length,insufficientDataCaseCount:cases.filter(x=>x.outcome==='INSUFFICIENT_DATA').length,confusionMatrix:{truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn},metrics:{sensitivity,precision,falsePositiveRate,meanLeadTimeHours:leads.length?+(leads.reduce((a,b)=>a+b,0)/leads.length).toFixed(2):null,measurableLeadTimeCases:leads.length},releaseGate:adequate?'ELIGIBLE_FOR_HUMAN_REVIEW':'HOLD_INSUFFICIENT_VALIDATION',minimumEvidence:{historicalCases:10,negativeControls:3,measurableLeadTimeCases:3},cases};
}
