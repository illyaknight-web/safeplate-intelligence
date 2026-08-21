import { runSurveillance } from "./surveillance.mjs";
import { requireAdmin } from "./lib/auth.mjs";

export default async(req)=>{
 if(req.method !== "POST"){
   return Response.json({error:"POST required"},{status:405});
 }

 const auth=requireAdmin(req);
 if(!auth.ok)return auth.response;

 try{
   const s=await runSurveillance();
   return Response.json({
     ok:true,
     lastSync:s.meta.lastSync,
     count:s.incidents.length
   });
 }catch(e){
   return Response.json({ok:false,error:String(e.message||e)},{status:500});
 }
};

export const config={path:"/api/manual-sync"};
