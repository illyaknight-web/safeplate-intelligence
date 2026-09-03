import { runOperationalFoodSources } from "./operational-food-sources.mjs";
export default async()=>{await runOperationalFoodSources()};
export const config={schedule:"19,49 * * * *"};
