import { getState } from "./lib/store.mjs";

export default async()=>{
  const s=await getState();
  const investigations=(s.investigations||[]).slice().sort((a,b)=>{
    const ar=Number(a.riskScore||0),br=Number(b.riskScore||0);
    if(br!==ar)return br-ar;
    return new Date(b.updatedAt||0)-new Date(a.updatedAt||0);
  });
  return Response.json({
    count:investigations.length,
    lastSync:s.meta?.earlyWarningLastSync||null,
    investigations
  },{headers:{"cache-control":"no-store"}});
};
export const config={path:"/api/investigations"};
