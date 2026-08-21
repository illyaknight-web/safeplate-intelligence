import { runSurveillance } from "./surveillance.mjs";
import { requireAdmin } from "./lib/auth.mjs";

export default async(req)=>{
 const context=Netlify?.env?.get?.("CONTEXT")||"";
 const branch=Netlify?.env?.get?.("BRANCH")||"";
 const stagingBootstrap=req.method==="GET"&&context==="branch-deploy"&&branch==="safeplate-command-center-staging";

 if(!stagingBootstrap&&req.method!=="POST")return Response.json({error:"POST required"},{status:405});
 if(!stagingBootstrap){
   const auth=requireAdmin(req);if(!auth.ok)return auth.response;
 }
 try{
   const s=await runSurveillance();
   return Response.json({ok:true,lastSync:s.meta.lastSync,count:s.incidents.length,stagingBootstrap});
 }catch(e){
   return Response.json({ok:false,error:String(e.message||e)},{status:500});
 }
};
export const config={path:"/api/manual-sync"};
