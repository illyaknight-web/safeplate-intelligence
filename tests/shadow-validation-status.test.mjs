import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/shadow-validation-status.mjs';

test('shadow validation status fails closed without an admin token',async()=>{
  const prior=process.env.SAFEPLATE_ADMIN_TOKEN;
  delete process.env.SAFEPLATE_ADMIN_TOKEN;
  try{
    const response=await handler(new Request('https://safeplate.test/api/shadow-validation-status'));
    assert.equal(response.status,503);
  }finally{
    if(prior===undefined)delete process.env.SAFEPLATE_ADMIN_TOKEN;
    else process.env.SAFEPLATE_ADMIN_TOKEN=prior;
  }
});

test('shadow validation status rejects an incorrect admin token',async()=>{
  const prior=process.env.SAFEPLATE_ADMIN_TOKEN;
  process.env.SAFEPLATE_ADMIN_TOKEN='expected-secret';
  try{
    const response=await handler(new Request('https://safeplate.test/api/shadow-validation-status',{
      headers:{'x-safeplate-admin-token':'wrong-secret'}
    }));
    assert.equal(response.status,401);
  }finally{
    if(prior===undefined)delete process.env.SAFEPLATE_ADMIN_TOKEN;
    else process.env.SAFEPLATE_ADMIN_TOKEN=prior;
  }
});
