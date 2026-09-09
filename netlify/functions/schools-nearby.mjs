const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"public, max-age=86400, stale-while-revalidate=604800"}});

const YEARS=[2024,2023,2022,2021];
const text=value=>String(value??'').trim();
const first=(row,names)=>names.map(name=>row?.[name]).find(value=>value!==undefined&&value!==null&&text(value));

export function normalizeSchool(row,year){
  const ncesId=text(first(row,['ncessch','ncessch_num','school_id','nces_school_id']));
  const name=text(first(row,['school_name','school_name_nces','name','sch_name']));
  if(!name)return null;
  const street=text(first(row,['street_location','address_location','street_address','address','location_address']));
  const city=text(first(row,['city_location','city','location_city']));
  const state=text(first(row,['state_location','state_abbr','state','location_state']));
  const zip=text(first(row,['zip_location','zip','location_zip'])).slice(0,5);
  return {
    ncesId:ncesId||null,
    name,
    district:text(first(row,['lea_name','district_name','leaid_name','district']))||null,
    address:[street,city,state,zip].filter(Boolean).join(', '),
    city:city||null,
    state:state||null,
    zip:zip||null,
    latitude:Number(first(row,['latitude','lat']))||null,
    longitude:Number(first(row,['longitude','lon','lng']))||null,
    schoolLevel:text(first(row,['school_level','school_level_name','level']))||null,
    dataYear:year,
    source:'NCES Common Core of Data via Urban Institute Education Data Portal',
    sourceUrl:ncesId?`https://nces.ed.gov/ccd/schoolsearch/school_detail.asp?Search=1&ID=${encodeURIComponent(ncesId)}`:'https://nces.ed.gov/ccd/schoolsearch/'
  };
}

export default async request=>{
  if(request.method!=='GET')return json({error:'Method not allowed.'},405);
  const zip=new URL(request.url).searchParams.get('zip')?.trim()||'';
  if(!/^\d{5}$/.test(zip))return json({error:'Enter a valid five-digit U.S. ZIP code.'},400);
  let lastError='The national school directory is temporarily unavailable.';
  for(const year of YEARS){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9000);
    try{
      const url=`https://educationdata.urban.org/api/v1/schools/ccd/directory/${year}/?zip_location=${encodeURIComponent(zip)}`;
      const response=await fetch(url,{signal:controller.signal,headers:{accept:'application/json','user-agent':'SAFEPLATE school directory/1.0'}});
      if(response.status===404)continue;
      if(!response.ok)throw new Error(`School directory HTTP ${response.status}`);
      const payload=await response.json();
      const rows=(Array.isArray(payload)?payload:payload.results||[]).map(row=>normalizeSchool(row,year)).filter(Boolean);
      const unique=[...new Map(rows.map(s=>[s.ncesId||`${s.name}|${s.address}`,s])).values()].sort((a,b)=>a.name.localeCompare(b.name));
      return json({zip,dataYear:year,count:unique.length,schools:unique.slice(0,75),notice:'Public-school identity and address data. Food alerts are shown separately and require school-specific evidence before confirmation.',source:{name:'U.S. Department of Education Common Core of Data, delivered through the Urban Institute Education Data Portal',url:'https://educationdata.urban.org/documentation/schools.html'}});
    }catch(error){lastError=error?.name==='AbortError'?'The national school directory timed out. Try again shortly.':lastError}
    finally{clearTimeout(timeout)}
  }
  return json({error:lastError,schools:[]},503);
};

export const config={path:'/api/schools-nearby'};
