
import { getState } from "./lib/store.mjs";
export default async()=>{const s=await getState();return Response.json({meta:s.meta||{},incidents:s.incidents||[],investigations:s.investigations||[],changes:s.changes||[]},{headers:{"cache-control":"no-store"}})};
export const config={path:"/api/incidents"};
