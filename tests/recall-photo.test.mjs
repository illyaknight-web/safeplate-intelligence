import test from 'node:test';
import assert from 'node:assert/strict';
import recallPhoto from '../netlify/functions/recall-photo.mjs';

const source='https://www.fda.gov/safety/recalls-market-withdrawals-safety-alerts/example-recall';

test('rejects a package image outside the official FDA file host',async()=>{
  const request=new Request(`https://safeplate.test/api/recall-photo?source=${encodeURIComponent(source)}&image=${encodeURIComponent('https://example.com/package.png')}`);
  const response=await recallPhoto(request);
  assert.equal(response.status,403);
});

test('proxies an official FDA package image without re-scraping the recall page',async()=>{
  const original=globalThis.fetch,calls=[];
  globalThis.fetch=async(url,options)=>{calls.push({url:String(url),options});return new Response(new Uint8Array([137,80,78,71]),{status:200,headers:{'content-type':'image/png'}})};
  try{
    const image='https://www.fda.gov/files/styles/recall_image_small/public/package.png?itok=verified';
    const request=new Request(`https://safeplate.test/api/recall-photo?source=${encodeURIComponent(source)}&image=${encodeURIComponent(image)}`);
    const response=await recallPhoto(request);
    assert.equal(response.status,200);
    assert.equal(response.headers.get('content-type'),'image/png');
    assert.equal(calls.length,1);
    assert.equal(calls[0].url,image);
    assert.equal(calls[0].options.headers.Referer,source);
  }finally{globalThis.fetch=original}
});
