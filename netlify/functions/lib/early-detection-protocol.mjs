const array=value=>Array.isArray(value)?value:[];
const text=value=>String(value||'').replace(/\s+/g,' ').trim();
const iso=value=>{if(!value)return null;const d=new Date(value);return Number.isNaN(d.getTime())?null:d.toISOString()};

export const EARLY_SIGNAL_SCORE_WEIGHTS=Object.freeze({
  governmentInvestigation:25,
  laboratoryEvidence:20,
  epidemiologicalCluster:15,
  tracebackEvidence:15,
  independentJurisdictions:10,
  historicalAssociation:5,
  facilityHistory:5,
  supplyChainCorrelation:5
});

export function sourceTier(source=''){
  const s=text(source).toLowerCase();
  if(/fda|cdc|usda|fsis|epa|department of (?:health|agriculture)|health department|public health|government|county|city of/.test(s))return 1;
  if(/university|laborator|journal|peer.review|company notice|manufacturer/.test(s))return 2;
  if(/reuters|associated press| ap |new york times|washington post|named official/.test(` ${s} `))return 3;
  if(/industry|trade|foodsafety|food safety news/.test(s))return 4;
  return 5;
}

function evidenceText(record){return text(array(record.evidence).map(e=>`${e?.type||''} ${e?.status||''} ${e?.source||''} ${e?.text||''}`).join(' ')).toLowerCase()}
function unique(values){return [...new Set(values.map(text).filter(Boolean))]}
function points(key,awarded,reason){return {component:key,awarded:Math.max(0,Math.min(EARLY_SIGNAL_SCORE_WEIGHTS[key],awarded)),maximum:EARLY_SIGNAL_SCORE_WEIGHTS[key],reason}}

export function scoreEarlySignal(record={}){
  const body=`${text(record.title)} ${text(record.summary)} ${evidenceText(record)}`.toLowerCase();
  const evidence=array(record.evidence),tiers=evidence.map(e=>sourceTier(e?.source));
  const officialInvestigation=record.governmentInvestigationActive===true||(/\b(investigat|traceback|outbreak)\w*\b/.test(body)&&tiers.includes(1));
  const lab=/\b(laboratory|lab positive|positive sample|environmental sample|product sample|whole.genome|\bwgs\b|sequenc|isolate)\b/.test(body);
  const epi=/\b(cluster|case count|cases|illnesses|hospitali[sz]ed|epidemiolog|multistate)\b/.test(body);
  const traceback=/\b(traceback|traced to|converging on)\b/.test(body);
  const jurisdictions=unique(array(record.jurisdictions).concat(array(record.states),array(record.locations).map(x=>typeof x==='string'?x:x?.state||x?.country)));
  const independentSources=unique(evidence.map(e=>e?.source));
  const historical=record.historicalAssociation===true;
  const facility=/\b(warning letter|form 483|consent decree|repeat(?:ed)? violation|facility history|sanitation citation|haccp failure)\b/.test(body);
  const supply=/\b(distribution overlap|supply.chain correlation|same supplier|same distributor|same importer|geographic overlap)\b/.test(body)&&independentSources.length>=2;
  const components=[
    points('governmentInvestigation',officialInvestigation?25:0,officialInvestigation?'Authoritative source describes an active investigation or traceback.':'No authoritative active investigation established.'),
    points('laboratoryEvidence',lab?(tiers.includes(1)?20:10):0,lab?(tiers.includes(1)?'Authoritative laboratory, sampling, sequencing, or isolate evidence.':'Laboratory evidence exists but is not authoritative.'):'No laboratory evidence established.'),
    points('epidemiologicalCluster',epi?(tiers.includes(1)?15:8):0,epi?'Illness clustering or epidemiological evidence is described.':'No epidemiological cluster established.'),
    points('tracebackEvidence',traceback?(tiers.includes(1)?15:8):0,traceback?'Traceback activity or convergence is described.':'No traceback evidence established.'),
    points('independentJurisdictions',jurisdictions.length>=3?10:jurisdictions.length===2?6:0,jurisdictions.length>=2?`${jurisdictions.length} jurisdictions independently represented.`:'Multiple jurisdictions not established.'),
    points('historicalAssociation',historical?5:0,historical?'Historical food/hazard association was explicitly supplied.':'Historical association not used as evidence.'),
    points('facilityHistory',facility?5:0,facility?'Relevant regulatory or facility history is documented.':'No relevant facility history documented.'),
    points('supplyChainCorrelation',supply?5:0,supply?'Supply-chain or geographic correlation is supported by multiple sources.':'No corroborated supply-chain correlation established.')
  ];
  return {score:components.reduce((sum,x)=>sum+x.awarded,0),components};
}

