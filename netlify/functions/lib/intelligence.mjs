import { fingerprint } from './normalize.mjs';

export const US_STATES={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',DC:'District of Columbia'};
const NAMES=Object.fromEntries(Object.entries(US_STATES).map(([code,name])=>[name.toLowerCase(),code]));
const array=v=>Array.isArray(v)?v:[],clean=v=>String(v||'').replace(/\s+/g,' ').trim();
const stateCode=v=>{const s=clean(v);return US_STATES[s.toUpperCase()]?s.toUpperCase():NAMES[s.toLowerCase()]||null};

export function normalizeDistribution(record={}){
  const text=clean([record.distribution,record.summary,...array(record.evidence).filter(e=>/distribution|location/i.test(`${e?.type||''} ${e?.source||''}`)).map(e=>e?.text)].filter(Boolean).join(' '));
  const states=new Set([...array(record.states),...array(record.distributionStates),...array(record.affectedStates),...array(record.locations).map(v=>typeof v==='string'?v:v?.state)].map(stateCode).filter(Boolean));
  const nationwide=/\b(nationwide|all (?:50 )?states|throughout the united states|across the united states|u\.?s\.? nationwide)\b/i.test(text);
  for(const [name,code] of Object.entries(NAMES))if(new RegExp(`\\b${name.replace(/ /g,'\\s+')}\\b`,'i').test(text))states.add(code);
  for(const code of Object.keys(US_STATES))if(new RegExp(`(?:^|[\\s,;/()])${code}(?=$|[\\s,;/().])`,'i').test(text))states.add(code);
  if(nationwide)for(const code of Object.keys(US_STATES))if(code!=='DC')states.add(code);
  const zips=[...new Set([...text.matchAll(/\b\d{5}(?:-\d{4})?\b/g)].map(m=>m[0]))];
  return {states:[...states].sort(),nationwide,zips,raw:text||null,precision:zips.length?'zip':states.size?'state':nationwide?'national':'unresolved'};
}

function ids(record){
  const text=clean([record.upc,record.gtin,...array(record.identifiers),record.product,record.title,record.summary].filter(Boolean).join(' '));
  const values=[...array(record.identifiers),record.upc,record.gtin,...[...text.matchAll(/\b(?:UPC|GTIN)\s*[:#-]?\s*([0-9][0-9\s-]{7,17})\b/gi)].map(m=>m[1])].map(v=>String(v||'').replace(/\D/g,'')).filter(v=>v.length>=8&&v.length<=14);
  return [...new Set(values)];
}
function lots(record){const text=clean([record.lot,record.lotNumber,record.batch,record.code,...array(record.lots),record.product,record.summary].filter(Boolean).join(' '));return [...new Set([...array(record.lots).map(clean),...[...text.matchAll(/\b(?:lot|batch)\s*(?:no\.?|number|#|:|-)?\s*([A-Z0-9][A-Z0-9._/-]{2,30})\b/gi)].map(m=>m[1])].filter(Boolean))]}
const productName=record=>clean(record.product||record.product_description||record.title||'').toLowerCase().replace(/\b(?:net wt|net weight|keep refrigerated|distributed by|manufactured by)\b.*$/i,'').replace(/[^a-z0-9]+/g,' ').trim().slice(0,180);
const companyName=record=>clean(record.company||record.recallingFirm||record.recalling_firm||record.brand||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().slice(0,120);

export function productIdentity(record={}){
  const identifiers=ids(record),lotNumbers=lots(record),product=productName(record),company=companyName(record);
  const strength=identifiers.length&&lotNumbers.length?'exact-package':identifiers.length?'product-code':product&&company?'named-product':'insufficient';
  const key=strength==='exact-package'?['package',identifiers.sort().join(','),lotNumbers.sort().join(',')]:strength==='product-code'?['code',identifiers.sort().join(',')]:strength==='named-product'?['named',company,product]:['record',record.rawSource,record.id];
  return {canonicalProductId:`SPP-${fingerprint(key)}`,strength,product,company,identifiers,lotNumbers};
}

export function enrichRecord(record={}){const distribution=normalizeDistribution(record),identity=productIdentity(record);return {...record,states:distribution.states,distributionNormalized:distribution,productIdentity:identity,canonicalProductId:identity.canonicalProductId,identifiers:identity.identifiers,lots:identity.lotNumbers,upc:record.upc||identity.identifiers[0]||null,gtin:record.gtin||identity.identifiers.find(v=>v.length===14)||null}}

export function linkRelatedRecords(records=[]){const groups=new Map();for(const x of records){if(x.productIdentity?.strength==='insufficient')continue;const a=groups.get(x.canonicalProductId)||[];a.push(x.id);groups.set(x.canonicalProductId,a)}return records.map(x=>{const related=(groups.get(x.canonicalProductId)||[]).filter(id=>id!==x.id);return {...x,relatedOfficialRecords:related}})}

const TRACKED=['status','severity','hazard','product','company','distribution','states','identifiers','lots','imageUrl','sourceUrl'];
export function materialChanges(before={},after={}){const changes=[];for(const field of TRACKED){const a=JSON.stringify(before[field]??null),b=JSON.stringify(after[field]??null);if(a!==b)changes.push({field,before:before[field]??null,after:after[field]??null})}return changes}

export function buildReviewQueue(records=[]){
  const rank={high:3,medium:2,normal:1};
  return records.filter(x=>!['RESOLVED','RETRACTED'].includes(String(x.status||'').toUpperCase())).flatMap(x=>{
    const reasons=[];
    if(x.distributionNormalized?.precision==='unresolved')reasons.push('distribution_unresolved');
    if(x.productIdentity?.strength==='insufficient')reasons.push('product_identity_insufficient');
    if(!x.imageUrl&&!array(x.images).length)reasons.push('official_image_missing');
    if(!x.sourceUrl&&!array(x.evidence).some(e=>/^https?:\/\//i.test(String(e?.url||''))))reasons.push('official_link_missing');
    return reasons.length?[{id:x.id,title:x.product||x.title||'Food record',source:x.source||x.rawSource,status:x.status,reasons,priority:reasons.includes('official_link_missing')?'high':reasons.length>=3?'medium':'normal',lastObservedAt:x.lastObservedAt||x.updatedAt||null}]:[];
  }).sort((a,b)=>rank[b.priority]-rank[a.priority]);
}
