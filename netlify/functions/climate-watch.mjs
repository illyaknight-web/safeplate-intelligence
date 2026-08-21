
import { getState } from "./lib/store.mjs";
export default async()=>{
 const s=await getState();
 return Response.json(
   s.climateWatch||{status:"PENDING",lastChecked:null,signals:[],note:"Climate watch has not completed a successful surveillance cycle yet."},
   {headers:{"cache-control":"no-store"}}
 );
};
export const config={path:"/api/climate-watch"};
