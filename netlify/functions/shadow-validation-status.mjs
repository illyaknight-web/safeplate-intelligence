import {getState} from './lib/store.mjs';
import {requireAdmin} from './lib/auth.mjs';

export default async req=>{
  const auth=requireAdmin(req);
  if(!auth.ok)return auth.response;
  const state=await getState();
  return Response.json(state.shadowValidation||{
    protocolVersion:'SAFEPLATE-SHADOW-1.0',
    releaseGate:'HOLD_PROSPECTIVE_VALIDATION',
    summary:{open:0,adjudicated:0}
  },{headers:{'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'}});
};
export const config={path:'/api/shadow-validation-status'};
