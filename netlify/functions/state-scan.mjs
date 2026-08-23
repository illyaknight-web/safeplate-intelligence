export { runStateScan } from "./state-scan-v2.mjs";
import { runStateScan } from "./state-scan-v2.mjs";

export default async()=>{await runStateScan()};

// Intentionally no schedule here. The 30-minute state-scan-trigger dispatches
// state-scan-background, which has the wall-clock budget required for all 51 jurisdictions.
export const config={};
