import { runNassContext } from './nass-context.mjs';

export default async()=>{ await runNassContext(); };
export const config={schedule:'14,44 * * * *'};
