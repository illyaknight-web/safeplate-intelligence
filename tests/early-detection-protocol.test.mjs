import test from 'node:test';
import assert from 'node:assert/strict';
import {assessEarlySignal,classifyEvidence,scoreEarlySignal,statusForScore,surveillanceSummary} from '../netlify/functions/lib/early-detection-protocol.mjs';

test('a fast recall remains Stage D recall monitoring',()=>{
  const a=assessEarlySignal({id:'r',category:'Formal recall',recallPublishedAt:'2026-09-08T12:00:00Z',sourcePostedAt:'2026-09-08T12:00:00Z',evidence:[{source:'FDA',status:'VERIFIED',text:'Formal recall'}]});
  assert.equal(a.stage,'D');assert.equal(a.qualifiesAsEarlyDetection,false);assert.match(a.languageGuard,/Recall monitoring/);
});

test('an official unresolved investigation can qualify as an early signal',()=>{
  const a=assessEarlySignal({id:'e',category:'Outbreak investigation',governmentInvestigationActive:true,sourcePostedAt:'2026-09-02',states:['NY','NJ'],summary:'FDA traceback of a multistate illness cluster; product not yet identified',evidence:[{source:'FDA Active Outbreak Investigations',status:'VERIFIED',text:'Active traceback; 12 illnesses'}]});
  assert.equal(a.stage,'B');assert.equal(a.formalRecallIssued,false);assert.ok(a.earlySignalScore>=20);assert.equal(a.qualifiesAsEarlyDetection,true);assert.equal(a.evidenceClassification,'CONFIRMED');
});

test('score is itemized and cannot be inflated by unsupported fields',()=>{
  const result=scoreEarlySignal({title:'anonymous complaint',evidence:[{source:'social media',text:'I felt sick'}]});
  assert.equal(result.score,0);assert.equal(result.components.length,8);assert.equal(result.components.reduce((n,x)=>n+x.maximum,0),100);assert.equal(statusForScore(result.score),'BACKGROUND');assert.equal(classifyEvidence({evidence:[{source:'social media',text:'claim'}]}),'UNVERIFIED');
});

test('lead time uses earliest credible signal and recall publication times',()=>{
  const a=assessEarlySignal({earliestCredibleSignalAt:'2026-09-02T12:00:00Z',recallPublishedAt:'2026-09-08T12:00:00Z'});
  assert.equal(a.potentialLeadTimeMinutes,8640);
});

test('cycle summary records lifecycle changes without inventing events',()=>{
  const previous=[{id:'x',earlyDetection:{earlySignalScore:25}}];
  const current=[{id:'x',earlyDetection:{earlySignalScore:45,formalRecallIssued:false,qualifiesAsEarlyDetection:true}},{id:'y',earlyDetection:{earlySignalScore:30,formalRecallIssued:false,qualifiesAsEarlyDetection:true}}];
  const s=surveillanceSummary(previous,current);assert.deepEqual(s.escalatedSignals,['x']);assert.deepEqual(s.newEarlySignals,['y']);assert.deepEqual(s.confirmedEvents,[]);
});
