import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDistribution,productIdentity,enrichRecord,materialChanges,linkRelatedRecords,buildReviewQueue } from '../netlify/functions/lib/intelligence.mjs';

test('normalizes state names, abbreviations, nationwide language and ZIP evidence',()=>{
 const d=normalizeDistribution({distribution:'Nationwide, including New York, NJ and ZIP 11211'});
 assert.equal(d.nationwide,true);assert.equal(d.precision,'zip');assert.ok(d.states.includes('NY'));assert.ok(d.states.includes('NJ'));assert.deepEqual(d.zips,['11211']);
});

test('creates the same strong product identity across official records',()=>{
 const a=productIdentity({product:'Example Salad',company:'Example Foods',upc:'012345678905'}),b=productIdentity({title:'Different agency wording',company:'Other listing',identifiers:['012345678905']});
 assert.equal(a.strength,'product-code');assert.equal(a.canonicalProductId,b.canonicalProductId);
 const linked=linkRelatedRecords([{id:'a',...enrichRecord({product:'Example Salad',company:'Example Foods',upc:'012345678905'})},{id:'b',...enrichRecord({title:'Different agency wording',company:'Other listing',identifiers:['012345678905']})}]);
 assert.deepEqual(linked[0].relatedOfficialRecords,['b']);assert.deepEqual(linked[1].relatedOfficialRecords,['a']);
});

test('records material distribution expansions without treating observation metadata as a change',()=>{
 const changes=materialChanges({states:['NY'],lastObservedAt:'old'},{states:['NY','NJ'],lastObservedAt:'new'});
 assert.deepEqual(changes.map(x=>x.field),['states']);
});

test('routes incomplete active records to review while preserving reasons',()=>{
 const [item]=buildReviewQueue([enrichRecord({id:'r1',title:'Unresolved warning',status:'VERIFIED'})]);
 assert.ok(item.reasons.includes('distribution_unresolved'));assert.ok(item.reasons.includes('product_identity_insufficient'));assert.ok(item.reasons.includes('official_link_missing'));
});
