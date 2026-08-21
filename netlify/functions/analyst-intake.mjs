
import { getState,saveState } from "./lib/store.mjs";
import { requireAdmin } from "./lib/auth.mjs";

const TYPES=new Set(["AGENCY","SUPPLIER","HUMAN","AI","CONTRADICTION","EMERGING"]);
const clean=(v,max=2000)=>String(v||"").trim().slice(0,max);

export default async(req)=>{
 if(req.method!=="POST")return Response.json({error:"POST required"},{status:405});
 const auth=requireAdmin(req);if(!auth.ok)return auth.response;

 let body;
 try{body=await req.json()}catch{return Response.json({error:"Invalid JSON"},{status:400})}

 const title=clean(body.title,180);
 if(!title)return Response.json({error:"Title is required"},{status:400});

 const sourceType=TYPES.has(String(body.sourceType||"").toUpperCase())?String(body.sourceType).toUpperCase():"HUMAN";
 let sourceUrl=clean(body.sourceUrl,1000);
 if(sourceUrl){
   try{const u=new URL(sourceUrl);if(!["http:","https:"].includes(u.protocol))throw new Error()}catch{
     return Response.json({error:"Source URL must be http/https"},{status:400});
   }
 }

 const now=new Date().toISOString(),id=`SP-INTAKE-${Date.now()}`;
 const incident={
   id,title,product:clean(body.product,300),company:"",hazard:"Under review",
   severity:"EMERGING",status:"DETECTED",category:"Under review",
   states:[],lat:null,lng:null,source:"Analyst intake",updatedAt:now,lastObservedAt:now,
   summary:clean(body.notes,4000),lots:[],workflowStep:0,
   evidence:[{type:sourceType,status:"DETECTED",source:"Analyst intake",text:clean(body.notes,4000),url:sourceUrl}],
   entities:[{id:`incident-${id}`,type:"Incident",name:title}],links:[]
 };
 const s=await getState();
 s.incidents=[incident,...(s.incidents||[])].slice(0,1200);
 s.changes=[{time:now,title:"Analyst signal created",detail:`${id} entered as DETECTED — not verified.`},...(s.changes||[])].slice(0,250);
 await saveState(s);
 return Response.json({ok:true,id,status:"DETECTED"});
};
export const config={path:"/api/analyst-intake"};