export function statusForScore(score){
  if(score>=90)return 'CONFIRMED / CRITICAL';
  if(score>=75)return 'HIGH CONCERN';
  if(score>=60)return 'ELEVATED';
  if(score>=40)return 'WATCH';
  if(score>=20)return 'SIGNAL';
  return 'BACKGROUND';
}

export function classifyEvidence(record={}){
  const evidence=array(record.evidence),tiers=evidence.map(e=>sourceTier(e?.source)),sources=unique(evidence.map(e=>e?.source));
  const confirmed=evidence.some(e=>/confirmed|verified/i.test(`${e?.status||''}`)&&sourceTier(e?.source)===1);
  if(confirmed)return 'CONFIRMED';
  if(sources.length>=2&&tiers.some(t=>t<=2))return 'CORROBORATED';
  if(tiers.some(t=>t<=2))return 'PRELIMINARY';
  if(evidence.length)return 'UNVERIFIED';
  return 'ASSESSED';
}

export function assessEarlySignal(record={},now=new Date().toISOString()){
  const {score,components}=scoreEarlySignal(record);
  const recallAt=iso(record.recallPublishedAt||record.recallDate||record.earliestConventionalAlertAt);
  const earliest=iso(record.earliestCredibleSignalAt||record.sourcePostedAt||record.eventDate||record.firstSeenAt);
  const leadTimeMinutes=recallAt&&earliest?Math.round((new Date(recallAt)-new Date(earliest))/60000):null;
  const formalRecall=Boolean(record.formalRecallIssued||recallAt||/\bformal recall\b/i.test(text(record.category)));
  const stage=formalRecall?'D':record.preRecallConfirmation===true?'C':record.governmentInvestigationActive===true||/investigation/i.test(text(record.category))?'B':'A';
  return {
    protocolVersion:'SAFEPLATE-EARLY-DETECTION-1.0',
    assessedAt:iso(now),stage,formalRecallIssued:formalRecall,
    governmentInvestigationActive:record.governmentInvestigationActive===true?'YES':record.governmentInvestigationActive===false?'NO':'UNKNOWN',
    earlySignalScore:score,earlySignalStatus:statusForScore(score),scoreExplanation:components,
    evidenceClassification:classifyEvidence(record),earliestCredibleSignalAt:earliest,
    earliestConventionalAlertAt:recallAt,potentialLeadTimeMinutes:leadTimeMinutes,
    qualifiesAsEarlyDetection:!formalRecall&&['A','B','C'].includes(stage)&&score>=20,
    languageGuard:formalRecall?'Recall monitoring unless a preserved Stage A–C record predates this action.':'Potential early signal; not proof of contamination or a confirmed outbreak.'
  };
}

export function surveillanceSummary(previous=[],current=[]){
  const old=new Map(previous.map(x=>[x.id,x.earlyDetection||assessEarlySignal(x)]));
  const groups={newEarlySignals:[],escalatedSignals:[],deEscalatedSignals:[],confirmedEvents:[],rejectedSignals:[]};
  for(const record of current){const a=record.earlyDetection||assessEarlySignal(record),before=old.get(record.id);if(!before&&a.qualifiesAsEarlyDetection)groups.newEarlySignals.push(record.id);if(before&&a.earlySignalScore>before.earlySignalScore)groups.escalatedSignals.push(record.id);if(before&&a.earlySignalScore<before.earlySignalScore)groups.deEscalatedSignals.push(record.id);if(a.formalRecallIssued)groups.confirmedEvents.push(record.id);if(record.rejectedSignal===true)groups.rejectedSignals.push(record.id)}
  return groups;
}
