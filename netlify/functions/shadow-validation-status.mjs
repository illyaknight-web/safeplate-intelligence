import {getState} from './lib/store.mjs';
export default async()=>{const state=await getState();return Response.json(state.shadowValidation||{protocolVersion:'SAFEPLATE-SHADOW-1.0',releaseGate:'HOLD_PROSPECTIVE_VALIDATION',summary:{open:0,adjudicated:0}},{headers:{'cache-control':'private, no-store','x-robots-tag':'noindex, nofollow'}})};
export const config={path:'/api/shadow-validation-status'};
