import { runVeriscopeBridge } from './lib/veriscope-bridge.mjs';

export default async()=>Response.json(await runVeriscopeBridge(),{headers:{'Cache-Control':'no-store'}});
export const config={schedule:'*/15 * * * *'};
