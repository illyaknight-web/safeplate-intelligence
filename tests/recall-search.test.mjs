import test from 'node:test';
import assert from 'node:assert/strict';
import {isActionableRecall,searchRecallRecords,searchTerms} from '../netlify/functions/lib/recall-search.mjs';

const blueberry={id:'blueberry',rawSource:'fda_recall_announcements',title:'Northside recalls blueberry deli salad',product:'Northside Blueberry Deli Salad',company:'Made Fresh Salads',hazard:'Listeria',recallDate:'2026-09-06T00:00:00Z'};
const chicken={id:'chicken',rawSource:'fda_openfda',title:'Chicken recall',product:'Ready-to-eat chicken',hazard:'Listeria',recallDate:'2026-09-05T00:00:00Z'};
const generic={id:'generic',rawSource:'state_agency',title:'Food Safety',category:'agency information'};

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
