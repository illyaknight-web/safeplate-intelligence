import test from 'node:test';
import assert from 'node:assert/strict';
import schoolsNearby,{normalizeSchool} from '../netlify/functions/schools-nearby.mjs';

test('normalizes a CCD school without inventing fields',()=>{
  assert.deepEqual(normalizeSchool({ncessch:'360007700001',school_name:'Example School',lea_name:'Example District',street_location:'1 Main St',city_location:'Brooklyn',state_location:'NY',zip_location:'11211',latitude:40.7,longitude:-73.9},2023),{
    ncesId:'360007700001',name:'Example School',district:'Example District',address:'1 Main St, Brooklyn, NY, 11211',city:'Brooklyn',state:'NY',zip:'11211',latitude:40.7,longitude:-73.9,schoolLevel:null,dataYear:2023,source:'U.S. Department of Education NCES EDGE public-school locations',sourceUrl:'https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?Search=1&ID=360007700001'
  });
});

test('rejects invalid ZIP codes before requesting a directory',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=()=>{throw new Error('fetch should not run')};
  try{
    const response=await schoolsNearby(new Request('https://safeplate.test/api/schools-nearby?zip=abc'));
    assert.equal(response.status,400);
    assert.match((await response.json()).error,/five-digit/i);
  }finally{globalThis.fetch=original}
});

test('returns normalized, deduplicated public schools',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({features:[
    {attributes:{NCESSCH:'1',NAME:'P.S. One',CITY:'Brooklyn',STATE:'NY',ZIP:'11211',SCHOOLYEAR:'2022-2023'}},
    {attributes:{NCESSCH:'1',NAME:'P.S. One',CITY:'Brooklyn',STATE:'NY',ZIP:'11211',SCHOOLYEAR:'2022-2023'}}
  ]});
  try{
    const response=await schoolsNearby(new Request('https://safeplate.test/api/schools-nearby?zip=11211'));
    const body=await response.json();
    assert.equal(response.status,200);
    assert.equal(body.count,1);
    assert.equal(body.schools[0].name,'P.S. One');
  }finally{globalThis.fetch=original}
});
