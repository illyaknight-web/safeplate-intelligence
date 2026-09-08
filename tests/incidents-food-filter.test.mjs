import test from 'node:test';
import assert from 'node:assert/strict';
import {foodRecord} from '../netlify/functions/incidents.mjs';

test('keeps verified food recalls',()=>{
  assert.equal(foodRecord({rawSource:'fda_recall_announcements',title:'Chicken salad recalled for undeclared egg'}),true);
});

test('rejects drug notices mislabeled by a broad FDA recall feed',()=>{
  assert.equal(foodRecord({rawSource:'fda_recall_announcements',category:'Food',title:'Epinephrine Injection USP vial recalled for sterility assurance'}),false);
});
