import test from 'node:test';
import assert from 'node:assert/strict';
import {isActionableRecall,searchRecallRecords,searchTerms} from '../netlify/functions/lib/recall-search.mjs';

const blueberry={id:'blueberry',rawSource:'fda_recall_announcements',title:'Northside recalls blueberry deli salad',product:'Northside Blueberry Deli Salad',company:'Made Fresh Salads',hazard:'Listeria',recallDate:'2026-09-06T00:00:00Z'};
const chicken={id:'chicken',rawSource:'fda_openfda',title:'Chicken recall',product:'Ready-to-eat chicken',hazard:'Listeria',recallDate:'2026-09-05T00:00:00Z'};
const generic={id:'generic',rawSource:'state_agency',title:'Food Safety',category:'agency information'};
const oldBlueberry={...blueberry,id:'old-blueberry',title:'Blueberry recall from last year',recallDate:'2025-09-01T00:00:00Z'};

test('singular and plural grocery terms normalize to the same human search term',()=>{
  assert.deepEqual(searchTerms('blueberry'),['blueberry']);
  assert.deepEqual(searchTerms('blueberries'),['blueberry']);
});

test('exact product search excludes unrelated recall records',()=>{
  const result=searchRecallRecords([blueberry,chicken],{query:'Are there any current blueberry recalls?'});
  assert.deepEqual(result.records.map(x=>x.id),['blueberry']);
  assert.equal(result.records[0].search_match,'EXACT_OR_ALL_TERMS');
});

test('generic state information pages are not actionable recalls',()=>{
  assert.equal(isActionableRecall(generic),false);
  assert.equal(searchRecallRecords([generic],{query:'food safety'}).records.length,0);
});

test('no exact match returns an empty record set for truthful no-match handling',()=>{
  assert.equal(searchRecallRecords([chicken],{query:'blueberries'}).records.length,0);
});

test('current-intent search excludes an otherwise exact historical product match',()=>{
  const result=searchRecallRecords([oldBlueberry],{query:'current blueberries',now:new Date('2026-09-07T12:00:00Z').getTime()});
  assert.equal(result.currentIntent,true);
  assert.equal(result.records.length,0);
});

test('a general product search labels old records as historical',()=>{
  const result=searchRecallRecords([oldBlueberry],{query:'blueberries',now:new Date('2026-09-07T12:00:00Z').getTime()});
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].temporal_match,'HISTORICAL');
});

test('a recent FDA report or verification timestamp cannot resurrect an old recall as current',()=>{
  const oldWithRecentUpdate={
    id:'old-fda-updated',rawSource:'fda_openfda',title:'Old FDA recall',product:'Old recalled food',status:'VERIFIED',
    recallDate:'2026-06-01T00:00:00Z',recall_initiation_date:'20260601',
    report_date:'20260915',verifiedAt:'2026-09-15T00:00:00Z',updatedAt:'2026-09-15T00:00:00Z'
  };
  const result=searchRecallRecords([oldWithRecentUpdate],{query:'current recalled food',now:new Date('2026-09-16T12:00:00Z').getTime()});
  assert.equal(result.records.length,0);
});

test('general search keeps a recently re-reported old FDA recall historical',()=>{
  const oldWithRecentUpdate={
    id:'old-fda-updated',rawSource:'fda_openfda',title:'Old FDA recall',product:'Old recalled food',status:'VERIFIED',
    recallDate:'2026-07-13T00:00:00Z',report_date:'20260915',verifiedAt:'2026-09-15T00:00:00Z'
  };
  const result=searchRecallRecords([oldWithRecentUpdate],{query:'recalled food',now:new Date('2026-09-16T12:00:00Z').getTime()});
  assert.equal(result.records.length,1);
  assert.equal(result.records[0].temporal_match,'HISTORICAL');
});
