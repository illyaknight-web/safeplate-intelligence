import { requireAdmin } from "./lib/auth.mjs";

export default async(req)=>{
 const auth=requireAdmin(req);if(!auth.ok)return auth.response;
 const token=globalThis.Netlify?.env?.get?.("NOAA_CDO_TOKEN")||process.env.NOAA_CDO_TOKEN||"";
 if(!token)return Response.json({enabled:false,status:"OPTIONAL_KEY_MISSING",note:"Add a free NOAA_CDO_TOKEN in Netlify to enable station-level climate data."});
 const url=new URL(req.url);
 const datasetid=url.searchParams.get("datasetid")||"GHCND";
 const locationid=url.searchParams.get("locationid")||"FIPS:US";
 const startdate=url.searchParams.get("startdate");
 const enddate=url.searchParams.get("enddate");
 if(!startdate||!enddate)return Response.json({error:"startdate and enddate are required"},{status:400});
 const q=new URL("https://www.ncei.noaa.gov/cdo-web/api/v2/data");
 q.searchParams.set("datasetid",datasetid);q.searchParams.set("locationid",locationid);
 q.searchParams.set("startdate",startdate);q.searchParams.set("enddate",enddate);q.searchParams.set("limit","1000");
 let r;
 try{
  r=await fetch(q,{headers:{token,"user-agent":"SAFEPLATE/0.35.7"},signal:AbortSignal.timeout(8000)});
 }catch(error){
  return Response.json({enabled:true,live:false,status:"UPSTREAM_UNAVAILABLE",error:error?.name==="TimeoutError"?"NOAA CDO request timed out":"NOAA CDO request failed"},{status:502,headers:{"cache-control":"no-store"}});
 }
 if(!r.ok)return Response.json({error:`NOAA CDO ${r.status}`},{status:502});
 return new Response(await r.text(),{headers:{"content-type":"application/json","cache-control":"no-store"}});
};
export const config={path:"/api/noaa-cdo"};
