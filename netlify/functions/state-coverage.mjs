import { getState } from "./lib/store.mjs";
export default async()=>{
  const s=await getState(),c=s.stateCoverage||{total:51,checked:0,online:0,degraded:0,lastSync:null,signals:0,states:[]};
  const ageMinutes=c.lastSync?Math.floor((Date.now()-new Date(c.lastSync).getTime())/60000):null;
  return Response.json({...c,ageMinutes,live:Boolean(c.lastSync)&&ageMinutes<=75&&c.checked===51},{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/state-coverage"};
