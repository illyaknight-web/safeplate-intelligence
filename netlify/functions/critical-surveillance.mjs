import { runSurveillance } from './surveillance.mjs';
export default async()=>{await runSurveillance({sourceIds:['fda_openfda','fda_recall_announcements','fda_outbreaks','usda_fsis'],cycleType:'critical'})};
export const config={schedule:'7,22,37,52 * * * *'};
