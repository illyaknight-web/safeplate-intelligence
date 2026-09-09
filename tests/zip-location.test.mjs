import test from 'node:test';
import assert from 'node:assert/strict';
import zipLocation from '../netlify/functions/zip-location.mjs';

test('rejects an invalid ZIP without making an external request',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('fetch should not run')};
  try{
    const response=await zipLocation(new Request('https://safeplate.test/api/zip-location?zip=12'));
    assert.equal(response.status,400);
    assert.match((await response.json()).error,/five-digit/i);
  }finally{globalThis.fetch=original}
});

test('returns only the location fields SAFEPLATE needs',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({places:[{'place name':'Brooklyn',state:'New York','state abbreviation':'NY'}]}),{status:200});
  try{
    const response=await zipLocation(new Request('https://safeplate.test/api/zip-location?zip=11211'));
    assert.equal(response.status,200);
    assert.deepEqual(await response.json(),{zip:'11211',state:'New York',stateCode:'NY',city:'Brooklyn'});
  }finally{globalThis.fetch=original}
});
