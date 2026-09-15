import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/shadow-cycle.mjs';

test('shadow cycle fails closed without an admin token',async()=>{
  const prior=process.env.SAFEPLATE_ADMIN_TOKEN;
  delete process.env.SAFEPLATE_ADMIN_TOKEN;
  try{
    const response=await handler(new Request('https://safeplate.test/api/shadow-cycle',{method:'POST'}));
    assert.equal(response.status,503);
  }finally{
    if(prior===undefined)delete process.env.SAFEPLATE_ADMIN_TOKEN;
    else process.env.SAFEPLATE_ADMIN_TOKEN=prior;
  }
});

test('shadow cycle rejects non-POST requests before running surveillance',async()=>{
  const prior=process.env.SAFEPLATE_ADMIN_TOKEN;
  process.env.SAFEPLATE_ADMIN_TOKEN='expected-secret';
  try{
    const response=await handler(new Request('https://safeplate.test/api/shadow-cycle',{
      headers:{'x-safeplate-admin-token':'expected-secret'}
    }));
    assert.equal(response.status,405);
    assert.equal(response.headers.get('allow'),'POST');
  }finally{
    if(prior===undefined)delete process.env.SAFEPLATE_ADMIN_TOKEN;
    else process.env.SAFEPLATE_ADMIN_TOKEN=prior;
  }
});
