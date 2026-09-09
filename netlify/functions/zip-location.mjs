const json=(body,status=200)=>Response.json(body,{status,headers:{"cache-control":"public, max-age=86400, stale-while-revalidate=604800"}});
export default async request=>{
  const zip=new URL(request.url).searchParams.get("zip")?.trim()||"";
  if(!/^\d{5}$/.test(zip))return json({error:"Enter a valid five-digit U.S. ZIP code."},400);
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),6000);
  try{
    const response=await fetch(`https://api.zippopotam.us/us/${zip}`,{signal:controller.signal,headers:{accept:"application/json"}});
    if(response.status===404)return json({error:"That ZIP code was not found."},404);
    if(!response.ok)throw new Error(`ZIP lookup ${response.status}`);
    const data=await response.json(),place=data.places?.[0];
    if(!place?.["state abbreviation"])return json({error:"That ZIP code could not be resolved."},404);
    return json({zip,state:place.state,stateCode:place["state abbreviation"],city:place["place name"]});
  }catch{return json({error:"ZIP lookup is temporarily unavailable. Try again shortly."},503)}
  finally{clearTimeout(timeout)}
};
export const config={path:"/api/zip-location"};
