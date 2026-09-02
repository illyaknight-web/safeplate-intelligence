import { runCDCRepair } from './cdc-foodborne-repair.mjs';

export default async()=>{ await runCDCRepair(); };
export const config={schedule:'9,39 * * * *'};
