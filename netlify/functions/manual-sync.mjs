import { runSurveillance } from "./surveillance.mjs";
import { requireAdmin } from "./lib/auth.mjs";

const STAGING_HOST = "safeplate-command-center-staging--safeplate-intelligence.netlify.app";

export default async(req)=>{
 const url = new URL(req.url);
 const stagingBootstrap = req.method === "GET" && url.hostname === STAGING_HOST;

 if(!stagingBootstrap && req.method !== "POST"){
   return Response.json({error:"POST required"},{status:405});
 }

 if(!stagingBootstrap){
   const auth=requireAdmin(req);
   if(!auth.ok)return auth.response;
 }

 try{
   const s=await runSurveillance();
   return Response.json({
     ok:true,
     lastSync:s.meta.lastSync,
     count:s.incidents.length,
     stagingBootstrap
   });
 }catch(e){
   return Response.json({ok:false,error:String(e.message||e)},{status:500});
 }
};

export const config={path:"/api/manual-sync"};
