const json=(body,status=200)=>Response.json(body,{status,headers:{'cache-control':'public, max-age=86400, stale-while-revalidate=604800'}});

const EDGE_LAYER='https://services1.arcgis.com/Ua5sjt3LWTPigjyD/arcgis/rest/services/Public_School_Location_201819/FeatureServer/0/query';
const text=value=>String(value??'').trim();
const first=(row,names)=>names.map(name=>row?.[name]).find(value=>value!==undefined&&value!==null&&text(value));

export function normalizeSchool(row,year){
  const ncesId=text(first(row,['ncessch','NCESSCH','ncessch_num','school_id','nces_school_id']));
  const name=text(first(row,['school_name','school_name_nces','name','NAME','sch_name']));
  if(!name)return null;
  const street=text(first(row,['street_location','address_location','street_address','address','STREET','location_address']));
  const city=text(first(row,['city_location','city','CITY','location_city']));
  const state=text(first(row,['state_location','state_abbr','state','STATE','location_state']));
  const zip=text(first(row,['zip_location','zip','ZIP','location_zip'])).slice(0,5);
  return {
    ncesId:ncesId||null,
    name,
    district:text(first(row,['lea_name','district_name','leaid_name','district']))||null,
    address:[street,city,state,zip].filter(Boolean).join(', '),
    city:city||null,
    state:state||null,
    zip:zip||null,
    latitude:Number(first(row,['latitude','lat','LAT']))||null,
    longitude:Number(first(row,['longitude','lon','lng','LON']))||null,
    schoolLevel:text(first(row,['school_level','school_level_name','level']))||null,
    dataYear:year,
    source:'U.S. Department of Education NCES EDGE public-school locations',
    sourceUrl:ncesId?`https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?Search=1&ID=${encodeURIComponent(ncesId)}`:'https://nces.ed.gov/ccd/schoolsearch/'
  };
}

export default async request=>{
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  const zip=new URL(request.url).searchParams.get('zip')?.trim()||'';
  if(!/^\d{5}$/.test(zip))return json({error:'Enter a valid five-digit U.S. ZIP code.'},400);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),7000);
  try{
    const params=new URLSearchParams({where:`ZIP='${zip}'`,outFields:'NCESSCH,LEAID,NAME,STREET,CITY,STATE,ZIP,LAT,LON,SCHOOLYEAR',returnGeometry:'false',orderByFields:'NAME',resultRecordCount:'75',f:'json'});
    const response=await fetch(`${EDGE_LAYER}?${params}`,{signal:controller.signal,headers:{accept:'application/json','user-agent':'SAFEPLATE school directory/1.1'}});
    if(!response.ok)throw new Error(`School directory HTTP ${response.status}`);
    const payload=await response.json();
    if(payload.error)throw new Error(payload.error.message||'School directory query failed');
    const raw=(payload.features||[]).map(feature=>feature.attributes||{}),year=text(raw[0]?.SCHOOLYEAR)||'2022 2023';
    const rows=raw.map(row=>normalizeSchool(row,year)).filter(Boolean);
    const unique=[...new Map(rows.map(s=>[s.ncesId||`${s.name}|${s.address}`,s])).values()].sort((a,b)=>a.name.localeCompare(b.name));
    return json({zip,dataYear:year,count:unique.length,schools:unique.slice(0,75),notice:'Public-school identity and address data. Food alerts are shown separately and require school-specific evidence before confirmation.',source:{name:'U.S. Department of Education NCES EDGE Public School Locations',url:'https://nces.ed.gov/programs/edge/Geographic/SchoolLocations'}});
  }catch(error){return json({error:error?.name==='AbortError'?'The national school directory timed out. Try again shortly.':'The national school directory is temporarily unavailable.',schools:[]},503)}
  finally{clearTimeout(timeout)}
};

export const config={path:'/api/schools-nearby'};
