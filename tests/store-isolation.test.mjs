import test from 'node:test';
import assert from 'node:assert/strict';
import {stateStoreName} from '../netlify/functions/lib/store.mjs';

function withEnv(values,fn){
  const keys=['CONTEXT','BRANCH','SAFEPLATE_STORE_NAMESPACE'];
  const prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  for(const key of keys){
    if(values[key]===undefined)delete process.env[key];
    else process.env[key]=values[key];
  }
  try{return fn()}finally{
    for(const key of keys){
      if(prior[key]===undefined)delete process.env[key];
      else process.env[key]=prior[key];
    }
  }
}

test('production keeps the established state store',()=>withEnv({CONTEXT:'production'},()=>{
  assert.equal(stateStoreName(),'safeplate-live-v34');
}));

test('shadow branch uses a store isolated from production',()=>withEnv({CONTEXT:'deploy-preview',BRANCH:'safeplate-early-detection-v1'},()=>{
  assert.equal(stateStoreName(),'safeplate-live-v34-safeplate-early-detection-v1');
  assert.notEqual(stateStoreName(),'safeplate-live-v34');
}));

test('an explicit staging namespace takes priority',()=>withEnv({CONTEXT:'production',SAFEPLATE_STORE_NAMESPACE:'shadow-staging'},()=>{
  assert.equal(stateStoreName(),'safeplate-live-v34-shadow-staging');
}));
