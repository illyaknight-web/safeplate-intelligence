import { getState } from "./lib/store.mjs";

export default async()=>{
 const state=await getState(),items=(state.incidents||[]).filter(x=>x?.institutionalOnly===true).sort((a,b)=>new Date(b.lastObservedAt||b.updatedAt||0)-new Date(a.lastObservedAt||a.updatedAt||0)).slice(0,200);
 return Response.json({generatedAt:new Date().toISOString(),lastSync:state.meta?.operationalFoodSourcesLastSync||null,notice:"Institutional context only. Import controls, genomic signals, and municipal inspections are not product recalls unless a competent authority separately publishes a recall.",items},{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/operational-context"};
