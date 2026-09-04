import { monitor } from './feed-monitor.mjs';

export default async()=>{await monitor()};

export const config={schedule:'7,37 * * * *'};
